import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdmin } from "@/lib/admin-notify";
import { SITE_URL } from "@/lib/site-url";

export const runtime = "nodejs";

// Webhook Stripe : marque l'acompte payé dès que Stripe confirme le paiement,
// même si le client ferme son navigateur avant d'être redirigé.
// Montant net réellement encaissé : amount_total moins les frais Stripe.
// Les frais viennent de la balance transaction du paiement ; si Stripe ne
// les a pas encore calculés au moment du webhook, on retombe sur une
// estimation standard (carte européenne : 1,5 % + 0,25 €).
async function netEncaisse(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<number> {
  const gross = session.amount_total ?? 0;
  try {
    const pi = await stripe.paymentIntents.retrieve(
      session.payment_intent as string,
      { expand: ["latest_charge.balance_transaction"] }
    );
    const charge = pi.latest_charge as Stripe.Charge | null | undefined;
    const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
    if (bt && typeof bt.fee === "number" && bt.status !== "pending") {
      return gross - bt.fee;
    }
    console.warn(
      `[stripe-webhook] Frais Stripe pas encore disponibles pour ${session.id} — estimation appliquée.`
    );
  } catch (err) {
    console.warn(
      "[stripe-webhook] Récupération des frais impossible :",
      err instanceof Error ? err.message : err
    );
  }
  const estimation = Math.round(gross * 0.015 + 25);
  return gross - estimation;
}

// Événement attendu : checkout.session.completed
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe non configuré." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    console.error("[stripe-webhook] Signature invalide:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const quoteId = session.metadata?.quote_id;
    if (session.payment_status === "paid" && quoteId) {
      const supabase = createAdminClient();

      // Échéance d'un échéancier (paiement en plusieurs fois).
      if (session.metadata?.payment_type === "echeance") {
        const numero = parseInt(session.metadata.payment_numero ?? "0", 10);
        if (numero > 0) {
          const { error, count } = await supabase
            .from("payment_schedule")
            .update({ status: "payee", paid_at: new Date().toISOString() }, { count: "exact" })
            .eq("quote_id", quoteId)
            .eq("numero", numero)
            .eq("status", "a_payer");
          if (error) {
            console.error(
              `[stripe-webhook] Échéance ${numero} du devis ${quoteId}: ERREUR ${error.message}`
            );
          } else if ((count ?? 0) === 0) {
            // Argent encaissé mais aucune échéance correspondante : échéancier
            // annulé entre-temps, ou déjà marquée payée. Alerte pour action manuelle.
            console.warn(
              `[stripe-webhook] ⚠️ Échéance ${numero} du devis ${quoteId} payée (${session.amount_total ?? "?"} centimes) mais 0 ligne mise à jour — vérifier dans Stripe et rattraper manuellement si besoin.`
            );
          } else {
            console.log(
              `[stripe-webhook] Échéance ${numero} du devis ${quoteId}: marquée payée ✓`
            );
            // Mémorise le NET encaissé (frais Stripe déduits) pour l'URSSAF :
            // marqueur [[echeance-net:numero:centimes]] dans les notes du devis.
            const net = await netEncaisse(stripe, session);
            const { data: qrow } = await supabase
              .from("quotes")
              .select("notes")
              .eq("id", quoteId)
              .single();
            let qnotes = String(qrow?.notes ?? "");
            qnotes = qnotes.replace(
              new RegExp(`\\[\\[echeance-net:${numero}:\\d+\\]\\]\\s*`, "g"),
              ""
            );
            qnotes = `[[echeance-net:${numero}:${net}]]\n${qnotes}`;
            await supabase.from("quotes").update({ notes: qnotes }).eq("id", quoteId);
            // Cohérence devis : la 1ʳᵉ échéance couvre l'acompte. Jamais sur un
            // devis refusé/annulé (on n'écrase pas un statut de refus).
            if (numero === 1) {
              const { data: quote } = await supabase
                .from("quotes")
                .select("acompte_paid_at, status")
                .eq("id", quoteId)
                .single();
              if (
                quote &&
                !quote.acompte_paid_at &&
                !["refuse", "annule"].includes(quote.status ?? "")
              ) {
                await supabase
                  .from("quotes")
                  .update({ acompte_paid_at: new Date().toISOString(), status: "confirme" })
                  .eq("id", quoteId);
                console.log(`[stripe-webhook] Acompte (échéance 1) confirmé pour ${quoteId}`);
                void notifyAdminAcompte(supabase, quoteId);
              }
            }
          }
        }
        return NextResponse.json({ received: true });
      }

      // Acompte classique.
      const { data: quote } = await supabase
        .from("quotes")
        .select("acompte_paid_at, status, notes")
        .eq("id", quoteId)
        .single();
      // Idempotent : ne met à jour que si pas déjà réglé.
      if (quote && !quote.acompte_paid_at) {
        // Pose le marqueur du MONTANT RÉEL de l'acompte (utilisé pour le
        // calcul du solde et la déclaration URSSAF du mois de réception).
        // Ne s'applique qu'aux devis sans échéancier : pour un échéancier,
        // l'acompte est suivi échéance par échéance (branche au-dessus).
        // [[acompte:]] = brut payé par le client (cohérent avec le devis) ;
        // [[acompte-net:]] = net encaissé après frais Stripe (base URSSAF).
        let notes = String(quote.notes ?? "");
        if (!/\[\[acompte:\d+\]\]/.test(notes)) {
          notes = `[[acompte:${session.amount_total ?? 0}]]\n${notes}`;
        }
        const net = await netEncaisse(stripe, session);
        if (!/\[\[acompte-net:\d+\]\]/.test(notes)) {
          notes = `[[acompte-net:${net}]]\n${notes}`;
        }
        await supabase
          .from("quotes")
          .update({
            acompte_paid_at: new Date().toISOString(),
            status: "confirme",
            notes,
          })
          .eq("id", quoteId);
        console.log(`[stripe-webhook] Acompte enregistré pour le devis ${quoteId}`);
        void notifyAdminAcompte(supabase, quoteId);
      }
    }
  }

  return NextResponse.json({ received: true });
}

// Notification admin : acompte réglé (push + e-mail) avec les infos du devis.
async function notifyAdminAcompte(
  supabase: ReturnType<typeof createAdminClient>,
  quoteId: string
) {
  try {
    const { data: quote } = await supabase
      .from("quotes")
      .select("customer_name, total_cents, event_date")
      .eq("id", quoteId)
      .single();
    const name = quote?.customer_name ?? "Le client";
    const total = quote?.total_cents ? (quote.total_cents / 100).toFixed(2).replace(".", ",") + " €" : "?";
    const dateFr = quote?.event_date ?? "date ?";
    await notifyAdmin({
      title: "💰 Acompte réglé — devis confirmé !",
      body: `${name} — ${dateFr} : acompte reçu (total ${total}). La date est verrouillée.`,
      url: `/admin/devis?focus=${quoteId}`,
      email: {
        subject: `💰 Acompte reçu — ${name} (${dateFr}) — devis confirmé`,
        html: `<p><strong>${name}</strong> (soirée du <strong>${dateFr}</strong>, total <strong>${total}</strong>) vient de régler son <strong>acompte</strong> via Stripe.</p><p>✅ Le devis est désormais <strong>confirmé</strong> : la date est verrouillée.</p><p><a href="${SITE_URL}/admin/devis?focus=${quoteId}">Ouvrir le devis dans l'admin</a></p>`,
      },
    });
  } catch {
    // best effort
  }
}

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Webhook Stripe : marque l'acompte payé dès que Stripe confirme le paiement,
// même si le client ferme son navigateur avant d'être redirigé.
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
      const { data: quote } = await supabase
        .from("quotes")
        .select("acompte_paid_at, status")
        .eq("id", quoteId)
        .single();
      // Idempotent : ne met à jour que si pas déjà réglé.
      if (quote && !quote.acompte_paid_at) {
        await supabase
          .from("quotes")
          .update({ acompte_paid_at: new Date().toISOString(), status: "confirme" })
          .eq("id", quoteId);
        console.log(`[stripe-webhook] Acompte enregistré pour le devis ${quoteId}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}

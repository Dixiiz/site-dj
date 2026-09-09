import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site-url";

export const runtime = "nodejs";

// Lien de paiement d'une échéance : crée une session Stripe Checkout
// à la volée et redirige le client. Si l'échéance est déjà payée,
// renvoie vers l'espace client.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string; numero: string }> }
) {
  const stripe = getStripe();
  if (!stripe) return new Response("Stripe non configuré.", { status: 503 });

  const { quoteId, numero: numeroRaw } = await params;
  const numero = parseInt(numeroRaw, 10);
  if (!quoteId || !Number.isFinite(numero)) {
    return new Response("Lien invalide.", { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("payment_schedule")
    .select("id, numero, total, amount_cents, status, quote_id")
    .eq("quote_id", quoteId)
    .eq("numero", numero)
    .maybeSingle();
  if (!row) return new Response("Échéance introuvable.", { status: 404 });

  if (row.status === "payee") {
    redirect(`${SITE_URL}/mon-espace/devis/${quoteId}?paiement=deja#paiement`);
  }

  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_email, customer_name")
    .eq("id", quoteId)
    .maybeSingle();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: quote?.customer_email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: row.amount_cents,
          product_data: {
            name: `Échéance ${row.numero}/${row.total} — Propul'Sound DJ`,
          },
        },
      },
    ],
    metadata: {
      quote_id: quoteId,
      payment_type: "echeance",
      payment_numero: String(row.numero),
    },
    success_url: `${SITE_URL}/mon-espace/devis/${quoteId}?paiement=success&session_id={CHECKOUT_SESSION_ID}#paiement`,
    cancel_url: `${SITE_URL}/mon-espace/devis/${quoteId}#paiement`,
  });

  if (!session.url) return new Response("Erreur Stripe.", { status: 500 });
  redirect(session.url);
}
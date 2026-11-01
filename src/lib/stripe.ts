// Client Stripe (paiement de l'acompte via Stripe Checkout).
// La clé secrète vit dans STRIPE_SECRET_KEY (.env.local / variables Vercel).
import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

// Montant de l'acompte (20 % du total, arrondi au multiple de 10 € inférieur
// pour le solde — même calcul que l'espace client).
export function acompteCents(totalCents: number): number {
  const total = totalCents / 100;
  const solde = Math.floor((total * 0.8) / 10) * 10;
  return Math.round((total - solde) * 100);
}

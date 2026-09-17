// Rattrapage URSSAF : recalcule le NET (frais Stripe déduits) des paiements
// Stripe reçus avant la mise en place du webhook enrichi, et pose les
// marqueurs [[acompte-net:]] / [[echeance-net:n°:net]] dans les notes.
// Sans marqueur, le dashboard compte le montant complet — ce script ne
// touche donc QUE les paiements passés par Stripe.
// Usage : node scripts/backfill-frais-stripe.mjs
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) =>
  env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));
const stripe = new Stripe(get("STRIPE_SECRET_KEY"));

const fraisEstimes = (gross) => Math.round(gross * 0.015 + 25);

// Récupère les sessions checkout complétées, 100 par 100.
let startingAfter;
let traite = 0;
for (;;) {
  const sessions = await stripe.checkout.sessions.list({ limit: 100, starting_after: startingAfter });
  for (const s of sessions.data) {
    if (s.payment_status !== "paid" || !s.metadata?.quote_id || !s.amount_total) continue;
    const quoteId = s.metadata.quote_id;
    const estEcheance = s.metadata.payment_type === "echeance";
    const numero = parseInt(s.metadata.payment_numero ?? "0", 10);

    // Frais réels de la transaction.
    let net = s.amount_total - fraisEstimes(s.amount_total);
    try {
      const pi = await stripe.paymentIntents.retrieve(s.payment_intent, {
        expand: ["latest_charge.balance_transaction"],
      });
      const bt = pi.latest_charge?.balance_transaction;
      if (bt && typeof bt.fee === "number" && bt.status !== "pending") {
        net = s.amount_total - bt.fee;
      }
    } catch {
      console.warn(`Frais indisponibles pour ${s.id} — estimation appliquée`);
    }

    const { data: q } = await supabase
      .from("quotes")
      .select("notes, acompte_paid_at")
      .eq("id", quoteId)
      .single();
    if (!q) continue;
    let notes = String(q.notes ?? "");
    const avant = notes;

    if (estEcheance && numero > 0) {
      notes = notes.replace(new RegExp(`\\[\\[echeance-net:${numero}:\\d+\\]\\]\\s*`, "g"), "");
      notes = `[[echeance-net:${numero}:${net}]]\n${notes}`;
    } else if (!estEcheance && q.acompte_paid_at) {
      if (!/\[\[acompte:\d+\]\]/.test(notes)) {
        notes = `[[acompte:${s.amount_total}]]\n${notes}`;
      }
      if (!/\[\[acompte-net:\d+\]\]/.test(notes)) {
        notes = `[[acompte-net:${net}]]\n${notes}`;
      }
    } else {
      continue;
    }

    if (notes !== avant) {
      await supabase.from("quotes").update({ notes }).eq("id", quoteId);
      traite++;
      console.log(
        `✓ ${quoteId.slice(0, 8)} ${estEcheance ? `échéance ${numero}` : "acompte"} :`,
        `net ${(net / 100).toFixed(2)}€ (brut ${((s.amount_total) / 100).toFixed(2)}€)`
      );
    }
  }
  if (!sessions.has_more) break;
  startingAfter = sessions.data[sessions.data.length - 1].id;
}
console.log(`\nTerminé : ${traite} devis mis à jour.`);

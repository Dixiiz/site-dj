// Diagnostic URSSAF : état des acomptes validés + notes des devis concernés.
// Usage : node scripts/diag-urssaf.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) =>
  env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
const sb = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

const now = new Date();
const mois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
console.log("Mois courant :", mois);

const { data: quotes } = await sb
  .from("quotes")
  .select("id, customer_name, status, total_cents, acompte_paid_at, notes, event_date")
  .eq("status", "confirme");

for (const q of quotes ?? []) {
  const n = String(q.notes ?? "");
  const valide = n.includes("[[acompte-valide:");
  const marqueurs = n.match(/\[\[(?:acompte|acompte-net|solde-montant|solde-valide|echeance-net)[^\]]*\]\]/g)?.join(" ") ?? "";
  if (valide || marqueurs) {
    console.log(
      `\n${q.customer_name} | total=${(q.total_cents / 100).toFixed(2)}€ | acompte_paye=${q.acompte_paid_at?.slice(0, 10) ?? "AUCUN"} | event=${q.event_date}`,
      `\n  marqueurs : ${marqueurs || "(aucun)"}`,
      valide ? "\n  ⚠️ ACOMPTE VALIDÉ URSSAF" : ""
    );
  }
}

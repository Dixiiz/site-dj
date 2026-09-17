// Diagnostic ponctuel : vérifier l'enregistrement des acomptes récents
// (devis confirmés + échéanciers) pour comprendre pourquoi un acompte
// n'apparaît pas dans « Soldes à valider ».
// Usage : node scripts/diag-acompte.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) =>
  env
    .match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]
    ?.trim()
    .replace(/^\"|\"$/g, "")
    .replace(/^'|'$/g, "");
const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

const iso = (d) => d.toISOString();
const depuis30j = iso(new Date(Date.now() - 30 * 864e5));

// 1. Devis récents avec infos acompte / notes / statut
const { data: quotes, error: eq } = await supabase
  .from("quotes")
  .select("id, customer_name, status, total_cents, acompte_paid_at, acompte_declared_at, notes, event_date, created_at")
  .gte("created_at", depuis30j)
  .order("created_at", { ascending: false });
if (eq) { console.error("quotes:", eq.message); process.exit(1); }
console.log("=== DEVIS (30 derniers jours) ===");
for (const q of quotes ?? []) {
  const acompte = /\[\[acompte:(\d+)\]\]/.exec(String(q.notes ?? ""));
  console.log(
    `${q.id.slice(0, 8)} | ${q.customer_name} | statut=${q.status} | total=${(q.total_cents / 100).toFixed(2)}€`,
    `| acompte_paye=${q.acompte_paid_at ? q.acompte_paid_at.slice(0, 10) : "NON"}`,
    `| [[acompte]]=${acompte ? (Number(acompte[1]) / 100).toFixed(2) + "€" : "absent"}`,
    `| event=${q.event_date ?? "?"}`
  );
}

// 2. Échéanciers récemment payés
const { data: ech, error: ee } = await supabase
  .from("payment_schedule")
  .select("id, quote_id, numero, amount_cents, status, paid_at, valide_urssaf, due_date")
  .gte("paid_at", depuis30j)
  .order("paid_at", { ascending: false });
if (ee) { console.error("payment_schedule:", ee.message); process.exit(1); }
console.log("\n=== ÉCHÉANCES PAYÉES (30 derniers jours) ===");
for (const e of ech ?? []) {
  console.log(
    `quote=${e.quote_id.slice(0, 8)} | échéance ${e.numero} | ${(e.amount_cents / 100).toFixed(2)}€`,
    `| statut=${e.status} | payée_le=${e.paid_at?.slice(0, 10) ?? "?"} | urssaf=${e.valide_urssaf ? "validée" : "À VALIDER"}`
  );
}
if ((ech ?? []).length === 0) console.log("(aucune)");

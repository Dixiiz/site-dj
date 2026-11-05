// DIAGNOSTIC ciblé : recherche du devis « Les Bichettes » et état des marqueurs.
// Usage : node scripts/diag-bichettes.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) =>
  env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
const sb = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));
const eur = (c) => (c / 100).toFixed(2) + " €";
const todayIso = new Date().toLocaleDateString("fr-CA");

const { data: quotes, error: eq } = await sb
  .from("quotes")
  .select(
    "id, customer_name, status, total_cents, acompte_paid_at, acompte_required, notes, event_date",
  )
  .ilike("customer_name", "%bichette%");
if (eq) { console.error(eq.message); process.exit(1); }

if (!quotes?.length) {
  console.log("Aucun devis trouvé avec 'bichette'. Recherche élargie…");
  const { data: all } = await sb
    .from("quotes")
    .select("id, customer_name, status, total_cents, acompte_paid_at, notes, event_date")
    .eq("status", "confirme");
  const cands = (all ?? []).filter((q) =>
    ["bich", "bicette", "bichettes"].some((k) =>
      (q.customer_name ?? "").toLowerCase().includes(k),
    ),
  );
  console.log(`Candidats élargis : ${cands.length}`);
  if (!cands.length) {
    for (const q of all ?? []) {
      if ((q.event_date ?? "") <= todayIso) {
        console.log(`  passé : ${q.customer_name} — event ${q.event_date} — ${eur(q.total_cents)}`);
      }
    }
    process.exit(0);
  }
  quotes.push(...cands);
}

for (const q of quotes) {
  const notes = String(q.notes ?? "");
  console.log("=".repeat(70));
  console.log(`DEVIS ${q.id}`);
  console.log(`  client     : ${q.customer_name}`);
  console.log(`  statut     : ${q.status}`);
  console.log(`  event_date : ${q.event_date} (passée : ${q.event_date <= todayIso ? "OUI" : "non"})`);
  console.log(`  total      : ${eur(q.total_cents)}`);
  console.log(`  acompte    : paid_at=${q.acompte_paid_at ?? "—"} — required=${q.acompte_required}`);
  const marqueurs = notes.match(/\[\[[^\]]+\]\]/g) ?? [];
  console.log(`  marqueurs  : ${marqueurs.length}`);
  for (const m of marqueurs) console.log(`    ${m}`);
  console.log("  notes brutes (1000 premiers car.) :");
  console.log("  " + notes.slice(0, 1000).replaceAll("\n", "\n  "));
}
console.log("DONE");
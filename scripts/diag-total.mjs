// Diagnostic : total d'un devis vs somme de ses composantes.
// Usage : node scripts/diag-total.mjs "Hugo"        → inspecte un client
//         node scripts/diag-total.mjs --scan        → scanne tous les devis
//         node scripts/diag-total.mjs --fix <id>    → corrige le total d'un devis
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) =>
  env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
const sb = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

const eur = (c) => (c / 100).toFixed(2) + " €";
const arg = process.argv[2] ?? "Hugo";
const attenduDe = (q) => {
  const opts = Array.isArray(q.selected_options) ? q.selected_options : [];
  return (
    Number(q.formula_price_cents ?? 0) +
    opts.reduce((s, o) => s + Number(o.price_cents ?? 0), 0) +
    Number(q.travel_fee_cents ?? 0) +
    Number(q.extra_fee_cents ?? 0)
  );
};

if (arg === "--scan") {
  const { data: quotes, error } = await sb.from("quotes").select("*");
  if (error) { console.error(error.message); process.exit(1); }
  let ecarts = 0;
  for (const q of quotes ?? []) {
    const attendu = attenduDe(q);
    const stocke = Number(q.total_cents ?? 0);
    if (attendu !== stocke) {
      ecarts++;
      console.log(
        `${q.customer_name} (id ${q.id.slice(0, 8)}) — stocké ${eur(stocke)} vs attendu ${eur(attendu)} (écart ${eur(stocke - attendu)})`
      );
    }
  }
  console.log(`\n${quotes.length} devis scannés, ${ecarts} en écart.`);
  process.exit(0);
}

if (arg === "--fix") {
  const id = process.argv[3] ?? "";
  if (!id) { console.error("Usage : node scripts/diag-total.mjs --fix <id|préfixe>"); process.exit(1); }
  // id est un UUID : pas d'opérateur ilike en SQL → filtrage côté JS.
  const { data: all, error } = await sb.from("quotes").select("*");
  if (error) { console.error(error.message); process.exit(1); }
  const q = (all ?? []).find((r) => r.id.startsWith(id));
  if (!q) { console.error("Devis introuvable pour", id); process.exit(1); }
  const attendu = attenduDe(q);
  console.log(`Correction ${q.customer_name} : ${eur(Number(q.total_cents))} → ${eur(attendu)}`);
  const { error: upErr } = await sb.from("quotes").update({ total_cents: attendu }).eq("id", q.id);
  if (upErr) { console.error(upErr.message); process.exit(1); }
  const { data: verif } = await sb.from("quotes").select("total_cents").eq("id", q.id).single();
  console.log(`Vérifié en base : ${eur(Number(verif?.total_cents))} ${Number(verif?.total_cents) === attendu ? "✓" : "❌"}`);
  process.exit(0);
}

const { data: quotes, error } = await sb
  .from("quotes")
  .select("*")
  .ilike("customer_name", `%${arg}%`);
if (error) { console.error(error.message); process.exit(1); }

for (const q of quotes ?? []) {
  const opts = Array.isArray(q.selected_options) ? q.selected_options : [];
  const sommeOptions = opts.reduce((s, o) => s + Number(o.price_cents ?? 0), 0);
  const attendu = attenduDe(q);
  console.log(`\n=== ${q.customer_name} (id ${q.id.slice(0, 8)}) — statut ${q.status} ===`);
  console.log(`Pack            : ${q.formula_name} — ${eur(q.formula_price_cents)}`);
  console.log(`Déplacement     : ${eur(q.travel_fee_cents)} (${q.travel_distance_km ?? "—"} km)`);
  console.log(`Supplément      : ${eur(q.extra_fee_cents)} — ${q.extra_fee_label ?? "—"}`);
  console.log(`Options+lignes  : ${eur(sommeOptions)}`);
  for (const o of opts) console.log(`   • ${o.name} : ${eur(o.price_cents)}`);
  console.log(`Total attendu   : ${eur(attendu)}`);
  console.log(`TOTAL EN BASE   : ${eur(q.total_cents)}  ${attendu === Number(q.total_cents) ? "✓ cohérent" : "❌ ÉCART de " + eur(Number(q.total_cents) - attendu)}`);
}
if ((quotes ?? []).length === 0) console.log("Aucun devis trouvé pour", arg);

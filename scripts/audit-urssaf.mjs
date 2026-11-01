// AUDIT COMPLET : simule exactement la logique du tableau de bord /admin
// sur les données réelles et affiche le détail attendu.
// Usage : node scripts/audit-urssaf.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) =>
  env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
const sb = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

const now = new Date();
const year = now.getFullYear();
const mois = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const todayIso = now.toLocaleDateString("fr-CA");
const eur = (c) => (c / 100).toFixed(2) + " €";

const { data: quotes, error: eq } = await sb
  .from("quotes")
  .select("id, customer_name, status, total_cents, acompte_paid_at, acompte_required, notes, event_date")
  .eq("status", "confirme");
if (eq) { console.error(eq.message); process.exit(1); }
const { data: echeances, error: ee } = await sb
  .from("payment_schedule")
  .select("id, quote_id, numero, amount_cents, status, paid_at, valide_urssaf, due_date");
if (ee) { console.error(ee.message); process.exit(1); }

// --- Mêmes règles que admin/page.tsx ---
const montant = (q) => Number(q.total_cents ?? 0);
const soldeDe = (q) => {
  const notes = String(q.notes ?? "");
  const fixe = /\[\[solde-montant:(\d+)\]\]/.exec(notes);
  if (fixe) return Number(fixe[1]);
  const total = montant(q);
  const marker = /\[\[acompte:(\d+)\]\]/.exec(notes);
  if (marker) return Math.max(0, total - Number(marker[1]));
  if (notes.includes("[[facture-libre]]") || notes.includes("[[import-avant-site]]")) return total;
  if (q.acompte_required === false) return total;
  return Math.max(0, total - Math.floor((total * 0.8) / 10) * 10);
};
const acompteDe = (q) => {
  const marker = /\[\[acompte:(\d+)\]\]/.exec(String(q.notes ?? ""));
  if (marker) return Number(marker[1]);
  if (q.acompte_required === false) return 0;
  return montant(q) - Math.floor((montant(q) * 0.8) / 10) * 10;
};
// Solde réglé EN LIGNE (carte/virement confirmé) — compté automatiquement.
const soldeEnLigneDe = (q) =>
  /\[\[solde-en-ligne:(\d{4}-\d{2}-\d{2})\]\]/.exec(String(q.notes ?? ""))?.[1] ?? null;
const soldeEnLigneNetDe = (q) => {
  const net = /\[\[solde-en-ligne-net:(\d+)\]\]/.exec(String(q.notes ?? ""));
  return net ? Number(net[1]) : soldeDe(q);
};
const acompteNetDe = (q) => {
  const net = /\[\[acompte-net:(\d+)\]\]/.exec(String(q.notes ?? ""));
  return net ? Number(net[1]) : acompteDe(q);
};
const acompteRecu = (q) =>
  Boolean(q.acompte_paid_at) || /\[\[acompte:\d+\]\]/.test(String(q.notes ?? ""));
const acompteValide = (q) => String(q.notes ?? "").includes("[[acompte-valide:");
const soldeValide = (q) => String(q.notes ?? "").includes("[[solde-valide:");
const echeancierIds = new Set((echeances ?? []).map((e) => e.quote_id));
const notesParDevis = new Map((quotes ?? []).map((q) => [q.id, String(q.notes ?? "")]));
const netEcheance = (quoteId, numero, brut) => {
  const m = new RegExp(`\\[\\[echeance-net:${numero}:(\\d+)\\]\\]`).exec(notesParDevis.get(quoteId) ?? "");
  return m ? Number(m[1]) : brut;
};


const all = quotes ?? [];
const encaisse = all.filter(
  (q) =>
    (q.event_date ?? "").startsWith(mois) &&
    (q.event_date ?? "") <= todayIso &&
    soldeValide(q) &&
    !soldeEnLigneDe(q)
);
const acomptesValides = all.filter(
  (q) => acompteRecu(q) && acompteValide(q) && !echeancierIds.has(q.id)
);
const urssafEcheances = (echeances ?? [])
  .filter((e) => e.status === "payee" && e.valideUrssaf && e.dueDate.startsWith(mois))
  .reduce((s, e) => s + netEcheance(e.quote_id, e.numero, e.amount_cents), 0);
const urssafAcomptes = acomptesValides
  .filter((q) => String(q.acompte_paid_at ?? "").startsWith(mois))
  .reduce((s, q) => s + acompteNetDe(q), 0);
const urssafSoldesEnLigne = all
  .filter((q) => {
    const d = soldeEnLigneDe(q);
    return d && d.startsWith(mois) && !echeancierIds.has(q.id);
  })
  .reduce((s, q) => s + soldeEnLigneNetDe(q), 0);
const caMois =
  encaisse.reduce((s, q) => s + soldeDe(q), 0) +
  urssafEcheances +
  urssafAcomptes +
  urssafSoldesEnLigne;

console.log(`=== CA URSSAF ${mois} attendu : ${eur(caMois)} ===`);
for (const q of encaisse) {
  console.log(`  solde validé : ${q.customer_name} — ${eur(soldeDe(q))} (event ${q.event_date})`);
}
for (const q of acomptesValides.filter((q) => String(q.acompte_paid_at ?? "").startsWith(mois))) {
  console.log(`  acompte net  : ${q.customer_name} — ${eur(acompteNetDe(q))} (reçu le ${q.acompte_paid_at?.slice(0, 10)})`);
}
console.log(`  échéanciers  : ${eur(urssafEcheances)}`);
for (const q of all.filter((q) => {
  const d = soldeEnLigneDe(q);
  return d && d.startsWith(mois) && !echeancierIds.has(q.id);
})) {
  console.log(`  solde en ligne : ${q.customer_name} — ${eur(soldeEnLigneNetDe(q))} net (réglé le ${soldeEnLigneDe(q)})`);
}

console.log("\n=== Vérifications de cohérence ===");
let problemes = 0;

// Acomptes "à valider" qui traînent (visibles dans le panneau).
const aValider = all.filter((q) => acompteRecu(q) && !acompteValide(q) && !echeancierIds.has(q.id));
console.log(`Acomptes en attente de validation : ${aValider.length}`);
for (const q of aValider) console.log(`  → ${q.customer_name} — ${eur(acompteNetDe(q))}`);

// Échéances payées non confirmées URSSAF.
const echAConfirmer = (echeances ?? []).filter((e) => e.status === "payee" && !e.valideUrssaf);
console.log(`Échéances payées non confirmées : ${echAConfirmer.length}`);
for (const e of echAConfirmer)
  console.log(`  → ${e.quote_id.slice(0, 8)} échéance ${e.numero} — ${eur(netEcheance(e.quote_id, e.numero, e.amount_cents))} net`);

// Devis "joués" ce mois sans solde validé (oublis).
const oublis = all.filter(
  (q) =>
    (q.event_date ?? "").startsWith(mois) &&
    (q.event_date ?? "") <= todayIso &&
    !soldeValide(q) &&
    !soldeEnLigneDe(q) &&
    !echeancierIds.has(q.id)
);
console.log(`Soirées du mois sans solde validé : ${oublis.length}`);
for (const q of oublis) console.log(`  → ${q.customer_name} — ${eur(soldeDe(q))} à valider`);

// Incohérences de marqueurs.
for (const q of all) {
  const n = String(q.notes ?? "");
  if ((n.match(/\[\[solde-montant:/g) ?? []).length > 1) {
    console.log(`⚠️ ${q.customer_name} : plusieurs [[solde-montant]] !`);
    problemes++;
  }
  if (soldeValide(q) && !echeancierIds.has(q.id)) {
    const s = soldeDe(q);
    if (!(s > 0)) { console.log(`⚠️ ${q.customer_name} : solde validé mais montant = 0`); problemes++; }
  }
}
console.log(problemes === 0 ? "\n✓ Aucune incohérence détectée" : `\n⚠️ ${problemes} point(s) à vérifier`);

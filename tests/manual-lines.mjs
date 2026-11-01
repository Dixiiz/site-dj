// Round-trip des lignes supplémentaires manuelles (réplique exacte de la
// logique formulaire admin-quote-edit.tsx + action updateQuoteAdmin).
// node tests/manual-lines.mjs
import { readFileSync } from "node:fs";

// ADMIN_FX_OPTIONS est dans un .tsx (React) : on extrait le catalogue du
// fichier source (name + price de chaque option).
const source = readFileSync(
  new URL("../src/components/pricing-section.tsx", import.meta.url),
  "utf8"
);
const fxCatalog = source.slice(
  source.indexOf("const FX_OPTIONS = ["),
  source.indexOf("export const ADMIN_FX_OPTIONS")
);
const ADMIN_FX_OPTIONS = [...fxCatalog.matchAll(/\{\s*name:\s*"([^"]+)",[\s\S]*?price:\s*(\d+),/g)]
  .map((m) => ({ name: m[1], price: Number(m[2]) }));
const CATALOG_NAME = ADMIN_FX_OPTIONS[0].name;
const CATALOG_PRICE = ADMIN_FX_OPTIONS[0].price;
console.log(`Catalogue FX chargé : ${ADMIN_FX_OPTIONS.length} options (1re : « ${CATALOG_NAME} »)`);

const euros = (cents) => ((cents ?? 0) / 100).toFixed(2).replace(".", ",");
const isFx = (name) =>
  ADMIN_FX_OPTIONS.some((f) => name === f.name || name.startsWith(`${f.name} ×`));

// --- Formulaire : init des états depuis les options enregistrées ---
function initForm(storedOptions) {
  const checked = [];
  for (const o of storedOptions) {
    const fx = ADMIN_FX_OPTIONS.find((f) => o.name === f.name || o.name.startsWith(`${f.name} ×`));
    if (fx && !checked.includes(fx.name)) checked.push(fx.name);
  }
  const manualLines = storedOptions
    .filter((o) => !isFx(o.name))
    .map((o) => ({ label: o.name, amount: euros(o.price_cents) }));
  return { checked, manualLines };
}

// --- Serveur : reconstruction de selected_options depuis le FormData ---
function serverBuild(formData) {
  const checkedNames = String(formData.get("checked_options") ?? "").split("||").map((n) => n.trim()).filter(Boolean);
  const co2Qty = Number(formData.get("co2_qty") ?? 1);
  const selected = checkedNames.map((name, index) => {
    const fx = ADMIN_FX_OPTIONS.find((f) => f.name === name);
    const qty = /CO2/i.test(name) ? co2Qty : 1;
    return { id: `admin-${index}`, name: qty > 1 ? `${name} × ${qty}` : name, price_cents: fx ? fx.price * qty : 0, qty };
  });
  const manualRaw = String(formData.get("manual_lines") ?? "").trim();
  if (manualRaw) {
    try {
      const parsed = JSON.parse(manualRaw);
      parsed.forEach((line, index) => {
        const label = String(line?.label ?? "").trim();
        const amount = Number.parseFloat(String(line?.amount ?? "").replace(",", "."));
        if (label && Number.isFinite(amount) && amount !== 0) {
          selected.push({ id: `perso-${selected.length}-${index}`, name: label, price_cents: Math.round(amount * 100), qty: 1 });
        }
      });
    } catch { /* ignore */ }
  }
  return selected;
}

// --- Scénario 1 : devis existant (CO2 ×2 + 2 lignes perso) → édition → save ---
const CO2_NAME = ADMIN_FX_OPTIONS.find((f) => f.name.includes("CO2"))?.name ?? CATALOG_NAME;
const CO2_PRICE = ADMIN_FX_OPTIONS.find((f) => f.name === CO2_NAME).price;
const stored = [
  { id: "1", name: `${CO2_NAME} × 2`, price_cents: CO2_PRICE * 2, qty: 2 },
  { id: "2", name: "Location matériel", price_cents: 15000, qty: 1 },
  { id: "3", name: "Aller-retour RDV", price_cents: 4000, qty: 1 },
];
const form = initForm(stored);
console.log("Form après lecture :", JSON.stringify({ checked: form.checked, manualLines: form.manualLines }));

// l'admin n'ajoute rien, il ré-enregistre tel quel
const fd = new Map();
fd.set("checked_options", form.checked.join("||"));
fd.set("co2_qty", "2"); // restauré par le select CO2
fd.set("manual_lines", JSON.stringify(form.manualLines.map((l) => ({ label: l.label.trim(), amount: l.amount.trim() })).filter((l) => l.label !== "")));
const resaved = serverBuild(fd);
console.log("Ré-enregistré :", JSON.stringify(resaved));

let fail = 0;
const t = (cond, msg) => { if (!cond) { fail++; console.log("ÉCHEC :", msg); } };
t(resaved.length === 3, "3 lignes conservées (CO2 + 2 perso)");
t(form.checked.includes(CO2_NAME), "CO2 re-coché via les cases (pas en ligne manuelle)");
t(form.manualLines.length === 2, "2 lignes manuelles rechargées");
t(resaved.find((o) => o.name === `${CO2_NAME} × 2`)?.price_cents === CO2_PRICE * 2, `CO2 ×2 = ${(CO2_PRICE * 2) / 100} € (pas de perte ni doublement)`);
t(resaved.find((o) => o.name === "Location matériel")?.price_cents === 15000, "Location matériel = 150 €");
t(resaved.find((o) => o.name === "Aller-retour RDV")?.price_cents === 4000, "Aller-retour RDV = 40 €");

// --- Scénario 2 : ajout de 2 nouvelles lignes avec montants à virgule ---
const fd2 = new Map();
fd2.set("checked_options", CATALOG_NAME);
fd2.set("co2_qty", "1");
fd2.set("manual_lines", JSON.stringify([{ label: "Location sono extérieure", amount: "250,50" }, { label: "", amount: "" }]));
const added = serverBuild(fd2);
t(added.length === 2, "ligne vide ignorée, 2 lignes au total");
t(added.find((o) => o.name === "Location sono extérieure")?.price_cents === 25050, "250,50 € parsé correctement");
t(added.find((o) => o.name === CATALOG_NAME)?.price_cents === CATALOG_PRICE, "option catalogue prix intact");

// --- Scénario 3 : JSON corrompu → pas de crash, options catalogue sauvées ---
const fd3 = new Map();
fd3.set("checked_options", CATALOG_NAME);
fd3.set("manual_lines", "{oops");
t(serverBuild(fd3).length === 1, "JSON corrompu : les options du catalogue survivent");

console.log(fail === 0 ? "\n✅ Tous les tests passent" : `\n❌ ${fail} échec(s)`);
process.exit(fail ? 1 : 0);

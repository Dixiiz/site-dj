// Test des fonctions REELLES du site (booking-extra.ts pur) — exécuter depuis site-dj :
// node --experimental-strip-types tests/extra-minutes.mjs
import { computeExtraHours, extraMinutes } from "../src/lib/booking-extra.ts";

const RATE = 12000; // EXTRA_HOUR_RATE_CENTS
const cases = [
  ["Essential 19h-4h (9h, forfait 8h)", { formula_name: "Pack Essential", start_time: "19:00", end_time: "04:00" }],
  ["Essential 20h-4h (8h pile = forfait)", { formula_name: "Pack Essential", start_time: "20:00", end_time: "04:00" }],
  ["Essential 20h30-4h (7h30)", { formula_name: "Pack Essential", start_time: "20:30", end_time: "04:00" }],
  ["Essential 20h-5h (9h)", { formula_name: "Pack Essential", start_time: "20:00", end_time: "05:00" }],
  ["Péage (libellé perso) 19h-4h", { formula_name: "Pack Essential", start_time: "19:00", end_time: "04:00", extra_fee_label: "Péage" }],
  ["Pack libre 19h-4h", { formula_name: "Sonorisation lumière", start_time: "19:00", end_time: "04:00" }],
  ["Premium (forfait 6h) 19h-3h", { formula_name: "Pack Premium", start_time: "19:00", end_time: "03:00" }],
];
let fail = 0;
for (const [label, input] of cases) {
  const min = extraMinutes(input);
  const h = computeExtraHours(input);
  const autoHours = min != null ? Math.ceil(Math.max(0, min) / 60) : null;
  const cents = autoHours != null ? autoHours * RATE : null;
  console.log(
    `${label.padEnd(40)} extraMinutes=${String(min).padEnd(6)} facturé=${h == null ? "null" : h + "h"}` +
      ` | autoform=${cents == null ? "ne touche pas" : cents / 100 + " €"}`
  );
}
const t = (cond, msg) => { if (!cond) { fail++; console.log("ÉCHEC :", msg); } };
t(extraMinutes({ formula_name: "Pack Essential", start_time: "20:00", end_time: "04:00" }) === 0, "20h-4h = 8h pile = 0 min supp (pas null)");
t(computeExtraHours({ formula_name: "Pack Essential", start_time: "19:00", end_time: "04:00" }) === 1, "19h-4h = 1h supp");
t(computeExtraHours({ formula_name: "Pack Essential", start_time: "20:00", end_time: "04:00" }) === null, "20h-4h = 0h supp (null pour la facturation, inchangé)");
t(extraMinutes({ formula_name: "Pack Essential", start_time: "19:00", end_time: "04:00", extra_fee_label: "Péage" }) === null, "libellé perso → null");
t(extraMinutes({ formula_name: "Pack Premium", start_time: "19:00", end_time: "03:00" }) === 120, "Premium (6h forfait) 19h-3h = 120 min");
t(extraMinutes({ formula_name: "Pack Essential", start_time: "", end_time: "" }) === null, "horaires vides → null");
t(extraMinutes({ formula_name: "Pack Essential", notes: "Début : 19:00 | Fin : 04:00" }) === 60, "fallback notes ancien devis = 60 min");
console.log(fail === 0 ? "\n✅ Tous les tests passent" : `\n❌ ${fail} échec(s)`);
process.exit(fail ? 1 : 0);

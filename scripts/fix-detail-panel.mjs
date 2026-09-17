// Affiche les montants exacts dans CaDetailPanel : afficheCents prioritaire,
// boutons solde/avis seulement pour les vraies lignes de soirée.
// Usage : node scripts/fix-detail-panel.mjs
import { readFileSync, writeFileSync } from "node:fs";

const p = "src/components/ca-detail-panel.tsx";
let s = readFileSync(p, "utf8");
let ok = true;

const remplace = (a, b) => {
  if (s.includes(a)) {
    s = s.split(a).join(b);
  } else {
    console.log("INTROUVABLE :", a.slice(0, 60));
    ok = false;
  }
};

remplace(
  "const total = rows.reduce((sum, row) => sum + (solde ? soldeDe(row) : row.totalCents), 0);",
  "const total = rows.reduce(\n    (sum, row) => sum + (row.afficheCents ?? (solde ? soldeDe(row) : row.totalCents)),\n    0\n  );"
);
remplace(
  "const affiche = solde ? soldeDe(row) : row.totalCents;",
  "const affiche = row.afficheCents ?? (solde ? soldeDe(row) : row.totalCents);"
);
remplace(
  "                  {solde && !soldeValide(row.notes) ? (",
  "                  {solde &&\n                    (row.type === undefined || row.type === \"solde\") &&\n                    !soldeValide(row.notes) ? ("
);
remplace(
  "                  {solde ? (\n                    <ReviewReceivedButton",
  "                  {solde && (row.type === undefined || row.type === \"solde\") ? (\n                    <ReviewReceivedButton"
);

writeFileSync(p, s);
console.log(ok ? "✓ panneau corrigé" : "✗ corrections incomplètes");

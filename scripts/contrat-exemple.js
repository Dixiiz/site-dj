/* eslint-disable */
// Script jetable : génère un contrat d'exemple pour validation visuelle
const path = require("path");
const { buildContratPdf } = require(require("path").join(__dirname, "../.tmp-build/contrat-pdf"));

(async () => {
  const pdfBytes = await buildContratPdf(
    {
      contract_number: "20260903-01",
      customer_name: "Famille DUPONT",
      customer_email: "dupont@example.fr",
      event_type: "Mariage",
      event_date: "2026-10-15",
      event_time: "18h00 à 04h00",
      event_location: "Salle des Fêtes, 12 rue des Lilas, 41000 Blois",
      formula_name: "Pack Mariage Deluxe",
      total_cents: 119400,
    },
    {
      contractNumber: "20260903-01",
      signature: { name: "Famille DUPONT", dateIso: new Date().toISOString(), drawnPng: "" },
    }
  );
  const fs = require("fs");
  fs.writeFileSync("/Users/maximesoulaine/Desktop/Contrat-PropulSound-exemple.pdf", pdfBytes);
  console.log("OK -> /Users/maximesoulaine/Desktop/Contrat-PropulSound-exemple.pdf");
})();

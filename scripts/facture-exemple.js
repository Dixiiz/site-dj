/* eslint-disable */
const { buildFacturePdf } = require(require("path").join(__dirname, "../.tmp-build/facture-pdf"));
(async () => {
  const bytes = await buildFacturePdf(
    {
      customer_name: "Famille DUPONT",
      customer_email: "dupont@example.fr",
      customer_phone: "06 12 34 56 78",
      event_type: "",
      event_date: "2026-10-15",
      start_time: "18:00",
      end_time: "04:00",
      event_location: "Salle des Fêtes, 12 rue des Lilas, 41000 Blois",
      formula_name: "Pack Mariage Deluxe",
      formula_price_cents: 85000,
      selected_options: [
        { name: "machine à fumée lourde", qty: 1, price_cents: 6000 },
        { name: "pistolet à confettis", qty: 1, price_cents: 4000 },
      ],
      travel_fee_cents: 2400,
      travel_distance_km: 30,
      extra_fee_cents: 0,
      total_cents: 119400,
    },
    { invoiceNumber: "F-2026-001" }
  );
  require("fs").writeFileSync("/Users/maximesoulaine/Desktop/Facture-exemple.pdf", bytes);
  console.log("OK -> Facture-exemple.pdf");
})();

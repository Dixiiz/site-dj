import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(k + "=(.*)"))[1].trim();
const sb = createClient(
  get("NEXT_PUBLIC_SUPABASE_URL"),
  get("SUPABASE_SERVICE_ROLE_KEY")
);

const opts = [
  {
    name: "Machine à fumée lourde",
    description:
      "Fumée dense qui se répand au sol et enveloppe la piste de danse pour un rendu club spectaculaire.",
    price_cents: 15000,
  },
  {
    name: "2 machines à étincelles froides",
    description:
      "Fontaines d'étincelles froides, sans danger, pour sublimer les moments forts : ouverture de bal, entrée du gâteau.",
    price_cents: 15000,
  },
  {
    name: "Pistolet à fumée effet CO2 (à l'unité)",
    description:
      "Jet de fumée glacée propulsé sur les beats — effet wow garanti sur la piste. Au lieu de 150 €, promo à 75 € l'unité !",
    price_cents: 7500,
  },
  {
    name: "Light+ — Pack lumière intégrale effet club",
    description:
      "Toute la régie lumière déployée : lyres, washers, lasers et strobes synchronisés à la musique. Votre salle devient un club.",
    price_cents: 0,
  },
];

// Supprime les anciennes versions de ces options puis les insère à jour.
const names = opts.map((o) => o.name);
await sb.from("options").delete().in("name", names);
const { error } = await sb.from("options").insert(opts);
console.log(error ? "ERREUR : " + error.message : "OK — options insérées");

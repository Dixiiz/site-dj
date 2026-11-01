import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(
  "/Users/maximesoulaine/Desktop/Site DJ/site-dj/.env.local",
  "utf8"
);
const get = (k) =>
  new RegExp("^" + k + "=(.*)$", "m").exec(env)[1].trim().replace(/^["']|["']$/g, "");

const sb = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));
const { data } = await sb.storage.from("site-media").download("galerie/_credits.json");
const bundle = JSON.parse(await data.text());

// Nettoyage des données de test : suppression des clés créées par le test
delete bundle.photographers["Test Diag Auto"];
delete bundle.lieux["Testville"];

const { error } = await sb.storage
  .from("site-media")
  .upload("galerie/_credits.json", JSON.stringify(bundle), {
    contentType: "application/json",
    upsert: true,
  });
console.log("upload error:", error?.message ?? "aucune");

const { data: d2 } = await sb.storage.from("site-media").download("galerie/_credits.json");
const after = JSON.parse(await d2.text());
console.log("APRES photographers:", Object.keys(after.photographers));
console.log("APRES lieux:", Object.keys(after.lieux));
console.log("Test encore présent ?", JSON.stringify(after).includes("Test Diag Auto"));

// Relecture après 3 s pour détecter une écriture fantôme
await new Promise((r) => setTimeout(r, 3000));
const { data: d3 } = await sb.storage.from("site-media").download("galerie/_credits.json");
const ghost = JSON.parse(await d3.text());
console.log("Après 3 s — Test encore présent ?", JSON.stringify(ghost).includes("Test Diag Auto"));
console.log("Après 3 s — photographers:", Object.keys(ghost.photographers));

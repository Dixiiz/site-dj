// Synchronise public/videos/showcase vers le bucket Supabase « site-media » :
// supprime les anciens clips du bucket, puis envoie les nouveaux (mp4 + jpg).
// Usage : node scripts/sync-showcase.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Lecture du .env.local (clés NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const FOLDER = "videos/showcase";
const DIR = join(root, "public/videos/showcase");

// 1) Suppression des anciens fichiers du bucket (sauf _ordre.json)
const { data: existing } = await supabase.storage.from("site-media").list(FOLDER, { limit: 200 });
const old = (existing ?? []).filter((f) => !f.name.startsWith("_"));
if (old.length > 0) {
  const { error } = await supabase.storage
    .from("site-media")
    .remove(old.map((f) => `${FOLDER}/${f.name}`));
  if (error) throw new Error("Suppression impossible : " + error.message);
  console.log(`Supprimé ${old.length} ancien(s) fichier(s).`);
}

// 2) Envoi des nouveaux clips + miniatures
const files = readdirSync(DIR).filter((f) => /\.(mp4|jpe?g)$/i.test(f)).sort();
for (const name of files) {
  const mime = name.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
  const { error } = await supabase.storage
    .from("site-media")
    .upload(`${FOLDER}/${name}`, readFileSync(join(DIR, name)), { contentType: mime, upsert: true });
  if (error) throw new Error(`${name} : ${error.message}`);
  console.log("Envoyé", name);
}
console.log("Synchronisation terminée ✓");

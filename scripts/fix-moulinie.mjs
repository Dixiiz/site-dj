// Corrige le devis Thomas Moulinie : acompte de 310 € jamais encaissé →
// remplacé par un solde FIGÉ à 1 300 € ([[solde-montant:130000]]).
// Usage : node scripts/fix-moulinie.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) =>
  env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
const sb = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

const id = "3bb72845-b8d4-4212-aa1f-557cfa9dbb35";
const { data: q, error } = await sb.from("quotes").select("notes").eq("id", id).single();
if (error) { console.error("Lecture impossible :", error.message); process.exit(1); }

let notes = String(q.notes ?? "");
const avant = notes;
notes = notes.replace(/\[\[acompte:\d+\]\]\s*/g, "");
if (!notes.includes("[[solde-montant:")) {
  notes = `[[solde-montant:130000]]\n${notes}`;
}
console.log("AVANT :", avant.slice(0, 150));
console.log("APRÈS :", notes.slice(0, 150));
if (notes !== avant) {
  const { error: up } = await sb.from("quotes").update({ notes }).eq("id", id);
  console.log(up ? `ERREUR : ${up.message}` : "✓ Notes mises à jour");
} else {
  console.log("Rien à modifier (déjà corrigé).");
}

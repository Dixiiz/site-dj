// Vérifie les devis liés à un e-mail. Usage : node scripts/diag-quotes.mjs <email>
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);
const email = process.argv[2];
if (!email) { console.error("Usage : node scripts/diag-quotes.mjs <email>"); process.exit(1); }

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: quotes, error } = await supabase
  .from("quotes")
  .select("id, customer_email, customer_name, created_at")
  .ilike("customer_email", email);
if (error) { console.error("Erreur :", error.message); process.exit(1); }
console.log(`Devis liés à ${email} : ${quotes?.length ?? 0}`);
console.log(JSON.stringify(quotes, null, 2));
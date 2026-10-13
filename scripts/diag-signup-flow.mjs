// Test : quel comportement à l'inscription sur ce projet Supabase ?
// Crée un compte jetable via generateLink(signup) — comme signUpClient —,
// affiche s'il est immédiatement confirmé ou non, puis le supprime.
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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const testEmail = `test-jetable-${Date.now()}@example.com`;
const { data, error } = await supabase.auth.admin.generateLink({
  type: "signup",
  email: testEmail,
  password: "test-jetable-1234",
  options: { data: { name: "Test Jetable" } },
});
if (error || !data) {
  console.error("generateLink erreur:", error?.message);
  process.exit(1);
}
const u = data.user;
console.log("Compte jetable créé :", testEmail);
console.log({
  id: u.id,
  email_confirmed_at: u.email_confirmed_at ?? null,
  confirmed_at: u.confirmed_at ?? null,
  action_link_présent: Boolean(data.properties?.action_link),
});
console.log(
  u.email_confirmed_at || u.confirmed_at
    ? "→ Confirmation d'e-mail DÉSACTIVÉE : une nouvelle inscription connecte directement le client, sans e-mail d'activation."
    : "→ Confirmation d'e-mail ACTIVÉE : une nouvelle inscription exige de cliquer le lien d'activation envoyé par e-mail."
);
const { error: delError } = await supabase.auth.admin.deleteUser(u.id);
console.log(delError ? `⚠️ Suppression du compte jetable échouée : ${delError.message}` : "→ Compte jetable supprimé (nettoyage OK).");
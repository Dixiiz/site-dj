// Nettoyage des comptes/devis de test E2E (e2e-premiere-*).
// Usage : node scripts/cleanup-e2e.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
let n = 0;
for (const u of data?.users ?? []) {
  if (u.email?.startsWith("e2e-premiere-") || u.email?.startsWith("inconnu-")) {
    const { error } = await sb.auth.admin.deleteUser(u.id);
    console.log(error ? `❌ ${u.email}: ${error.message}` : `🧹 compte supprimé : ${u.email}`);
    if (!error) n++;
  }
}
const { error: qErr } = await sb.from("quotes").delete().like("customer_email", "e2e-premiere-%");
console.log(qErr ? `❌ devis: ${qErr.message}` : `🧹 devis de test supprimés`);
console.log(`Terminé (${n} compte(s)).`);

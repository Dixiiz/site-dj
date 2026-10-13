// Diagnostic de création de compte : vérifie l'état d'un e-mail dans Supabase Auth.
// Usage : node scripts/diag-signup.mjs <email>
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

const email = (process.argv[2] ?? "").toLowerCase();
if (!email) {
  console.error("Usage : node scripts/diag-signup.mjs <email>");
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 1) Recherche de l'utilisateur dans Auth (pagination complète)
const users = [];
let page = 1;
for (;;) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error("Erreur listUsers:", error.message);
    process.exit(1);
  }
  users.push(...(data?.users ?? []));
  if (!data?.users?.length || data.users.length < 200) break;
  page++;
}
const matches = users.filter((u) => u.email?.toLowerCase() === email);

if (matches.length === 0) {
  console.log(`✅ Aucun compte Auth existant pour ${email} → l'inscription devrait fonctionner.`);
  // Vérifie aussi la table clients/quotes si le client a déjà un devis (email normalisé)
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, customer_email, created_at")
    .ilike("customer_email", email);
  console.log(`Devis liés à cet e-mail : ${quotes?.length ?? 0}`, quotes ?? []);
  process.exit(0);
}

for (const u of matches) {
  console.log("─".repeat(60));
  console.log("Compte trouvé dans Auth :");
  console.log({
    id: u.id,
    email: u.email,
    email_confirmed_at: u.email_confirmed_at ?? null,
    confirmed_at: u.confirmed_at ?? null,
    confirmation_sent_at: u.confirmation_sent_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
    created_at: u.created_at,
    banned_until: u.banned_until ?? null,
    invitation_sent_at: u.invitation_sent_at ?? null,
    is_sso_user: u.is_sso_user ?? null,
    user_metadata: u.user_metadata,
  });
  if (!u.email_confirmed_at && !u.confirmed_at) {
    console.log("⚠️  Compte EXISTANT mais NON CONFIRMÉ → l'inscription renvoie « un compte existe déjà ».");
    const { data: link, error: linkError } = await supabase.auth.admin.generateLink({ type: "signup", email });
    if (linkError) console.log("generateLink erreur:", linkError.message);
    else console.log("Nouveau lien d'activation généré (envoie possible via Resend).");
  }
}
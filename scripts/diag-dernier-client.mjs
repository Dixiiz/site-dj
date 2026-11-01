// Diagnostic du dernier client : reconstitue ce qui s'est passé pour le devis
// le plus récent (e-mail, statut, création de compte, liens d'activation).
// Usage : node scripts/diag-dernier-client.mjs [email]  (sans argument : dernier devis)
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^[\"']|[\"']$/g, "")])
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const dt = (v) => (v ? new Date(v).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "—");

// 1) Dernier(s) devis
let quotes;
if (process.argv[2]) {
  const email = process.argv[2].toLowerCase();
  ({ data: quotes } = await supabase
    .from("quotes")
    .select("id, customer_email, customer_name, status, created_at")
    .ilike("customer_email", email)
    .order("created_at", { ascending: false }));
} else {
  ({ data: quotes } = await supabase
    .from("quotes")
    .select("id, customer_email, customer_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(3));
}
if (!quotes?.length) {
  console.log("Aucun devis trouvé.");
  process.exit(0);
}

console.log("═══ Derniers devis ═══");
for (const q of quotes) console.log({ ...q, created_at: dt(q.created_at) });

const email = (quotes[0].customer_email ?? "").toLowerCase();
const quote = quotes[0];
console.log(`\n═══ Analyse du devis le plus récent : ${quote.customer_name} <${email}> ═══`);

// 2) Compte Auth correspondant (pagination complète)
const users = [];
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error("Erreur listUsers:", error.message);
    process.exit(1);
  }
  users.push(...(data?.users ?? []));
  if (!data?.users?.length || data.users.length < 200) break;
}
const matches = users.filter((u) => u.email?.toLowerCase() === email);

if (matches.length === 0) {
  console.log("❌ AUCUN compte Auth pour cet e-mail : le client n'a jamais demandé (ou cliqué) une première connexion.");
  console.log("→ Il doit se rendre sur /connexion, onglet « Première connexion », et saisir son e-mail de devis.");
  process.exit(0);
}

for (const u of matches) {
  const infos = {
    id: u.id,
    email: u.email,
    created_at: dt(u.created_at),
    confirmé_le: dt(u.email_confirmed_at ?? u.confirmed_at),
    confirmation_envoyée_le: dt(u.confirmation_sent_at),
    invitation_envoyée_le: dt(u.invitation_sent_at),
    recovery_envoyé_le: dt(u.recovery_sent_at),
    dernière_connexion: dt(u.last_sign_in_at),
    metadata: u.user_metadata,
  };
  console.log("─".repeat(60));
  console.log("Compte Auth :", infos);
  const jamaisConfirmé = !u.email_confirmed_at && !u.confirmed_at;
  const jamaisConnecté = !u.last_sign_in_at;
  if (jamaisConfirmé) {
    console.log("⚠️  Compte existant mais NON CONFIRMÉ → tous les liens reçus avant la mise à jour du 18/10 sont expirés (validité 1 h à l'envoi).");
    console.log("→ Le client doit redemander un lien : /connexion → onglet « Première connexion » → saisir son e-mail.");
    console.log("   Le nouveau lien est valable 7 jours et le décompte de 1 h ne démarre qu'au clic.");
  } else if (jamaisConnecté) {
    console.log("⚠️  Compte confirmé mais JAMAIS connecté → il a peut-être activé son compte sans aller au bout du mot de passe.");
    console.log("→ Il peut cliquer « Mot de passe oublié » sur /connexion, ou re-cliquer le lien reçu (s'il a moins de 7 jours).");
  } else {
    console.log("✅ Compte confirmé et déjà connecté — problème non lié à l'activation.");
  }
}

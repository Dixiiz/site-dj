// E2E « première connexion » : rejoue le parcours complet d'un client, dans un
// vrai navigateur (Playwright) :
//   A) Clic du lien (compte inexistant, devis oui) → création du compte
//      (invite Supabase) → formulaire mot de passe → /mon-espace.
//   B) RE-clic du même lien (cas Seb : 1er clic pas terminé) → lien recovery
//      frais → nouveau mot de passe → /mon-espace.
//   C) Connexion classique avec e-mail + mot de passe (le mdp choisi en B).
//   D) Lien enveloppe pour un e-mail sans compte NI devis → redirection /connexion.
// Puis vérification en base et NETTOYAGE complet (compte + devis de test).
//
// Deux modes :
//  - par défaut : le lien enveloppe est signé localement (nécessite que la clé
//    SERVICE_ROLE locale soit identique à celle du serveur testé) ;
//  - « direct » : les liens Supabase sont générés via l'API admin — contourne
//    la signature locale pour tester un serveur dont la clé diffère (prod).
//    Le maillon /connexion/demarrer (HMAC) est alors validé séparément en local.
// Usage : node tests/e2e-premiere-connexion.mjs [base] [direct]
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const base = process.argv[2] ?? "http://localhost:3000";
const direct = process.argv[3] === "direct";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let failures = 0;
function check(label, ok, extra = "") {
  console.log(`${ok ? "✅" : "❌"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
}

// Reproduction exacte de signerLienPremiereConnexion (src/lib/lien-premiere-connexion.ts)
function signerLien(email) {
  const payload = Buffer.from(JSON.stringify({ email: email.toLowerCase(), iat: Date.now() })).toString("base64url");
  const signature = createHmac("sha256", env.SUPABASE_SERVICE_ROLE_KEY).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

const stamp = Date.now();
const EMAIL = `e2e-premiere-${stamp}@test-propulsound.local`;
const MDP_1 = "E2e-Mdp-2026!";
const MDP_2 = "E2e-Mdp-2027!";
const envelopeUrl = `${base}/connexion/demarrer?q=${encodeURIComponent(signerLien(EMAIL))}`;

// Lien du scénario A : enveloppe signée (mode local) ou lien invite direct
// généré par l'API admin (mode direct — équivalent à ce que produit
// /connexion/demarrer au clic).
let lienA = envelopeUrl;
if (direct) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: EMAIL,
    options: { data: { name: "Test E2E Premiere" }, redirectTo: `${base}/connexion/reinitialiser` },
  });
  if (error || !data?.properties?.action_link) {
    console.error("❌ generateLink(invite) :", error?.message);
    process.exit(1);
  }
  lienA = data.properties.action_link;
  console.log("Mode direct : lien invite généré via l'API admin.");
}

// ── Préparation : devis de test (condition d'existence du compte auto) ──
const { data: quote, error: quoteError } = await admin
  .from("quotes")
  .insert({
    customer_name: "Test E2E Premiere",
    customer_email: EMAIL,
    formula_name: "Formule Test E2E",
    formula_price_cents: 100000,
    total_cents: 100000,
    status: "attente_signature",
  })
  .select("id")
  .single();
if (quoteError || !quote) {
  console.error("❌ Impossible de créer le devis de test :", quoteError?.message);
  process.exit(1);
}
console.log(`Devis de test créé : ${quote.id} pour ${EMAIL}\n`);

const browser = await chromium.launch();
try {
  // ── A) Premier clic : compte inexistant → invitation → mot de passe ──
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  const urlsA = [];
  pageA.on("framenavigated", (f) => f === pageA.mainFrame() && urlsA.push(f.url()));
  try {
    await pageA.goto(lienA, { waitUntil: "domcontentloaded", timeout: 90000 });
    await pageA.waitForURL("**/connexion/reinitialiser**", { timeout: 90000 });
    await pageA.waitForSelector("#password", { timeout: 60000 });
  } catch (e) {
    console.log("❌ Échec scénario A — parcours :");
    for (const u of urlsA) console.log("   →", u.length > 120 ? u.slice(0, 120) + "…" : u);
    console.log("   URL courante :", pageA.url().slice(0, 120));
    console.log("   Texte visible :", (await pageA.locator("body").innerText().catch(() => "?")).slice(0, 300).replace(/\n+/g, " | "));
    throw e;
  }
  check("A1. Clic du lien → formulaire « Votre mot de passe »", pageA.url().includes("/connexion/reinitialiser"));
  check("A2. Champs mot de passe + confirmation affichés", (await pageA.locator("#confirm").count()) > 0);
  await pageA.fill("#password", MDP_1);
  await pageA.fill("#confirm", MDP_1);
  await pageA.click("button:has-text('Enregistrer et accéder à mon espace')");
  await pageA.waitForURL("**/mon-espace**", { timeout: 90000 });
  check("A3. Mot de passe enregistré → arrivée sur /mon-espace", true);
  console.log("   Parcours A :", urlsA.map((u) => u.split("#")[0].slice(0, 80)).join(" → "));
  const nameVisible = await pageA.getByText("Formule Test E2E").first().isVisible().catch(() => false);
  check("A4. L'espace client affiche bien le devis du client", nameVisible);
  await ctxA.close();


  // ── B) Re-clic du même lien (nouveau navigateur, non connecté) : recovery ──
  let lienB = envelopeUrl;
  if (direct) {
    // Le compte existe désormais : /connexion/demarrer générerait un lien
    // recovery — on le produit via l'API admin (même résultat).
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: EMAIL,
      options: { redirectTo: `${base}/connexion/reinitialiser` },
    });
    if (error || !data?.properties?.action_link) {
      console.error("❌ generateLink(recovery) :", error?.message);
      process.exit(1);
    }
    lienB = data.properties.action_link;
  }
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await pageB.goto(lienB, { waitUntil: "domcontentloaded", timeout: 90000 });
  await pageB.waitForURL("**/connexion/reinitialiser**", { timeout: 90000 });
  await pageB.waitForSelector("#password", { timeout: 60000 });
  check("B1. Re-clic du même mail → formulaire mot de passe (pas de « lien invalide »)", true);
  await pageB.fill("#password", MDP_2);
  await pageB.fill("#confirm", MDP_2);
  await pageB.click("button:has-text('Enregistrer et accéder à mon espace')");
  await pageB.waitForURL("**/mon-espace**", { timeout: 90000 });
  check("B2. Nouveau mot de passe enregistré → /mon-espace", true);
  await ctxB.close();

  // ── C) Connexion classique avec le mot de passe choisi en B ──
  const ctxC = await browser.newContext();
  const pageC = await ctxC.newPage();
  await pageC.goto(`${base}/connexion`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await pageC.fill("#email", EMAIL);
  await pageC.fill("#password", MDP_2);
  await pageC.click("button:has-text('Se connecter')");
  await pageC.waitForURL("**/mon-espace**", { timeout: 90000 });
  check("C1. Connexion e-mail + mot de passe → /mon-espace", true);
  await ctxC.close();

  // ── C2) Vérification API : le mot de passe B fonctionne (et pas l'A) ──
  const { error: errB } = await anon.auth.signInWithPassword({ email: EMAIL, password: MDP_2 });
  check("C2. signInWithPassword : le mot de passe final est actif", !errB, errB?.message);
  const { error: errA } = await anon.auth.signInWithPassword({ email: EMAIL, password: MDP_1 });
  check("C3. L'ancien mot de passe (A) est bien remplacé", Boolean(errA));

  // ── D) Lien enveloppe pour un e-mail inconnu (ni compte ni devis) ──
  // (uniquement en mode local : en mode direct la signature locale n'est pas
  // celle du serveur testé — le maillon HMAC est validé par le run local.)
  if (!direct) {
    const ctxD = await browser.newContext();
    const pageD = await ctxD.newPage();
    await pageD.goto(
      `${base}/connexion/demarrer?q=${encodeURIComponent(signerLien(`inconnu-${stamp}@test-propulsound.local`))}`,
      { waitUntil: "domcontentloaded", timeout: 90000 }
    );
    await pageD.waitForURL("**/connexion**", { timeout: 60000 });
    check("D1. E-mail sans compte ni devis → redirection vers /connexion", pageD.url().includes("/connexion"));
    await ctxD.close();
  }

  // ── Vérifications en base ──
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const u = users?.users?.find((x) => x.email?.toLowerCase() === EMAIL);
  check("E1. Compte présent dans Supabase Auth", Boolean(u));
  check("E2. E-mail confirmé", Boolean(u?.email_confirmed_at ?? u?.confirmed_at));
  check("E3. Une connexion enregistrée (last_sign_in_at)", Boolean(u?.last_sign_in_at));
} finally {
  // ── Nettoyage : compte + devis de test ──
  try {
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of users?.users ?? []) {
      if (u.email?.toLowerCase().includes(`e2e-premiere-${stamp}`)) {
        await admin.auth.admin.deleteUser(u.id);
        console.log("🧹 Compte de test supprimé :", u.email);
      }
    }
  } catch (e) {
    console.error("Nettoyage compte :", e?.message ?? e);
  }
  try {
    await admin.from("quotes").delete().eq("customer_email", EMAIL);
    console.log("🧹 Devis de test supprimé");
  } catch (e) {
    console.error("Nettoyage devis :", e?.message ?? e);
  }
  await browser.close();
}

console.log(failures === 0 ? "\n🎉 TOUS LES TESTS PASSENT" : `\n💥 ${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);


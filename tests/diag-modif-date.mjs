// Reproduction du crash « modification de date depuis l'espace client » :
// page /mon-espace/devis/[id] qui affiche « A server error occurred ».
// 1. Devis + compte de test créés en base (comme diag-clic-premiere-connexion).
// 2. Connexion client via le formulaire /connexion.
// 3. Ouverture du devis → demande de modification de date → envoi.
// 4. Capture des erreurs page/JS + état de pending_details en base.
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const PORT = 3313;
const base = `http://localhost:${PORT}`;
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^[\"']|[\"']$/g, "")])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const EMAIL = `e2e-date-${stamp}@test-propulsound.local`;
const PASSWORD = "Test123456!";

// Devis de test : statut attente de signature (modifiable), date connue.
const { data: quote, error: qErr } = await admin
  .from("quotes")
  .insert({
    customer_name: "Test E2E Date",
    customer_email: EMAIL,
    formula_name: "Formule Test E2E",
    formula_price_cents: 100000,
    total_cents: 100000,
    status: "attente_signature",
    event_date: "2026-06-20",
    event_location: "Salle des fêtes Test",
  })
  .select()
  .single();
if (qErr || !quote) {
  console.error("❌ Création devis impossible :", qErr?.message);
  process.exit(1);
}
console.log("Devis créé :", quote.id);

// Compte auth confirmé (connexion directe par mot de passe).
const { data: created, error: uErr } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { name: "Test E2E Date" },
});
if (uErr) {
  console.error("❌ Création compte impossible :", uErr.message);
  await admin.from("quotes").delete().eq("id", quote.id);
  process.exit(1);
}
console.log("Compte créé :", created.user.id);

// Serveur local (dev) avec logs complets — binaire next direct (npx/shell
// indisponibles dans l'environnement d'exécution des tests).
const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const server = spawn(process.execPath, [nextBin, "dev", "-p", String(PORT)], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  stdio: ["ignore", "pipe", "pipe"],
});
const serverLog = [];
server.stdout.on("data", (d) => serverLog.push(d.toString()));
server.stderr.on("data", (d) => serverLog.push(d.toString()));
await new Promise((r) => setTimeout(r, 12000));

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ locale: "fr-FR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("🔥 PAGEERROR:", e.message.slice(0, 300)));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("console.error:", m.text().slice(0, 300));
  });

  // Connexion client.
  await page.goto(`${base}/connexion`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button:has-text("Se connecter")');
  await page.waitForURL(/mon-espace/, { timeout: 30000 }).catch(() => {});
  console.log("Après connexion :", page.url());

  // Page devis.
  const res = await page.goto(`${base}/mon-espace/devis/${quote.id}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  console.log("GET devis →", res?.status());
  await page.waitForTimeout(3000);
  const body1 = await page.locator("body").innerText().catch(() => "?");
  console.log("Texte page :", body1.slice(0, 250).replace(/\n+/g, " | "));

  // Demande de modification de date.
  const summary = page.locator("summary", { hasText: "Demander une modification" });
  if ((await summary.count()) > 0) {
    await summary.click();
    await page.fill('input[name="event_date"]', "2026-07-04");
    await page.click('button:has-text("Envoyer la demande")');
    await page.waitForTimeout(6000);
    const body2 = await page.locator("body").innerText().catch(() => "?");
    console.log("Texte après envoi :", body2.slice(0, 400).replace(/\n+/g, " | "));
    console.log("URL finale :", page.url());
    const crash = /A server error occurred/i.test(body2);
    console.log(crash ? "💥 CRASH REPRODUIT (page d'erreur serveur)" : "✅ Aucun crash visible");
  } else {
    console.log("⚠️ Formulaire de modification introuvable sur la page.");
  }

  // État en base : pending_details enregistré ?
  const { data: check } = await admin.from("quotes").select("pending_details, event_date").eq("id", quote.id).single();
  console.log("pending_details :", JSON.stringify(check?.pending_details));
  console.log("event_date :", check?.event_date);

  if (serverLog.length) {
    console.log("---- LOGS SERVEUR (dernier 3000 car) ----");
    console.log(serverLog.join("").slice(-3000));
  }
} finally {
  server.kill("SIGTERM");
  await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
  await admin.from("quotes").delete().eq("id", quote.id);
  console.log("🧹 Nettoyage fait (compte + devis supprimés)");
  await browser.close();
}

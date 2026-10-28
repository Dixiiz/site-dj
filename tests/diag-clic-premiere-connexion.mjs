// Diagnostic chirurgical du clic « première connexion » en production :
// capture le fragment d'URL (tokens), les erreurs JS, les cookies, les
// requêtes RSC vers /connexion/reinitialiser, et l'état final de la page.
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const base = process.argv[2] ?? "https://www.propulsounddj.fr";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const EMAIL = `e2e-premiere-${stamp}@test-propulsound.local`;
const payload = Buffer.from(JSON.stringify({ email: EMAIL, iat: Date.now() })).toString("base64url");
const signature = createHmac("sha256", env.SUPABASE_SERVICE_ROLE_KEY).update(payload).digest("base64url");
const envelopeUrl = `${base}/connexion/demarrer?q=${encodeURIComponent(`${payload}.${signature}`)}`;

await admin.from("quotes").insert({
  customer_name: "Test E2E Premiere",
  customer_email: EMAIL,
  formula_name: "Formule Test E2E",
  formula_price_cents: 100000,
  total_cents: 100000,
  status: "attente_signature",
});
console.log("Devis créé pour", EMAIL);

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("🔥 PAGEERROR:", e.message.slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") console.log(`console.${m.type()}:`, m.text().slice(0, 200));
  });
  page.on("request", (r) => {
    if (r.url().includes("reinitialiser")) console.log("→ requête:", r.url().slice(0, 130));
  });
  page.on("response", (r) => {
    if (r.url().includes("reinitialiser")) console.log("← réponse:", r.status(), r.url().slice(0, 110));
  });

  await page.goto(envelopeUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  for (let i = 1; i <= 6; i++) {
    await page.waitForTimeout(5000);
    const href = await page.evaluate(() => window.location.href);
    const hasForm = (await page.locator("#password").count()) > 0;
    console.log(`t+${i * 5}s | URL: ${href.slice(0, 160)}`);
    console.log(`        formulaire=${hasForm} | cookies=${(await page.evaluate(() => document.cookie.split(";").filter((c) => c.trim()).map((c) => c.split("=")[0]).join(","))) || "AUCUN"}`);
    if (hasForm) {
      console.log("🎉 FORMULAIRE VISIBLE — le parcours fonctionne");
      break;
    }
  }
  const body = await page.locator("body").innerText().catch(() => "?");
  console.log("--- texte page ---");
  console.log(body.slice(0, 400).replace(/\n+/g, " | "));
} finally {
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (u.email?.includes(`e2e-premiere-${stamp}`)) {
        await admin.auth.admin.deleteUser(u.id);
        console.log("🧹 compte supprimé :", u.email);
      }
    }
  } catch (e) {
    console.error("cleanup:", e?.message ?? e);
  }
  await admin.from("quotes").delete().eq("customer_email", EMAIL);
  console.log("🧹 devis supprimé");
  await browser.close();
}

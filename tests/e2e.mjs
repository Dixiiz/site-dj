// Tests E2E — parcours visiteur du site Propul'Sound DJ.
// Usage : npm run build && npm run test:e2e
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PORT = 3311;
const base = `http://localhost:${PORT}`;
let failures = 0;

function check(label, ok, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

// 1. Démarre le serveur de production local
const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  stdio: "ignore",
});
await new Promise((r) => setTimeout(r, 5000));

const browser = await chromium.launch();
const page = await browser.newPage({ locale: "fr-FR" });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 120)));

try {
  // 2. Toutes les pages publiques répondent 200
  const publicPages = [
    "/",
    "/formules",
    "/disponibilites",
    "/faq",
    "/avis",
    "/contact",
    "/mentions-legales",
    "/connexion",
    "/sur-mesure",
  ];
  for (const p of publicPages) {
    const resp = await page.goto(base + p, { waitUntil: "networkidle" });
    check(`GET ${p}`, resp.status() === 200, `status ${resp.status()}`);
  }

  // 3. Navigation header : liens internes en 200
  await page.goto(base + "/", { waitUntil: "networkidle" });
  const links = await page
    .locator("header a[href^='/']")
    .evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
  for (const l of links) {
    const r = await page.request.get(base + l);
    check(`Lien header ${l}`, r.status() === 200, `status ${r.status()}`);
  }

  // 4. Formulaire de devis : catégorie → pack → préremplissage
  await page.goto(base + "/formules", { waitUntil: "networkidle" });
  const cat = page
    .locator("main button")
    .filter({ hasText: /Anniversaire/i })
    .first();
  if ((await cat.count()) === 0) {
    check("Sélection catégorie", false, "bouton introuvable");
  } else {
    await cat.click({ force: true });
    await page.waitForTimeout(600);
    const card = page
      .locator('[role="button"]')
      .filter({ hasText: "Pack Standard" })
      .first();
    try {
      await card.waitFor({ state: "visible", timeout: 15000 });
    } catch {
      // Nouvelle tentative : le premier clic peut être avalé par le rendu React.
      await cat.click({ force: true });
      await card.waitFor({ state: "visible", timeout: 15000 });
    }
    await card.click({ force: true });
    await page.waitForTimeout(1000);
    const pack = await page
      .locator('input[name="pack_name"]')
      .first()
      .inputValue();
    check("Sélection pack → pack_name", pack === "Pack Standard", pack);
    const start = await page
      .locator('input[name="start_time"]')
      .first()
      .inputValue();
    check("Horaires préremplis", /^\d{2}:\d{2}$/.test(start), start);
  }

  // 5. Pré-remplissage date depuis /disponibilites (?date=)
  await page.goto(base + "/formules?date=2026-08-15", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const dateVal = await page
    .locator('input[name="event_date"]')
    .first()
    .inputValue()
    .catch(() => "");
  check("Date pré-remplie depuis ?date=", dateVal === "2026-08-15", dateVal);

  // 6. Coordonnées client remplissables
  const fill = async (sel, v) => {
    const el = page.locator(sel).first();
    if (await el.count()) {
      await el.fill(v);
      return true;
    }
    return false;
  };
  check(
    "Champs client",
    (await fill('input[name="customer_first_name"]', "Test")) &&
    (await fill('input[name="customer_last_name"]', "E2E")) &&
    (await fill('input[name="customer_email"]', "e2e@example.fr"))
  );

  // 7. Thème : le toggle bascule
  const tb = page
    .locator(
      'button[aria-label*="thème"], button[aria-label*="clair"], button[aria-label*="sombre"]'
    )
    .first();
  const before = await tb.getAttribute("aria-label");
  await tb.click();
  await page.waitForTimeout(300);
  const after = await tb.getAttribute("aria-label");
  check("Toggle thème", before !== after, `${before} → ${after}`);

  // 8. WhatsApp visible, admin protégé
  check(
    "Bouton WhatsApp visible",
    (await page.locator('a[href*="wa.me"]').count()) > 0
  );
  await page.goto(base + "/admin/devis", { waitUntil: "networkidle" });
  check(
    "Admin protégé sans session",
    (await page.locator('input[type="password"]').count()) > 0
  );
  await page.goto(base + "/mon-espace", { waitUntil: "networkidle" });
  check(
    "Mon-espace redirige vers connexion",
    new URL(page.url()).pathname === "/connexion",
    page.url()
  );

  // 9. Aucune erreur React
  check("Aucune erreur JS", pageErrors.length === 0, pageErrors.join(" | "));
} finally {
  await browser.close();
  server.kill();
}

console.log(failures === 0 ? "\n🎉 Tous les tests passent" : `\n💥 ${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);

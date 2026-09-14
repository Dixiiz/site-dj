// Diagnostic : clics sur le tableau de bord admin.
// Usage : node tests/admin-click-diag.mjs (serveur déjà lancé sur :3312)
import { chromium } from "playwright";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const base = "http://localhost:3312";

// Récupère ADMIN_PASSWORD depuis .env.local sans l'afficher.
const env = readFileSync(
  fileURLToPath(new URL("../.env.local", import.meta.url)),
  "utf8",
);
const password = /^ADMIN_PASSWORD=(.*)$/m.exec(env)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!password) {
  console.error("ADMIN_PASSWORD introuvable dans .env.local");
  process.exit(1);
}
const token = createHmac("sha256", password).update("session").digest("hex");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.addCookies([
  { name: "dj_admin", value: token, url: base },
]);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message.slice(0, 150)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("[console] " + m.text().slice(0, 150));
});
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`[HTTP ${r.status()}] ${r.url()}`);
});

await page.goto(base + "/admin", { waitUntil: "networkidle" });

// Connexion via le formulaire si nécessaire
if ((await page.locator('input[type="password"]').count()) > 0) {
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button:has-text("Connexion")').click();
  await page.waitForTimeout(3000);
  console.log("Après login :", page.url());
}

// Diagnostic d'environnement
const diag = await page.evaluate(() => ({
  title: document.title,
  h1: document.querySelector("h1")?.textContent ?? null,
  mains: document.querySelectorAll("main").length,
  links: document.querySelectorAll("a").length,
  bodySnippet: document.body.innerText.slice(0, 200),
}));
console.log("Diag :", JSON.stringify(diag, null, 2));

const cardCount = await page.locator("main a").count();
console.log("Nombre de liens dans <main> :", cardCount);

const cardBtnPre = page.locator("main button", { hasText: "CA SIGNÉ" }).first();
console.log("Carte CA SIGNÉ trouvée (avant test) :", (await cardBtnPre.count()) > 0);

// 2. Tente un vrai clic sur la carte « CA signé » (désormais un <button>)
// et vérifie que le panneau s'ouvre instantanément (sans changer d'URL).
const cardBtn = page.locator("main button", { hasText: "CA SIGNÉ" }).first();
console.log("Carte CA SIGNÉ trouvée :", (await cardBtn.count()) > 0);
const urlBefore = page.url();
await cardBtn.click();
await page.waitForTimeout(800);
console.log("URL inchangée après clic :", page.url() === urlBefore, "→", page.url());
const panelVisible = await page
  .locator("text=détail des événements")
  .first()
  .isVisible()
  .catch(() => false);
console.log("Panneau CA visible :", panelVisible);

// 3. Bouton Modifier (devis du site) dans le panneau
const modifier = page.locator('main button:has-text("Modifier")').first();
console.log("Bouton Modifier présent :", (await modifier.count()) > 0);
if ((await modifier.count()) > 0) {
  await modifier.click({ force: true }).catch((e) => console.log("Clic forcé issu de l'animation :", e.message.slice(0, 60)));
  await page.waitForTimeout(500);
  const formVisible = await page
    .locator('main form input[name="acompte"]')
    .first()
    .isVisible()
    .catch(() => false);
  console.log("Formulaire de modification visible :", formVisible);
}

// 4. Détection de débordement horizontal
await page.goto(base + "/admin", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const overflow = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const bad = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width > vw + 1 || r.right > vw + 1 || r.left < -1) {
      bad.push(
        `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")} → left=${Math.round(r.left)} right=${Math.round(r.right)} w=${Math.round(r.width)}`,
      );
      if (bad.length > 12) break;
    }
  }
  return {
    viewport: vw,
    scrollWidth: document.documentElement.scrollWidth,
    bad,
  };
});
console.log("Débordements /admin :", JSON.stringify(overflow, null, 2));
await browser.close();

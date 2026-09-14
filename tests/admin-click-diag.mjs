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

const firstCard = page.locator('main a[href*="vue="]').first();
console.log("Première carte vue= trouvée :", (await firstCard.count()) > 0);
const box = await firstCard.boundingBox();
console.log("Bounding box carte :", JSON.stringify(box));

const hit = await page.evaluate(({ x, y }) => {
  const el = document.elementFromPoint(x, y);
  const chain = [];
  let cur = el;
  while (cur && chain.length < 5) {
    chain.push(
      `${cur.tagName.toLowerCase()}${cur.className && typeof cur.className === "string" ? "." + cur.className.split(" ").slice(0, 3).join(".") : ""}`,
    );
    cur = cur.parentElement;
  }
  return { hit: el?.tagName, chain };
}, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
console.log("elementFromPoint au centre de la carte :", JSON.stringify(hit));

// 2. Tente un vrai clic et regarde si l'URL change.
await firstCard.click();
await page.waitForTimeout(2500);
console.log("URL après clic :", page.url());

// 3. Clic sur un raccourci
const raccourci = page.locator('main a[href="/admin/messages"]').first();
if ((await raccourci.count()) > 0) {
  await raccourci.click();
  await page.waitForTimeout(2500);
  console.log("URL après clic raccourci messages :", page.url());
} else {
  console.log("Raccourci /admin/messages introuvable sur cette page");
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

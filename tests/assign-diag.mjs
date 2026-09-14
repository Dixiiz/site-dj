// Test E2E attribution rapide des crédits (mutant, revert à la fin).
// Usage : node tests/assign-diag.mjs (serveur sur :3312)
import { chromium } from "playwright";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const base = "http://localhost:3312";
const CREDITS_URL =
  "https://rzhqxygjwvwrfobzxvpq.supabase.co/storage/v1/object/public/site-media/galerie/_credits.json";

const env = readFileSync(fileURLToPath(new URL("../.env.local", import.meta.url)), "utf8");
const password = /^ADMIN_PASSWORD=(.*)$/m.exec(env)?.[1]?.trim().replace(/^["']|["']$/g, "");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`[HTTP ${r.status()}] ${r.url().slice(0, 120)}`);
});
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message.slice(0, 150)));

await page.goto(base + "/admin/medias", { waitUntil: "networkidle" });
if ((await page.locator('input[type="password"]').count()) > 0) {
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button:has-text("Connexion")').click();
  await page.waitForTimeout(3000);
  await page.goto(base + "/admin/medias", { waitUntil: "networkidle" });
}

// Ouvre la section attribution
await page.locator('button:has-text("Attribution rapide par photo")').first().click();
await page.waitForTimeout(500);

// Clique la première photo non attribuée (anneau ambre)
const tile = page.locator('button.ring-amber-500\\/60').first();
console.log("Photos non attribuées visibles :", (await tile.count()) > 0);
if ((await tile.count()) === 0) {
  console.log("Aucune photo non attribuée — test impossible");
  await browser.close();
  process.exit(0);
}
await tile.click();
await page.waitForTimeout(500);

// Remplit le photographe + lieu et enregistre
await page.locator('input[placeholder*="Photographe"]').fill("Test Diag Auto");
await page.locator('input[placeholder*="Lieu"]').fill("Testville");
await page.locator('button:has-text("Enregistrer cette photo")').click();
await page.waitForTimeout(4000);

// Vérifie le toast et le fichier crédits
const toastText = await page.locator("[data-sonner-toast]").first().innerText().catch(() => "(aucun toast)");
console.log("Toast :", toastText.replace(/\n/g, " | "));

const credits = await (await fetch(CREDITS_URL)).json();
const hasPh = Object.keys(credits.photographers || {}).includes("Test Diag Auto");
const hasLieu = Object.keys(credits.lieux || {}).includes("Testville");
console.log("Photographe « Test Diag Auto » dans le fichier :", hasPh);
console.log("Lieu « Testville » dans le fichier :", hasLieu);

// Revert : l'éditeur est encore ouvert sur la même photo — on vide les champs
await page.locator('input[placeholder*="Photographe"]').fill("");
await page.locator('input[placeholder*="Lieu"]').fill("");
await page.locator('button:has-text("Enregistrer cette photo")').click();
await page.waitForTimeout(4000);
const credits2 = await (await fetch(CREDITS_URL + "?v=" + Date.now())).json();
console.log("Revert OK :", !Object.keys(credits2.photographers || {}).includes("Test Diag Auto"));

console.log("Erreurs réseau/JS :", errors.length ? errors : "aucune");
await browser.close();

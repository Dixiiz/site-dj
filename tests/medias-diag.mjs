// Diagnostic page admin /medias : grille d'assignation des photos.
// Usage : node tests/medias-diag.mjs (serveur déjà lancé sur :3312)
import { chromium } from "playwright";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const base = "http://localhost:3312";
const env = readFileSync(fileURLToPath(new URL("../.env.local", import.meta.url)), "utf8");
const password = /^ADMIN_PASSWORD=(.*)$/m.exec(env)?.[1]?.trim().replace(/^["']|["']$/g, "");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

await page.goto(base + "/admin/medias", { waitUntil: "networkidle" });
if ((await page.locator('input[type="password"]').count()) > 0) {
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button:has-text("Connexion")').click();
  await page.waitForTimeout(3000);
  await page.goto(base + "/admin/medias", { waitUntil: "networkidle" });
}

// Crée un photographe de test puis ouvre sa grille d'assignation
const input = page.locator('input[placeholder*="photographe"]');
if ((await input.count()) > 0) {
  await input.fill("Test Diag");
  await page.locator('button:has-text("+ Créer")').first().click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("+ Photos")').first().click();
  await page.waitForTimeout(500);
} else {
  console.log("Champ photographe introuvable");
}

// Détecte les chevauchements dans la grille d'assignation
const overlap = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll("button")].filter((b) =>
    b.querySelector("img") && b.className.includes("h-20")
  );
  const rects = buttons.map((b) => ({ r: b.getBoundingClientRect(), cls: b.className.slice(0, 30) }));
  const overlaps = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i].r, b = rects[j].r;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 2 && h > 2) overlaps.push({ i, j, w: Math.round(w), h: Math.round(h) });
    }
  }
  return {
    count: rects.length,
    sample: rects.slice(0, 4).map((x) => ({ w: Math.round(x.r.width), h: Math.round(x.r.height), x: Math.round(x.r.x), y: Math.round(x.r.y) })),
    overlaps: overlaps.slice(0, 6),
  };
});
console.log(JSON.stringify(overlap, null, 2));

await page.screenshot({ path: "/tmp/medias-diag.png", fullPage: false });
console.log("Capture : /tmp/medias-diag.png");
await browser.close();

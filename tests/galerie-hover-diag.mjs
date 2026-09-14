// Test : hover sur une photo créditée de /galerie
// Usage : node tests/galerie-hover-diag.mjs (serveur sur :3312)
import { chromium } from "playwright";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const base = "http://localhost:3312";
const env = readFileSync(fileURLToPath(new URL("../.env.local", import.meta.url)), "utf8");
const password = /^ADMIN_PASSWORD=(.*)$/m.exec(env)?.[1]?.trim().replace(/^["']|["']$/g, "");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addCookies([{ name: "dj_admin", value: createHmac("sha256", password).update("session").digest("hex"), url: base }]);
const page = await context.newPage();

await page.goto(base + "/galerie", { waitUntil: "networkidle" });
const figures = page.locator("figure");
const n = await figures.count();
console.log("Figures :", n);

// Cherche une figure avec figcaption (photo créditée)
for (let i = 0; i < n; i++) {
  const fig = figures.nth(i);
  if ((await fig.locator("figcaption").count()) > 0) {
    const before = await fig.locator("figcaption").evaluate((el) => getComputedStyle(el).opacity);
    await fig.hover();
    await page.waitForTimeout(600);
    const after = await fig.locator("figcaption").evaluate((el) => getComputedStyle(el).opacity);
    const text = await fig.locator("figcaption").innerText();
    console.log(`Figure ${i} (${text}) : opacité avant=${before} après hover=${after}`);
    break;
  }
}
await browser.close();

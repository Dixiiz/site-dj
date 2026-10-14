// Diag formulaire de devis : hauteur/typo des champs sur iPhone 390px.
// Usage : node tests/form-diag.mjs [chemin] (serveur sur :3312)
import { chromium } from "playwright";

const path = process.argv[2] ?? "/formules";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
await page.goto(`http://localhost:3312${path}`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(800);
const rows = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("input, select, textarea, button")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    out.push(
      `${el.tagName.toLowerCase()}${el.type ? `[${el.type}]` : ""} — h=${Math.round(r.height)}px, fs=${getComputedStyle(el).fontSize} — « ${(el.placeholder || el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)} »`
    );
  }
  return out;
});
console.log(`──── ${path} (${rows.length} éléments) ────`);
rows.forEach((r) => console.log(r));
await browser.close();
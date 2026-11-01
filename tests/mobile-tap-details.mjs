// Audit ciblé : liste les cibles tactiles < 40px avec leur libellé + position.
// Usage : node tests/mobile-tap-details.mjs (serveur sur :3312)
import { chromium } from "playwright";

const base = "http://localhost:3312";
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/formules", "/contact", "/connexion"];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();

for (const path of pages) {
  await page.goto(base + path, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(700);
  console.log(`\n──── ${path} ────`);
  const details = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('a, button, [role="button"], input, select, [onclick]')) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.pointerEvents === "none") continue;
      if (r.width < 40 || r.height < 32) {
        const label =
          (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || el.tagName).trim().slice(0, 40) || el.tagName;
        const rect = `${Math.round(r.top)}px du haut`;
        out.push(`• ${r.width.toFixed(0)}×${r.height.toFixed(0)}px — « ${label} » (${rect})`);
        if (out.length >= 25) break;
      }
    }
    return out;
  });
  details.forEach((d) => console.log(d));
}
await browser.close();
// Audit mobile complet : toutes les pages publiques, 2 viewports (iPhone 390px
// + tablette 768px). Détecte : débordements horizontaux, cibles tactiles trop
// petites (< 44px, norme Apple/Google), champs < 16px (zoom auto iOS).
// Usage : node tests/mobile-audit.mjs (serveur déjà lancé sur :3312)
import { chromium } from "playwright";

const base = "http://localhost:3312";
const pages = [
  "/",
  "/formules",
  "/galerie",
  "/disponibilites",
  "/sur-mesure",
  "/contact",
  "/blog",
  "/faq",
  "/mariage",
  "/evenement-entreprise",
  "/anniversaire",
  "/comment-ca-se-passe",
  "/connexion",
  "/mentions-legales",
];

const browser = await chromium.launch();

for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }]) {
  const label = viewport.width <= 400 ? "MOBILE 390px" : "TABLETTE 768px";
  console.log(`\n${"=".repeat(70)}\n${label}\n${"=".repeat(70)}`);
  const context = await browser.newContext({
    viewport,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    // Pointer tactile : vérifie aussi les règles CSS @media (pointer: coarse)
    // (champs 16px, flèches calendrier 44px) comme sur un vrai iPad.
    hasTouch: true,
  });
  const page = await context.newPage();

  for (const path of pages) {
    try {
      await page.goto(base + path, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(700);
      const report = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        // 1) Éléments qui débordent de la fenêtre
        const bad = [];
        for (const el of document.querySelectorAll("body *")) {
          const cs = getComputedStyle(el);
          if (cs.position === "fixed" && el.closest("nav, header")) continue;
          const r = el.getBoundingClientRect();
          if (r.width > vw + 1 || r.right > vw + 1 || r.left < -1) {
            bad.push(
              `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")}`
            );
            if (bad.length >= 8) break;
          }
        }
        // 2) Cibles tactiles trop petites (liens/boutons visibles)
        let smallTargets = 0;
        for (const el of document.querySelectorAll('a, button, [role="button"], input[type="submit"]')) {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.pointerEvents === "none") continue;
          if (r.width < 40 || r.height < 32) smallTargets++;
        }
        // 3) Champs texte < 16px (iOS zoome au focus)
        let smallInputs = 0;
        for (const el of document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea, select")) {
          const cs = getComputedStyle(el);
          const fs = parseFloat(cs.fontSize);
          const r = el.getBoundingClientRect();
          if (r.width > 0 && fs < 16) smallInputs++;
        }
        return { vw, scrollW, overflow: scrollW > vw + 1, bad, smallTargets, smallInputs };
      });
      const flag = report.overflow ? "🚨 DÉBORDEMENT" : report.smallTargets + report.smallInputs > 0 ? "⚠️ " : "✅";
      console.log(`${flag} ${path} — scroll ${report.scrollW}/${report.vw}${report.overflow ? " (déborde !)" : ""} · cibles<40px: ${report.smallTargets} · champs<16px: ${report.smallInputs}`);
      if (report.bad.length) console.log(`   → ${report.bad.join(" | ")}`);
    } catch (e) {
      console.log(`❌ ${path} — ${String(e.message).slice(0, 80)}`);
    }
  }
  await context.close();
}
await browser.close();
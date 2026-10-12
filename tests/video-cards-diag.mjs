// Capture visuelle de la catégorie mariage (suggestion douce + encarts).
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const PORT = 3315;
const base = `http://localhost:${PORT}`;
const server = spawn("npx", ["next", "start", "-p", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 7000));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 }, locale: "fr-FR" });
try {
  await page.goto(`${base}/formules`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Mariages & Grandes Réceptions/ }).click();
  await page.waitForTimeout(2000);
  const grille = page.locator("text=/Inclus dans toutes les formules/").first();
  const box = await grille.boundingBox();
  await page.screenshot({
    path: "tests/packs-rendu.png",
    clip: { x: 0, y: Math.max(0, (box?.y ?? 400) - 1250), width: 1280, height: 1350 },
  });
  console.log("Capture OK");
} catch (e) {
  console.log("ERREUR:", String(e).slice(0, 300));
}
await browser.close();
server.kill();
process.exit(0);



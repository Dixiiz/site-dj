// Capture visuelle de la catégorie mariage (cartes + tableau intégré).
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const PORT = 3316;
const base = `http://localhost:${PORT}`;
const server = spawn("npx", ["next", "start", "-p", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 7000));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1500 }, locale: "fr-FR" });
try {
  await page.goto(`${base}/formules`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Mariages & Grandes Réceptions/ }).click();
  await page.waitForTimeout(2000);
  // Capture 1 : rien de sélectionné (ligne « Indécis » visible, pas d'encart)
  const ancre = page.locator("text=/Inclus dans toutes les formules/").first();
  const box = await ancre.boundingBox();
  await page.screenshot({
    path: "tests/packs-rendu.png",
    clip: { x: 0, y: Math.max(0, (box?.y ?? 500) - 1350), width: 1280, height: 1420 },
  });
  console.log("Capture 1 OK (sans sélection)");
  // Capture 2 : pack Essential sélectionné → suggestion upsell sous le bloc
  await page.locator('[role="button"]', { hasText: "Pack Essential" }).first().click();
  await page.waitForTimeout(800);
  const box2 = await ancre.boundingBox();
  await page.screenshot({
    path: "tests/packs-rendu-2.png",
    clip: { x: 0, y: Math.max(0, (box2?.y ?? 500) - 1350), width: 1280, height: 1420 },
  });
  console.log("Capture 2 OK (Essential sélectionné)");
} catch (e) {
  console.log("ERREUR:", String(e).slice(0, 300));
}
await browser.close();
server.kill();
process.exit(0);




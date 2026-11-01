// Capture visuelle + contrôle des couleurs du tableau (local ET prod).
import { chromium } from "playwright";
import { spawn } from "node:child_process";

// Passer l'URL cible en argument : node tests/video-cards-diag.mjs https://www.propulsounddj.fr
const target = process.argv[2] ?? null;
const PORT = 3316;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1500 }, locale: "fr-FR" });
try {
  // Local : on démarre le serveur et on attend qu'il soit prêt.
  const server = target ? null : spawn("npx", ["next", "start", "-p", String(PORT)], { stdio: "ignore" });
  if (server) await new Promise((r) => setTimeout(r, 7000));
  const url = target ?? `http://localhost:${PORT}`;
  process.on("exit", () => server?.kill());
  await page.goto(`${url}/formules`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Mariages & Grandes Réceptions/ }).click();
  await page.waitForTimeout(2500);

  // Contrôle des couleurs : pour chaque ligne du tableau (enfants directs du
  // conteneur space-y-2), quelles cellules sont dorées (texte OU fond) ?
  const rows = ["Lyres Beam", "Lyres Spot", "Bars LED", "PAR LED", "Machines à fumée"];
  for (const label of rows) {
    const row = page
      .locator("div.space-y-2 > div")
      .filter({ has: page.locator(`span:text-is("${label}")`) })
      .first();
    const cells = await row.locator(":scope > div:not(:first-child)").all();
    const marks = [];
    for (const [i, cell] of cells.entries()) {
      const cls = (await cell.getAttribute("class")) ?? "";
      const txt = ((await cell.locator("span").first().textContent()) ?? "").trim();
      const kind = cls.includes("bg-yellow-500")
        ? "DORÉ"
        : cls.includes("bg-green-500")
          ? "vert"
          : "neutre";
      marks.push(`col${i}[${txt}]=${kind}`);
    }
    console.log(`${label} → ${marks.join(" | ")}`);
  }
  const ancre = page.locator("text=/Inclus dans toutes les formules/").first();
  const box = await ancre.boundingBox();
  await page.screenshot({
    path: "tests/packs-rendu.png",
    clip: { x: 0, y: Math.max(0, (box?.y ?? 500) - 1350), width: 1280, height: 1420 },
  });
  console.log(target ? "Capture prod OK" : "Capture locale OK");
} catch (e) {
  console.log("ERREUR:", String(e).slice(0, 300));
}
await browser.close();
process.exit(0);





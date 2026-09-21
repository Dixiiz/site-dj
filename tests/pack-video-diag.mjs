// Diagnostic — effet « photo live » de la vidéo du Pack Deluxe (/formules).
// Vérifie : figée au repos → joue au survol → se fige sur la dernière image
// (pas de boucle) → rejoue depuis le début à chaque nouveau survol.
// Usage : node tests/pack-video-diag.mjs (nécessite npm run build avant).
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PORT = 3312;
const base = `http://localhost:${PORT}`;
let failures = 0;

function check(label, ok, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  stdio: "ignore",
});
await new Promise((r) => setTimeout(r, 6000));

const browser = await chromium.launch();
const page = await browser.newPage({ locale: "fr-FR" });

try {
  await page.goto(`${base}/formules`, { waitUntil: "networkidle" });

  // Étape 1 : ouvrir la catégorie mariage
  await page.getByRole("button", { name: /Mariages & Grandes Réceptions/ }).click();
  const card = page.locator('[role="button"]', { hasText: "Pack Deluxe" }).first();
  await card.waitFor({ state: "visible", timeout: 10000 });
  const video = card.locator("video[data-pack-video]");

  // Étape 2 : la vidéo est bien là, sans ancienne photo en poster, sans boucle
  check("Vidéo présente sur la carte Deluxe", (await video.count()) === 1);
  const attrs = await video.evaluate((v) => ({
    src: v.getAttribute("src"),
    poster: v.getAttribute("poster"),
    loop: v.hasAttribute("loop"),
  }));
  check("Source vidéo = /videos/packs/deluxe.mp4", attrs.src === "/videos/packs/deluxe.mp4", attrs.src ?? "");
  check("Ancienne photo absente du visuel", (attrs.poster ?? "").includes("/videos/packs/deluxe.jpg"), `poster=${attrs.poster ?? "aucun"}`);
  check("Pas d'attribut loop (se fige à la fin)", !attrs.loop);

  // Étape 3 : au repos, rien ne joue, et la vidéo est bien le calque visible
  // (on attend que la première image soit décodée → fondu depuis la photo floutée)
  await page.waitForFunction(
    () => {
      const v = document.querySelector("video[data-pack-video]");
      return v && getComputedStyle(v).opacity === "1";
    },
    { timeout: 10000 }
  );
  const idle = await video.evaluate((v) => ({
    paused: v.paused,
    t: v.currentTime,
    opacity: getComputedStyle(v).opacity,
    filter: getComputedStyle(v).filter,
  }));
  check("Figée au repos (pas de lecture)", idle.paused && idle.t === 0, `paused=${idle.paused}, t=${idle.t}`);
  check("Vidéo visible en permanence (première image affichée)", idle.opacity === "1", `opacity=${idle.opacity}`);
  check("Pas de flou au repos", !idle.filter.includes("blur(") || /blur\(0px\)/.test(idle.filter), idle.filter);

  // Étape 4 : survol → la lecture démarre
  await card.hover();
  await page.waitForTimeout(1200);
  const playing = await video.evaluate((v) => ({ paused: v.paused, t: v.currentTime }));
  check("Joue au survol", !playing.paused && playing.t > 0.3, `paused=${playing.paused}, t=${playing.t.toFixed(2)}`);

  // Étape 5 : elle va jusqu'au bout puis se fige (événement « ended »)
  await video.evaluate(
    (v) =>
      new Promise((resolve) => {
        if (v.ended) return resolve(true);
        v.addEventListener("ended", () => resolve(true), { once: true });
        setTimeout(() => resolve(v.ended), 20000);
      })
  );
  await page.waitForTimeout(300);
  const end = await video.evaluate((v) => ({ paused: v.paused, ended: v.ended, t: v.currentTime, d: v.duration }));
  check(
    "Se fige sur la dernière image",
    end.ended && end.paused && end.t >= end.d - 0.6,
    `t=${end.t.toFixed(2)}s / durée=${end.d.toFixed(2)}s, paused=${end.paused}`
  );

  // Étape 6 : souris partie → toujours figée à la fin (pas de remise à zéro)
  await page.mouse.move(5, 5);
  await page.waitForTimeout(700);
  const afterLeave = await video.evaluate((v) => ({ paused: v.paused, t: v.currentTime }));
  check(
    "Reste figée après sortie de la souris",
    afterLeave.paused && afterLeave.t >= end.d - 0.6,
    `paused=${afterLeave.paused}, t=${afterLeave.t.toFixed(2)}`
  );

  // Étape 7 : nouveau survol → rejoue depuis le début, sans aucun flou
  // (l'affiche = première image de la vidéo, donc aucune cassure visible)
  await card.hover();
  await page.waitForTimeout(900);
  const replay = await video.evaluate((v) => ({
    paused: v.paused,
    t: v.currentTime,
    filter: getComputedStyle(v).filter,
  }));
  check(
    "Nouveau survol → rejoue depuis le début, sans flou",
    !replay.paused &&
      replay.t < 1.5 &&
      (!replay.filter.includes("blur(") || /blur\(0px\)/.test(replay.filter)),
    `paused=${replay.paused}, t=${replay.t.toFixed(2)}, filter=${replay.filter}`
  );
} catch (error) {
  check("Diagnostic photo live Pack Deluxe", false, String(error).slice(0, 160));
} finally {
  await browser.close();
  server.kill();
}

process.exit(failures > 0 ? 1 : 0);

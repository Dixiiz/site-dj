// Soumission IndexNow (Bing, Yandex, Seznam…) : prévient instantanément les
// moteurs partenaires que les pages existent et doivent être crawllées.
// Google n'utilise PAS IndexNow, mais cela accélère l'indexation ailleurs
// et peut créer des premiers backlinks/signaux.
// Usage : node scripts/indexnow-ping.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SITE_URL = "https://www.propulsounddj.fr";

// La clé = nom du fichier texte présent dans /public (validation de propriété).
const publicDir = join(process.cwd(), "public");
const keyFile = readdirSync(publicDir).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error("Fichier de clé IndexNow introuvable dans public/ (format : <32 hex>.txt)");
  process.exit(1);
}
const key = keyFile.replace(".txt", "");
console.log("Clé :", key);

const sitemap = await (await fetch(`${SITE_URL}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log(`${urls.length} URLs trouvées dans le sitemap.`);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: "www.propulsounddj.fr",
    key,
    keyLocation: `${SITE_URL}/${keyFile}`,
    urlList: urls,
  }),
});
console.log("Réponse IndexNow :", res.status, res.ok ? "✓ soumis" : "✗ erreur");

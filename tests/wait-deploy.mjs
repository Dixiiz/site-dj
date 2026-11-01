// Attend le déploiement Vercel du correctif RecoveryHashHandler : le nouveau
// code contient le marqueur « ?_r= » (paramètre anti-cache) absent de l'ancien.
import fs from "node:fs";

const SITE = "https://www.propulsounddj.fr";
const deadline = Date.now() + 20 * 60 * 1000;

while (Date.now() < deadline) {
  try {
    const html = await (await fetch(SITE, { redirect: "follow" })).text();
    const urls = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => SITE + m[1]);
    for (const u of urls) {
      const src = await (await fetch(u)).text();
      if (src.includes("connexion/reinitialiser")) {
        const deploy = src.includes("?_r=");
        console.log(new Date().toISOString(), u.split("/").pop(), deploy ? "NOUVEAU CODE EN LIGNE" : "ancien code");
        if (deploy) {
          fs.writeFileSync("/tmp/deploy-ok", "1");
          process.exit(0);
        }
      }
    }
  } catch (e) {
    console.log("erreur", e.message);
  }
  await new Promise((r) => setTimeout(r, 30000));
}
console.log("TIMEOUT_ATTENTE_DEPLOIEMENT");
process.exit(1);

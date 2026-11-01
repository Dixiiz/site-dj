// Sonde de déploiement + vérification de la page /admin/comptes en production :
// attend que le nouveau rendu « cartes » soit en ligne, puis vérifie qu'il n'y
// a plus de tableau à scroll (min-w) et que les boutons sont présents.
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";

const SITE = "https://www.propulsounddj.fr";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);
// Même formule que les tests Playwright : dj_admin = HMAC-SHA256(mdp, "session")
const cookie = `dj_admin=${createHmac("sha256", env.ADMIN_PASSWORD).update("session").digest("hex")}`;
const deadline = Date.now() + 20 * 60 * 1000;

while (Date.now() < deadline) {
  try {
    const res = await fetch(`${SITE}/admin/comptes`, {
      headers: { cookie },
      redirect: "manual",
    });
    if (res.status !== 200) {
      console.log(new Date().toISOString(), `status=${res.status} → cookie admin refusé ou redirection`);
      await new Promise((r) => setTimeout(r, 30000));
      continue;
    }
    const html = await res.text();
    const nouveau = html.includes("Jamais connecté") && html.includes("Créé le");
    const ancien = html.includes("min-w-[720px]");
    console.log(new Date().toISOString(), `nouveau=${nouveau} ancien_tableau=${ancien}`);
    if (nouveau && !ancien) {
      const nbSupprimer = (html.match(/>Supprimer</g) ?? []).length;
      const nbAcces = (html.match(/(Envoyer|Renvoyer) un accès/g) ?? []).length;
      console.log(`DEPLOY_OK — boutons Supprimer: ${nbSupprimer}, boutons Accès: ${nbAcces}`);
      process.exit(0);
    }
  } catch (e) {
    console.log("erreur", e.message);
  }
  await new Promise((r) => setTimeout(r, 30000));
}
console.log("TIMEOUT_ATTENTE_DEPLOIEMENT");
process.exit(1);

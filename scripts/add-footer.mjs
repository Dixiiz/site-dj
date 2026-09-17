import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = "src/app";
const SKIP = ["admin", "mon-espace", "api", "connexion", "hors-ligne", "paiement"];

function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP.includes(e.name)) walk(p);
    } else if (e.name === "page.tsx") processFile(p);
  }
}

function processFile(p) {
  let src = readFileSync(p, "utf8");
  if (src.includes("SiteFooter")) { console.log("déjà ok :", p); return; }
  if (!src.includes("<SiteHeader />")) { console.log("pas de SiteHeader :", p); return; }

  // 1. Import après l'import SiteHeader
  src = src.replace(
    /(import \{ SiteHeader \} from "@\/components\/site-header";)/,
    `$1\nimport { SiteFooter } from "@/components/site-footer";`
  );

  // 2. Remplacer le <footer>…</footer> existant par <SiteFooter />, sinon
  //    insérer <SiteFooter /> juste avant la balise fermante du fragment.
  const footerRe = /<footer[\s\S]*?<\/footer>/;
  if (footerRe.test(src)) {
    src = src.replace(footerRe, "<SiteFooter />");
  } else {
    src = src.replace(/\n    <\/>\n  \);/, "\n      <SiteFooter />\n    </>\n  );");
  }

  writeFileSync(p, src);
  console.log("OK :", p);
}

walk(root);

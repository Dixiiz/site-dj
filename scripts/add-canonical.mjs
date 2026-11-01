import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = "src/app";
const SKIP = ["admin", "mon-espace", "api", "connexion", "hors-ligne", "paiement", "merci"];

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
  if (/canonical/i.test(src)) { console.log("skip :", p); return; }
  const m = src.match(/export const metadata(?::\s*Metadata)?\s*=\s*\{/);
  if (!m) { console.log("pas de metadata :", p); return; }
  const rel = p.slice(root.length + 1).replace(/\\/g, "/").replace(/\/page\.tsx$/, "");
  const route = rel === "" || rel === "." ? "/" : `/${rel}`;
  const insert = m.index + m[0].length;
  src = src.slice(0, insert) + `\n  alternates: { canonical: "${route}" },` + src.slice(insert);
  writeFileSync(p, src);
  console.log("OK :", p, "→", route);
}

walk(root);

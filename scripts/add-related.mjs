import { readFileSync, writeFileSync } from "node:fs";

const pages = [
  ["src/app/blog/choisir-dj-mariage-blois/page.tsx", "/blog/choisir-dj-mariage-blois"],
  ["src/app/blog/playlist-mariage-2026/page.tsx", "/blog/playlist-mariage-2026"],
  ["src/app/blog/dj-ou-playlist-spotify/page.tsx", "/blog/dj-ou-playlist-spotify"],
];

for (const [file, slug] of pages) {
  let src = readFileSync(file, "utf8");
  if (src.includes("RelatedArticles")) { console.log("déjà ok :", file); continue; }
  src = src.replace(
    /(import \{ SiteFooter \} from "@\/components\/site-footer";)/,
    `$1\nimport { RelatedArticles } from "@/components/related-articles";`
  );
  src = src.replace(
    /(\n      <\/main>)/,
    `\n        <RelatedArticles current="${slug}" />$1`
  );
  writeFileSync(file, src);
  console.log("OK :", file);
}

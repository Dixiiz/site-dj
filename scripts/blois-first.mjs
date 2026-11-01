// Remplace Huisseau-sur-Cosson par "Blois (Huisseau-sur-Cosson)" aux endroits
// visibles et SEO. Usage : node scripts/blois-first.mjs
import { readFileSync, writeFileSync } from "node:fs";

const fix = (f, pairs) => {
  let s = readFileSync(f, "utf8");
  for (const [a, b] of pairs) {
    if (s.includes(a)) s = s.split(a).join(b);
    else console.log("INTROUVABLE dans", f, ":", a.slice(0, 60));
  }
  writeFileSync(f, s);
  console.log("OK", f);
};

fix("src/app/page.tsx", [
  ["DJ professionnel basé à Huisseau-sur-Cosson :", "DJ professionnel basé à Blois (Huisseau-sur-Cosson, 41350) :"],
]);
fix("src/app/manifest.ts", [
  ["DJ professionnel basé à Huisseau-sur-Cosson :", "DJ professionnel basé à Blois (Huisseau-sur-Cosson, 41350) :"],
]);
fix("src/app/faq/page.tsx", [
  ["Nous sommes basés à Huisseau-sur-Cosson, à proximité de Blois (Loir-et-Cher).", "Nous sommes basés à Blois (Huisseau-sur-Cosson, Loir-et-Cher)."],
]);
fix("src/app/mariage/page.tsx", [
  ["Basé à Huisseau-sur-Cosson, Propul", "Basés à Blois (Huisseau-sur-Cosson), Propul"],
]);
fix("src/components/quote-booking-form.tsx", [
  ["30 km offerts autour de Huisseau-sur-Cosson", "30 km offerts autour de Blois"],
]);
fix("src/app/not-found.tsx", [
  ["Huisseau-sur-Cosson (41350)", "Blois (Huisseau-sur-Cosson, 41350)"],
]);

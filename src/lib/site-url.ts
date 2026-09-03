// URL canonique du site (pour SEO : sitemap, robots, données structurées).
// Surcharger avec NEXT_PUBLIC_SITE_URL si le domaine change.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.propulsounddj.fr"
).replace(/\/$/, "");

export const SITE_NAME = "Propul'Sound DJ";

export const INTERVENTION_ZONES = [
  "Blois",
  "Vendôme",
  "La Ferté-Bernard",
  "Morée",
  "Huisseau-sur-Cosson",
  "Loir-et-Cher",
  "Loir-et-Eure",
  "Sarthe",
] as const;

// Catalogue des options FX — module NEUTRE (sans « use client ») : importable
// à la fois depuis les composants clients (pricing-section) et les composants
// serveur (pages admin) sans passer par une frontière client.
export const FX_CATALOG = [
  {
    name: "Nuage de fumée lourde",
    detail: "Heavyfog 2000p — tapis de fumée au sol, idéal ouverture de bal.",
    price: 15000,
    badge: "Idéal ouverture de bal",
    image: "/images/fx/fumee.jpg",
    video: "/videos/fx/fumee.mp4",
  },
  {
    name: "Étincelles froides",
    detail: "Pack de 2 machines, gerbes jusqu'à 5 m — inodore et sécurisé.",
    price: 15000,
    badge: "Inodore & sécurisé",
    image: "/images/fx/etincelles.jpg",
    video: "/videos/fx/etincelles.mp4",
  },
  {
    name: "Pistolet à fumée effet CO2",
    detail: "Jet de fumée glacée jusqu'à 9 mètres — pour vos plus belles entrées en salle ou vos plus beaux shows.",
    price: 7500,
    badge: "Prix promo : au lieu de 150 €",
    image: "/images/fx/co2.jpg",
    video: "/videos/fx/co2.mp4",
  },
] satisfies {
  name: string;
  detail: string;
  price: number;
  badge: string;
  image: string;
  video?: string;
}[];

export const ADMIN_FX_OPTIONS = FX_CATALOG.map((option) => ({
  name: option.name,
  price: option.price,
}));

// Normalisation : minuscules sans accents, pour comparer les libellés
// historiques (« Machine à fumée lourde ») au catalogue actuel
// (« Nuage de fumée lourde ») sans jamais les confondre avec des suppléments.
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Retire un suffixe de quantité : « × 2 », « x 2 », « x12 »…
function stripQty(name: string): string {
  return name.replace(/\s*[×x]\s*\d+\s*$/i, "").trim();
}

// Mots-clés du catalogue recherchés dans les libellés historiques :
// « co2 » → Pistolet CO2 ; « fumée lourde » couvre à la fois
// « Nuage de fumée lourde » et « Machine à fumée lourde » ;
// « étincelles » → Étincelles froides.
const FX_MATCHERS = ["co2", "fumee lourde", "etincelles"];

// Retrouve l'option du catalogue correspondant à un libellé stocké en base
// (nom actuel, ancien libellé, ou variante multi-quantité), ou null si c'est
// une ligne supplémentaire manuelle.
export function findFxOption(
  name?: string | null
): { name: string; price: number } | null {
  if (!name) return null;
  const n = stripQty(normalize(name));
  if (!n) return null;
  // Correspondance exacte ou préfixe du nom de catalogue (variante quantité).
  const exact = ADMIN_FX_OPTIONS.find((f) => {
    const fn = normalize(f.name);
    return n === fn || fn.startsWith(n);
  });
  if (exact) return exact;
  // Libellés historiques : mot-clé du catalogue présent dans le libellé.
  const keyword = FX_MATCHERS.find((k) => n.includes(k));
  if (!keyword) return null;
  return ADMIN_FX_OPTIONS.find((f) => normalize(f.name).includes(keyword)) ?? null;
}

// Une ligne d'un devis est une option du catalogue (nom actuel, ancien
// libellé ou variante quantité) ; tout le reste est une ligne supplémentaire
// manuelle (libellé + montant libres).
export function isFxOption(name?: string | null): boolean {
  return findFxOption(name) != null;
}
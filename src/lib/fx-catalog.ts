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

// Une ligne d'un devis est une option du catalogue si son nom correspond
// exactement, ou à sa variante multi-quantité (« Nom × 2 »). Tout le reste
// est une ligne supplémentaire manuelle (libellé + montant libres).
export function isFxOption(name?: string | null): boolean {
  if (!name) return false;
  return ADMIN_FX_OPTIONS.some(
    (f) => name === f.name || name.startsWith(`${f.name} ×`)
  );
}
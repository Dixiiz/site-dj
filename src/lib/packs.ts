// Catalogue des packs (données pures, partagées client/serveur).
// ATTENTION : ce module ne contient AUCUN code UI. Les constantes ici sont
// importées à la fois par des composants clients (pricing-section, éditeurs
// admin) et par des modules serveur (actions, client-actions). Les valeurs
// définies dans un composant « use client » (pricing-section.tsx) ne sont PAS
// lisibles côté serveur (l'import renvoie des références client, pas les
// données) : tout ce qui est consommé par une server action doit vivre ici.
export type Pack = {
  name: string;
  price: number; // centimes
  highlight?: "populaire" | "show";
  /** Argument commercial court : ce que le client vit concrètement avec ce pack. */
  tagline?: string;
  /** Preuve sociale chiffrée (ex : « Choisi par 7 mariages sur 10 en 2025 »). */
  socialProof?: string;
  equipment: string[];
  image: string; // aperçu scénographie (remplaçable via public/images/packs/) — sert aussi de poster pour la vidéo
  video?: string; // aperçu animé « photo live » : figé, se joue au survol jusqu'à la dernière image puis se refige
  baseMinutes: number; // durée de prestation incluse dans le prix de base
  extraRateCents: number; // tarif horaire au-delà de la base
  defaultStart: string;
  defaultEnd: string;
};

export type Category = {
  id: string;
  label: string;
  intro: string;
  image: string;
  baseNote: string;
  extraHourLabel: string;
  common: string[];
  packs: Pack[];
};

export const CATEGORIES: Category[] = [
  {
    id: "anniversaire",
    label: "Anniversaires & Soirées privées",
    image: "/images/packs/1.jpg",
    intro:
 "Une soirée clé en main chez vous ou en salle : installation, mix et lumière synchronisée pendant toute la durée de votre événement.",
    baseNote: "Base : minimum 6 h de mix + forfait installation 100 € (base fixe 580 €).",
    extraHourLabel: "Heure supplémentaire : 80 €/h",
    common: [
 "Sono Audiophony Modjo2000 (jusqu'à 250 personnes)",
 "Éclairage 100 % synchronisé en temps réel avec la musique",
    ],
    packs: [
      {
        name: "Pack Standard",
        price: 58000,
        tagline:
          "Le strict minimum : le dancefloor s'anime, mais la salle autour reste sombre.",
        image: "/images/packs/standard.jpg",
        baseMinutes: 360,
        extraRateCents: 8000,
        defaultStart: "20:00",
        defaultEnd: "02:00",
        equipment: [
 "2 Lyres Beam (monotubes)",
 "2 Bars LED",
 "2 Machines à fumée effet Geyser",
        ],
      },
      {
        name: "Pack Premium",
        price: 68000,
        highlight: "populaire",
        tagline: "Toute la salle prend vie : murs colorés et ambiance de club.",
        image: "/images/packs/Premium.jpg",
        baseMinutes: 360,
        extraRateCents: 8000,
        defaultStart: "20:00",
        defaultEnd: "02:00",
        equipment: [
 "4 Lyres Beam",
 "4 Bars LED",
 "2 Machines à fumée effet Geyser",
 "8 PAR LED (déco d'ambiance salle)",
        ],
      },
    ],
  },
  {
    id: "mariage",
    label: "Mariages & Grandes Réceptions",
    image: "/images/packs/2.jpg",
    intro:
 "De la première danse au bout de la nuit : un dispositif son & lumière à la hauteur de votre plus beau jour.",
    baseNote: "Base : minimum 8 h de mix + forfait installation 100 € (base fixe 1 060 €).",
    extraHourLabel: "Heure sup. / Prolongation / Cérémonie laïque : 120 €/h",
    common: [
 "Sono Audiophony Modjo2000",
 "Éclairage 100 % synchronisé en temps réel avec la musique",
    ],
    packs: [
      {
        name: "Pack Essential",
        price: 106000,
        tagline:
          "Le strict minimum : le dancefloor s'anime, mais la salle autour reste sombre.",
        image: "/images/packs/5.jpg",
        baseMinutes: 480,
        extraRateCents: 12000,
        defaultStart: "20:00",
        defaultEnd: "04:00",
        equipment: [
 "2 Lyres Beam (monotubes)",
 "2 Bars LED",
 "2 Machines à fumée effet Geyser",
        ],
      },
      {
        name: "Pack Deluxe",
        price: 116000,
        highlight: "populaire",
        // ⚠️ Chiffre à ajuster selon vos vraies statistiques de l'année.
        socialProof: "Choisi par 7 mariages sur 10 en 2025",
        tagline:
          "Toute la salle prend vie : murs colorés, ambiance de club, photos de soirée réussies.",
        image: "/images/packs/4.jpg",
        video: "/videos/packs/deluxe.mp4",
        baseMinutes: 480,
        extraRateCents: 12000,
        defaultStart: "20:00",
        defaultEnd: "04:00",
        equipment: [
 "4 Lyres Beam",
 "4 Bars LED",
 "2 Machines à fumée effet Geyser",
 "8 PAR LED (déco d'ambiance salle)",
        ],
      },
      {
        name: "Pack L'Ultime Show",
        price: 121000,
        highlight: "show",
        tagline:
          "Le show d'un vrai concert : impact maximum sur le dancefloor ET dans toute la salle.",
        image: "/images/packs/manolieraphael-0910.jpg",
        baseMinutes: 480,
        extraRateCents: 12000,
        defaultStart: "20:00",
        defaultEnd: "04:00",
        equipment: [
 "6 Lyres Beam",
 "2 Lyres Spot",
 "4 Bars LED",
 "2 Machines à fumée effet Geyser",
 "8 PAR LED (déco d'ambiance salle)",
        ],
      },
    ],
  },
  {
    id: "pro",
    label: "Bars, Clubs, Associations & Soirées Pro",
    image: "/images/packs/3.jpg",
    intro:
 "Vous disposez déjà du son ou d'une scène ? De la simple prestation DJ à la formule clé en main complète, choisissez le niveau d'accompagnement — pour les bars, clubs, associations, comités des fêtes et soirées professionnelles.",
    baseNote: "Trois formats au choix selon votre lieu et vos équipements.",
    extraHourLabel: "Heure supplémentaire : dès 55 €/h selon formule",
    common: [
 "Régie DJ professionnelle",
 "Éclairage synchronisé (formules clé en main)",
    ],
    packs: [
      {
        name: "Set DJ seul (votre sono)",
        price: 11000,
        tagline: "Vous avez déjà le son ? On apporte juste le show du DJ.",
        image: "/images/packs/setdj.jpg",
        baseMinutes: 120,
        extraRateCents: 5500,
        defaultStart: "20:00",
        defaultEnd: "22:00",
        equipment: [
 "Minimum 2 h de mix (55 €/h)",
 "Platines DJ + ordinateur portable",
 "Heure supplémentaire : 55 €/h",
        ],
      },
      {
        name: "Clé en main Standard",
        price: 25000,
        tagline: "Une soirée complète son + lumière, en dispositif compact.",
        image: "/images/packs/cle.jpg",
        baseMinutes: 120,
        extraRateCents: 9000,
        defaultStart: "20:00",
        defaultEnd: "22:00",
        equipment: [
 "Minimum 2 h de mix (90 €/h) + installation 70 €",
 "Régie DJ + Sono Audiophony Modjo2000",
 "2 Lyres Beam + 2 Bars LED + 4 PAR LED",
 "Heure supplémentaire : 90 €/h",
        ],
      },
      {
        name: "Clé en main Premium",
        price: 47000,
        highlight: "show",
        tagline: "Le dispositif renforcé pour un vrai effet « waouh » en salle.",
        image: "/images/packs/jeannebastien-1328.jpg",
        baseMinutes: 180,
        extraRateCents: 9000,
        defaultStart: "20:00",
        defaultEnd: "23:00",
        equipment: [
 "Minimum 3 h de mix (90 €/h) + installation 100 €",
 "Matériel renforcé : +160 € par rapport au Standard (lyres et PAR en plus, 2 machines à fumée)",
 "Régie DJ + Sono Audiophony Modjo2000",
 "4 Lyres Beam + 2 Bars LED + 8 PAR LED",
 "2 Machines à fumée",
 "Heure supplémentaire : 90 €/h",
        ],
      },
    ],
  },
];

export const ADMIN_PACK_LIST = CATEGORIES.flatMap((category) =>
  category.packs.map((pack) => ({
    id: pack.name,
    name: pack.name,
    price: pack.price,
    baseMinutes: pack.baseMinutes,
    extraRateCents: pack.extraRateCents,
  })),
);

// Image de scénographie par nom de pack (pour les récapitulatifs de l'espace client).
export const PACK_IMAGES: Record<string, string> = Object.fromEntries(
  CATEGORIES.flatMap((category) => category.packs.map((pack) => [pack.name, pack.image]))
);

// Visuels/vidéos par défaut des packs (avant personnalisation via l'admin
// médias → dossier « packs » → _packs.json). Utilisé par la section
// « Visuels des packs » de l'admin pour proposer les rattachelements.
export const PACK_DEFAULTS: { name: string; image: string; video?: string }[] =
  CATEGORIES.flatMap((category) =>
    category.packs.map((pack) => ({
      name: pack.name,
      image: pack.image,
      ...(pack.video ? { video: pack.video } : {}),
    }))
  );

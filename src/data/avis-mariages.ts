// Avis Mariages.net — stats officielles du profil
// https://www.mariages.net/musique-mariage/propulsound-dj--e366139
//
// POUR AJOUTER UN AVIS : copie le texte depuis ton profil Mariages.net
// (onglet Avis → « Lire l'avis ») et ajoute une entrée dans `avis` :
//
// { author: "Sophie & Thomas", date: "Août 2026", rating: 5, text: "…" },
//
// Les textes des avis ne sont pas accessibles automatiquement (chargés en
// JavaScript par Mariages.net, et leur réutilisation automatisée est
// interdite par leurs conditions) — la copie manuelle, avec attribution
// et lien vers le profil, est la bonne pratique.

export const mariagesStats = {
  rating: 4.8,
  count: 4,
  recommendedPercent: 96,
  profileUrl: "https://www.mariages.net/musique-mariage/propulsound-dj--e366139",
  breakdown: [
    { label: "Temps de réponse", rating: 5 },
    { label: "Qualité du service", rating: 4.8 },
    { label: "Flexibilité", rating: 4.8 },
    { label: "Professionnalisme", rating: 4.8 },
    { label: "Rapport qualité/prix", rating: 4.8 },
  ],
};

export type AvisMariages = {
  author: string;
  date: string;
  rating: number;
  text: string;
};

export const avisMariages: AvisMariages[] = [
  // Exemple (remplace/ajoute ici) :
  // {
  //   author: "Sophie & Thomas",
  //   date: "Août 2026",
  //   rating: 5,
  //   text: "Un DJ au top du début à la fin…",
  // },
];

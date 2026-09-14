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
  {
    author: "Caroline & Rémy — Domaine de la Vaudourière, Lunay",
    date: "Juillet 2026",
    rating: 5,
    text: "Une ambiance de folie ! Maxime a été très à l'écoute et disponible, dès le rendez-vous téléphonique et pour le jour J ! Nous avions envoyé une liste détaillée et Maxime a su l'exploiter, s'en inspirer et broder autour pour garantir une ambiance parfaite quel que soit le moment de la journée ! Les lancements étaient parfaits pendant la cérémonie laïque, l'ambiance douce et jazzy pour le vin d'honneur, et endiablée pendant toute la nuit ! Pas de temps mort ou de pause, la piste de danse n'a pas désempli de toute la nuit ! Nous avons eu de nombreux compliments ! Maxime sait s'adapter, ce n'est pas une simple playlist mais un vrai mix et nous avons adoré ! Merci merci merci pour cette ambiance de folie !",
  },
  {
    author: "Bastien & Jeanne — Domaine de la Vaudourière, Lunay",
    date: "Septembre 2025",
    rating: 5,
    text: "N'hésitez plus, c'est le bon ! Étant moi-même DJ à mes heures perdues, j'ai pu observer le professionnalisme et j'ai senti que c'était le bon. Maxime saura répondre à vos attentes, disponible et réactif il a su rester serviable (en me laissant mixer car impossible pour moi de m'en empêcher) et souriant toute la journée de la cérémonie au cocktail puis la soirée dansante. Également lors du montage il est venu en avance pour que tout soit prêt et pour rassurer les mariés jusqu'au démontage qui n'est pas la partie la plus drôle. Jeune et dynamique, les invités des petits aux grands ont trouvé leur bonheur et ont pu profiter de la soirée dansante, je n'ai eu que des bons retours le concernant. Les tarifs sont accessibles pour vous assurer une prestation à la hauteur de votre événement. Notre mariage était inoubliable en partie grâce au DJ. La musique étant pour nous un point non négligeable, il n'y a eu aucune fausse note de ce côté-là. Je ne peux que vous le recommander, même pour d'autres occasions !",
  },
  {
    author: "Sofia & Denis — Salle de la Clairière, Saint-Claude-de-Diray",
    date: "Mai 2026",
    rating: 4,
    text: "Bon rapport qualité prix. Répond vite par message ou appel. A du bon matériel : lumière, fumée et étincelles.",
  },
  {
    author: "Steph & Nico — Saint-Rémy-sur-Creuse",
    date: "Juin 2025",
    rating: 5,
    text: "Un DJ exceptionnel ! Vous recherchez un DJ super sympa, à l'écoute et qui a une capacité d'adaptation exceptionnelle ? Ne cherchez plus. Maxime va mettre le feu à vos événements. C'est un jeune DJ très talentueux, je peux vous le confirmer car moi-même je mixe pour mon plaisir. De plus il vous mettra l'ambiance en lumière et franchement c'est juste magnifique. Il possède du matériel de haute qualité. N'hésitez surtout pas à prendre l'option machine à fumée lourde, franchement ça rend vraiment très bien. Nous l'avons engagé pour notre mariage et tout le monde l'a adoré. Un grand merci à toi Max !",
  },
];

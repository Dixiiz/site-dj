import type { Metadata } from "next";
import { EventLanding, type EventLandingData } from "@/components/event-landing";

export const metadata: Metadata = {
  title: "DJ Anniversaire & Soirée privée — Propul'Sound DJ (Blois)",
  description:
    "Anniversaire, fiançailles, fête entre amis : DJ + sonorisation + lumière pour une soirée réussie près de Blois. Devis en ligne en quelques minutes, avis 4,8/5.",
  alternates: { canonical: "/anniversaire" },
};

const data: EventLandingData = {
  path: "/anniversaire",
  title: "DJ Anniversaire & Soirée privée",
  subtitle:
    "18 ans, 40 ans, fiançailles ou simple envie de faire la fête : une soirée clé en main chez vous ou en salle, sans vous occuper de rien.",
  metaTitle: "DJ Anniversaire & Soirée privée — Propul'Sound DJ (Blois)",
  metaDescription:
    "Anniversaire, fiançailles, fête entre amis : DJ + sonorisation + lumière pour une soirée réussie près de Blois. Devis en ligne en quelques minutes, avis 4,8/5.",
  photo: "/galerie/dsc-8110.jpg",
  photoAlt: "Ambiance de fête lors d'un anniversaire animé par Propul'Sound DJ",
  intro: [
    "Organiser une fête, c'est déjà beaucoup : le gâteau, les invités, la salle… Ne laissez pas la musique au hasard. Propul'Sound DJ s'installe chez vous ou dans votre salle, assure le son, les lumières et l'ambiance jusqu'au bout de la nuit — et range tout en partant.",
    "Hits du moment, Classics qui rappellent des souvenirs, électro pour finir en beauté : la programmation est préparée avec vous (et les demandes spéciales des invités passent au bon moment).",
  ],
  highlights: [
    { title: "Installation discrète", text: "Montage avant l'arrivée des invités, matériel adapté aux petites salles comme aux jardins (puissance ajustée, volume maîtrisé)." },
    { title: "Ambiance sur-mesure", text: "Dîner en musique puis piste de danse : vous choisissez le déroulé, je m'adapte à l'énergie de vos invités en direct." },
    { title: "Lumière & FX en option", text: "Machine à fumée, étincelles froides pour le gâteau ou l'entrée de la pièce : les effets qui marquent les esprits." },
    { title: "Micro pour les discours", text: "Discours, blagues du meilleur ami, quiz surprise : un micro sans fil est disponible toute la soirée." },
  ],
  faq: [
    { q: "Quel budget pour un anniversaire avec DJ ?", a: "Les formules démarrent pour des soirées de quelques heures et évoluent avec la durée et les options. Le configurateur en ligne affiche votre tarif en direct, sans surprise." },
    { q: "Peut-on organiser la fête à la maison ?", a: "Oui : l'installation est prévue pour les maisons, jardins et petites salles. Le niveau sonore est ajusté à l'endroit et aux voisins." },
    { q: "Comment choisir la musique ?", a: "Dans votre espace client en ligne : titres indispensables, styles à éviter, demandes spéciales. Vous gardez le contrôle, sans vous occuper de la technique." },
    { q: "Est-il possible de payer en plusieurs fois ?", a: "Oui : le paiement en plusieurs fois (2 à 10×) est disponible directement dans votre espace client, échéance par échéance." },
  ],
};

export default function AnniversairePage() {
  return <EventLanding data={data} />;
}

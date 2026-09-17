import type { Metadata } from "next";
import { EventLanding, type EventLandingData } from "@/components/event-landing";

export const metadata: Metadata = {
  title: { absolute: "DJ Mariage Blois & Loir-et-Cher — Propul'Sound DJ" },
  description:
    "DJ pour votre mariage près de Blois : cérémonie, cocktail, dîner et piste de danse. Sonorisation, lumière et options FX incluses. Devis en ligne gratuit, avis 4,8/5.",
  alternates: { canonical: "/mariage" },
};

const data: EventLandingData = {
  path: "/mariage",
  title: "DJ Mariage à Blois & en Loir-et-Cher",
  subtitle:
    "Du premier verre au dernier slow : une ambiance sur-mesure pour le plus beau jour de votre vie, préparée avec vous au détail près.",
  metaTitle: "DJ Mariage Blois & Loir-et-Cher — Propul'Sound DJ",
  metaDescription:
    "DJ pour votre mariage près de Blois : cérémonie, cocktail, dîner et piste de danse. Sonorisation, lumière et options FX incluses. Devis en ligne gratuit, avis 4,8/5.",
  photo: "/galerie/jeannebastien-1328.jpg",
  photoAlt: "Piste de danse enflammée lors d'un mariage animé par Propul'Sound DJ",
  intro: [
    "Votre mariage mérite mieux qu'une playlist en boucle : chaque moment a sa musique, son intensité, son énergie. L'entrée de la mariée, les discours, l'ouverture du bal, la pleine piste à minuit — tout est synchronisé lumières + son, et préparé en amont avec vous dans votre espace client en ligne.",
    "Basés à Blois (Huisseau-sur-Cosson), Propul'Sound DJ intervient à Blois, Vendôme, Morée, Chambord et dans tout le Loir-et-Cher (déplacement offert dans un rayon de 30 km). Matériel professionnel, installation testée avant l'arrivée des invités : vous n'avez qu'à profiter.",
  ],
  highlights: [
    { title: "Cérémonie & cocktail (option)", text: "Micro pour la mairie ou l'extérieur, musique d'ambiance élégante pour le vin d'honneur et le repas, transitions invisibles." },
    { title: "Temps forts personnalisés", text: "Entrée de la mariée, ouverture du bal, surprise pour les parents : vous choisissez les titres, je gère le timing au millimètre." },
    { title: "Show lumière synchronisé", text: "Wash, effet d'ambiance, machine à fumée et étincelles froides en option : la piste de danse devient un spectacle." },
    { title: "Votre playlist en ligne", text: "Espace client dédié : titres indispensables, interdits, temps forts — tout est validé par vous avant le jour J." },
  ],
  faq: [
    { q: "Combien coûte un DJ pour un mariage ?", a: "Les tarifs dépendent de la formule (durée, options, cérémonie et cocktail). Le configurateur en ligne calcule votre prix en temps réel, en toute transparence. Paiement en plusieurs fois possible (2 à 10×)." },
    { q: "Couvez-vous la cérémonie laïque et le cocktail ?", a: "Oui : micro sans fil, sonorisation de la cérémonie, musique du cocktail et du repas sont proposés en options. Le tout est configurable dans votre devis en ligne." },
    { q: "Que se passe-t-il en cas de panne ou d'imprévu ?", a: "Chaque installation est testée et répétée avant l'arrivée des invités, avec une checklist de rigueur, et je suis présent sur place dès l'installation. La prestation est assurée professionnellement." },
    { q: "À quel moment faut-il réserver ?", a: "Les samedis de juin à septembre partent vite (souvent 12 mois à l'avance). La réservation se fait en ligne : devis, signature électronique, acompte de 20 % — votre date est verrouillée dès réception." },
  ],
  timeline: [
    { label: "Installation", detail: "Montage et tests son + lumière bien avant l'arrivée des premiers invités, en coordination avec le lieu." },
    { label: "Cérémonie (option)", detail: "Micro pour les vœux et les discours, musique d'entrée et de sortie choisie avec vous." },
    { label: "Cocktail & repas", detail: "Ambiance douce et élégante, volume maîtrisé pour laisser place aux conversations." },
    { label: "Temps forts", detail: "Entrée des mariés, découpage du gâteau, ouverture du bal : vos titres, calés au millimètre." },
    { label: "Piste de danse", detail: "Mix en direct qui suit l'énergie de vos invités — pas une playlist en boucle." },
    { label: "Fin de soirée", detail: "Dernier slow, dernière piste, et je repars avec tout le matériel — rien à ranger pour vous." },
  ],
  extraSection: {
    title: "Ce qui est garanti sur chaque prestation",
    intro: "Quel que soit le lieu ou la formule, le cadre est toujours le même :",
    list: [
      "Devis détaillé et contrat signés électroniquement avant le jour J",
      "Un seul interlocuteur, du premier échange au dernier morceau",
      "Réponse et communication sous 24 h, messagerie dédiée dans votre espace client",
      "Programmation musicale validée par vous avant la soirée",
      "Installation testée en amont, arrivée en avance sur le lieu",
    ],
  },
};

export default function MariagePage() {
  return <EventLanding data={data} />;
}

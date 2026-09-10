import type { Metadata } from "next";
import { EventLanding, type EventLandingData } from "@/components/event-landing";

export const metadata: Metadata = {
  title: "DJ Événement d'entreprise & Séminaire — Propul'Sound DJ (Blois)",
  description:
    "Séminaires, soirées de gala, arbres de Noël : DJ professionnel pour vos événements d'entreprise à Blois et en Loir-et-Cher. Sonorisation, lumière, devis rapide.",
  alternates: { canonical: "/evenement-entreprise" },
};

const data: EventLandingData = {
  path: "/evenement-entreprise",
  title: "DJ pour vos événements d'entreprise",
  subtitle:
    "Séminaire, soirée de gala, arbre de Noël ou inauguration : une prestation professionnelle, ponctuelle et adaptée à l'image de votre société.",
  metaTitle: "DJ Événement d'entreprise & Séminaire — Propul'Sound DJ (Blois)",
  metaDescription:
    "Séminaires, soirées de gala, arbres de Noël : DJ professionnel pour vos événements d'entreprise à Blois et en Loir-et-Cher. Sonorisation, lumière, devis rapide.",
  photo: "/galerie/manolieraphael-0910.jpg",
  photoAlt: "Soirée d'entreprise animée par Propul'Sound DJ avec show lumière",
  intro: [
    "Votre événement d'entreprise mérite le même soin qu'un mariage : ponctualité irréprochable, dress code du matériel, tenue adaptée, et une ambiance calibrée pour tous vos collaborateurs — du cocktail networking à la piste de danse.",
    "Propul'Sound DJ intervient à Blois et dans toute la région pour les comités d'entreprise, mairies, associations et sociétés privées, avec facture et devis formalisés.",
  ],
  highlights: [
    { title: "Sonorisation professionnelle", text: "Conférence, remise de prix ou discours : micros, pupitre et son clair pour la partie formelle, puis montée en énergie pour la soirée." },
    { title: "Ambiance calibrée", text: "Fond sonore feutré pendant le dîner, playlists corporate validées en amont, montée progressive vers la piste de danse." },
    { title: "Facturation simple", text: "Devis, bon de commande et facture : tout est formalisé pour votre comptabilité. Paiement par virement, paiement en plusieurs fois possible." },
    { title: "Ponctualité & discrétion", text: "Arrivée anticipée, tenue adaptée à votre événement, coordination avec votre prestataire traiteur ou votre agence événementielle." },
  ],
  faq: [
    { q: "Intervenez-vous en semaine ?", a: "Oui : séminaires, soirées de lancement et arbres de Noël ont souvent lieu en semaine. Toutes les dates de la semaine sont possibles." },
    { q: "Pouvez-vous sonoriser une conférence en plus de la soirée ?", a: "Oui : la sonorisation de la partie institutionnelle (micros, support de parole) est proposée en option, avec enchaînement direct vers la soirée." },
    { q: "Comment obtenir un devis pour une entreprise ?", a: "Via le configurateur en ligne pour un tarif immédiat, ou via la page contact pour une demande sur-mesure (grands effectifs, multiple espaces, cahier des charges spécifique)." },
    { q: "Quelle zone d'intervention ?", a: "Blois, Vendôme, Orléans, Tours et plus largement le Centre-Val de Loire. Les 30 premiers kilomètres de déplacement sont offerts." },
  ],
};

export default function EvenementEntreprisePage() {
  return <EventLanding data={data} />;
}

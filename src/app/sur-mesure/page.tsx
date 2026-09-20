import { FadeIn } from "@/components/fade-in";
import { CustomRequestForm } from "@/components/custom-request-form";
import { FaqSection } from "@/components/faq-section";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// FAQ SEO : questions typiques d'un projet sur-mesure (extrait enrichi Google).
const faqItems = [
  {
    q: "Quels types d'événements sont considérés comme sur-mesure ?",
    a: "Tout ce qui ne rentre pas dans les formules du site : deux espaces sonorisés (cérémonie + soirée), effectifs importants, horaires atypiques, contraintes spécifiques (sonorisation extérieure, salle atypique), ou un besoin de coordination avec d'autres prestataires.",
  },
  {
    q: "Sous quel délai recevez-vous une réponse ?",
    a: "Votre demande arrive directement chez le DJ : réponse en général sous 24 h, avec un devis formalisé si le projet est clair, ou une proposition de téléphone pour cadrer les détails.",
  },
  {
    q: "Un devis et une facture sont-ils fournis ?",
    a: "Oui, systématiquement : devis détaillé avant engagement, facture après la prestation — indispensable pour les associations, mairies et entreprises.",
  },
  {
    q: "Quelle est la zone d'intervention ?",
    a: "Blois et le Loir-et-Cher au quotidien, et le Centre-Val de Loire plus largement (Orléans, Tours, Vendôme…). Les 30 premiers kilomètres de déplacement sont offerts.",
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Acompte de réservation (20 %) puis solde après la soirée, par virement, carte bancaire ou paiement en plusieurs fois (2 à 10×) directement en ligne.",
  },
];

export const metadata = {
  alternates: { canonical: "/sur-mesure" },
  title: "Prestation DJ sur-mesure — sonorisation & besoins spécifiques",
  description:
    "Un projet hors des formules classiques ? Propul'Sound DJ propose des prestations sur-mesure : double sonorisation, extérieur, horaires atypiques, coordination avec d'autres prestataires. Devis gratuit en ligne.",
};

export default function SurMesurePage() {
  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-3xl px-4 py-10">
        <FadeIn>
          <h1 className="text-3xl font-medium tracking-tight">Projet sur-mesure</h1>
          <p className="mt-3 text-muted-foreground">
            Un événement unique nécessite une approche personnalisée. Parlez-nous de votre projet.
          </p>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <h2 className="text-xl font-medium text-foreground">
              Des exemples de projets sur-mesure
            </h2>
            <p>
              Chaque année, des dizaines d&apos;événements ne rentrent dans
              aucune case : et c&apos;est justement là que le sur-mesure prend
              tout son sens. Voici les projets les plus fréquents :
            </p>
            <ul className="space-y-2">
              <li>Mariage avec double sonorisation : cérémonie laïque au domaine + soirée dansante dans une seconde salle</li>
              <li>Soirée en extérieur : sonorisation et éclairage adaptés aux jardins, chapiteaux et terrasses</li>
              <li>Mairies et comités des fêtes : bals populaires, feu de la Saint-Jean, vignettes d&apos;honneur</li>
              <li>Entreprises : soirée de gala, arbre de Noël, séminaire avec coordination du discours à la piste de danse</li>
              <li>Anniversaires surprise : horaires atypiques, deux espaces à sonoriser, effets spéciaux</li>
            </ul>
            <p>
              Décrivez votre projet ci-dessous : vous recevez une réponse sous
              24 h, avec un devis détaillé si le projet est clair, ou une
              proposition d&apos;appel pour cadrer les détails. Devis et facture
              sont systématiquement fournis.
            </p>
          </div>
        </FadeIn>
        <div className="mt-10">
          <CustomRequestForm />
        </div>
      </main>
      <FaqSection title="Questions fréquentes — projets sur-mesure" items={faqItems} />
      <SiteFooter />
    </>
  );
}

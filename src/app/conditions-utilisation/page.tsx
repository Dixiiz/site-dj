import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";

export const metadata = {
  alternates: { canonical: "/conditions-utilisation" },
  title: { absolute: "Conditions d'utilisation et de vente — Propul'Sound DJ" },
  description:
    "Conditions d'utilisation du site et conditions générales de vente des prestations DJ Propul'Sound DJ : réservation, acompte, annulation, paiement, responsabilité.",
};

const sections = [
  {
    title: "1. Objet",
    content:
      "Les présentes conditions régissent l'utilisation du site propulsounddj.fr (ci-après « le Site ») édité par Propul'Sound DJ, entreprise individuelle de prestation DJ et show lumière (SIRET 932 220 791 00010, 5 Clos de la Salamandre, 41350 Huisseau-sur-Cosson), ainsi que la commande de prestations via le Site.",
  },
  {
    title: "2. Utilisation du site",
    content:
      "Le Site permet d'obtenir des informations sur les prestations, de demander un devis gratuit, de gérer sa réservation dans un espace client (playlist, documents, paiements) et de laisser des avis. L'utilisateur s'engage à fournir des informations exactes, à ne pas usurper l'identité d'autrui et à ne pas tenter de compromettre la sécurité du Site. Tout abus (spam, contenus illicites dans la playlist ou les messages) entraîne la suspension de l'accès à l'espace client.",
  },
  {
    title: "3. Devis et réservation",
    content:
      "Le devis en ligne est gratuit et précise la formule, les options, le lieu, la date et le prix. La réservation devient effective après acceptation du devis, signature du contrat (électronique ou papier) et versement de l'acompte de réservation (20 % sauf mention contraire). La date n'est définitivement bloquée qu'à réception de l'acompte ; tant que l'acompte n'est pas reçu, la date peut être attribuée à un autre client.",
  },
  {
    title: "4. Paiement",
    content:
      "L'acompte et, le cas échéant, le solde peuvent être réglés en ligne par carte bancaire via Stripe (paiement sécurisé) ou par virement. Le solde est exigé au plus tard le jour de l'événement, sauf accord écrit contraire. Une facture est délivrée sur demande ou automatiquement selon les modalités convenues.",
  },
  {
    title: "5. Annulation et report",
    content:
      "En cas d'annulation par le client moins de 30 jours avant l'événement, l'acompte reste acquis. En cas d'annulation par Propul'Sound DJ (force majeure : maladie, accident, etc.), l'intégralité des sommes versées est remboursée. Tout report est possible sous réserve de disponibilité de la nouvelle date, sans frais supplémentaires.",
  },
];

const sections2 = [
  {
    title: "6. Obligations du client",
    content:
      "Le client garantit la disponibilité et la conformité des accès électriques et de l'espace d'installation, ainsi que le respect des réglementations applicables (déclarations SONUM/SACEM, autorisations administratives, niveau sonore). Le client est responsable d'informer ses invités de la présence éventuelle de photographies/vidéos et d'obtenir leur autorisation, conformément à l'article 11 du contrat (droit à l'image).",
  },
  {
    title: "7. Responsabilité",
    content:
      "Propul'Sound DJ est assuré en responsabilité civile professionnelle. Sa responsabilité ne saurait être engagée en cas de défaillance du courant électrique du lieu, d'intervention de tiers, de matériel dégradé par le client ou les invités, ni pour tout événement de force majeure. Les contenus du Site (textes, photos, tarifs indicatifs) sont fournis à titre d'information et peuvent évoluer ; seuls le devis et le contrat signés engagent les parties.",
  },
  {
    title: "8. Propriété intellectuelle",
    content:
      "L'ensemble des contenus du Site (textes, photographies, vidéos, logo, code) est protégé par le droit d'auteur. Toute reproduction, diffusion ou réutilisation sans autorisation écrite préalable est interdite.",
  },
  {
    title: "9. Litiges et droit applicable",
    content:
      "Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité ; à défaut, les tribunaux français compétents seront saisis. Le consommateur peut également recourir gratuitement à un médiateur de la consommation (coordonnées communiquées sur simple demande via la page Contact).",
  },
];

export default function ConditionsUtilisationPage() {
  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-3xl px-4 py-10">
        <FadeIn>
          <h1 className="text-3xl font-medium tracking-tight">
            Conditions d&apos;utilisation et de vente
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Dernière mise à jour : septembre 2026.
          </p>
        </FadeIn>
        <div className="mt-10 space-y-8">
          {[...sections, ...sections2].map((s, i) => (
            <FadeIn key={i} delay={0.05 * i}>
              <section>
                <h2 className="text-lg font-medium">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.content}
                </p>
              </section>
            </FadeIn>
          ))}
        </div>
        <FadeIn>
          <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
            Une question ?{" "}
            <Link
              href="/contact"
              className="text-accent underline underline-offset-4"
            >
              Contactez-nous
            </Link>{" "}
            — voir aussi nos{" "}
            <Link
              href="/mentions-legales"
              className="text-accent underline underline-offset-4"
            >
              mentions légales
            </Link>{" "}
            et notre{" "}
            <Link
              href="/politique-de-confidentialite"
              className="text-accent underline underline-offset-4"
            >
              politique de confidentialité
            </Link>
            .
          </p>
        </FadeIn>
      </main>
      <SiteFooter />
    </>
  );
}


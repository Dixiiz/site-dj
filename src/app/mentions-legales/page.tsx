import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";
import Link from "next/link";

export const metadata = {
  title: "Mentions légales — Propul'Sound DJ",
};

const sections = [
  {
    title: "Éditeur du site",
    content:
      "Propul'Sound DJ — Entreprise individuelle de prestation DJ & show lumière. Siège : Huisseau-sur-Cosson (41350). Directeur de la publication : le gérant. Contact : via le formulaire de la page Contact.",
  },
  {
    title: "Hébergement",
    content:
      "Ce site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com.",
  },
  {
    title: "Données personnelles (RGPD)",
    content:
      "Les informations transmises via les formulaires (nom, e-mail, téléphone, lieu et date de l'événement) sont utilisées uniquement pour traiter votre demande de devis ou votre message. Elles ne sont ni vendues, ni transmises à des tiers. Vous pouvez demander leur suppression à tout moment via la page Contact.",
  },
  {
    title: "Cookies",
    content:
      "Ce site n'utilise pas de cookies publicitaires ni de traceurs nécessitant consentement. Les statistiques de fréquentation (Vercel Analytics) sont collectées de manière anonyme et sans cookie.",
  },
  {
    title: "Propriété intellectuelle",
    content:
      "L'ensemble des contenus du site (textes, photos, vidéos, logo) est la propriété de Propul'Sound DJ. Toute reproduction sans autorisation est interdite.",
  },
  {
    title: "Réservations & annulations",
    content:
      "Une réservation est confirmée après accord sur les modalités (acompte et contrat). En cas d'annulation par le client à moins de 30 jours de l'événement, l'acompte reste acquis. En cas d'annulation par Propul'Sound DJ (force majeure), l'intégralité des sommes versées est remboursée.",
  },
];

export default function MentionsLegalesPage() {
  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-3xl px-4 py-10">
        <FadeIn>
          <h1 className="text-3xl font-medium tracking-tight">
            Mentions légales
          </h1>
        </FadeIn>
        <div className="mt-10 space-y-8">
          {sections.map((s, i) => (
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
            </Link>
            .
          </p>
        </FadeIn>
      </main>
    </>
  );
}
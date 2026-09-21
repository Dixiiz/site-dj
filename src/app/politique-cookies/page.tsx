import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";

export const metadata = {
  alternates: { canonical: "/politique-cookies" },
  title: { absolute: "Politique cookies — Propul'Sound DJ" },
  description:
    "Politique cookies du site Propul'Sound DJ : inventaire des cookies et traceurs utilisés (strictement nécessaires et mesure d'audience sans cookie), base légale et gestion.",
};

const sections = [
  {
    title: "1. Que sont les cookies ?",
    content:
      "Un cookie est un petit fichier déposé sur votre appareil lors de la visite d'un site. Il permet notamment de conserver une session de connexion ou de mesurer l'audience. Certains cookies nécessitent votre consentement préalable (art. 82 loi Informatique et Libertés), d'autres — strictement nécessaires ou exemptés par la CNIL — non.",
  },
  {
    title: "2. Cookies utilisés sur ce site",
    content:
      "Cookies strictement nécessaires (exemptés de consentement) : cookies de session Supabase Auth permettant la connexion à votre espace client (lb_auth_*, sb-*) et la sécurité des formulaires. Ils ne servent qu'au fonctionnement du site et expirent à la fermeture de la session.",
  },
  {
    title: "3. Mesure d'audience",
    content:
      "Le site utilise Vercel Analytics, une solution de mesure d'audience qui ne dépose aucun cookie et ne collecte aucune donnée permettant de vous identifier (adresse IP anonymisée, pas de profilage, pas de revente). Conformément aux recommandations de la CNIL pour les solutions de ce type, elle est dispensée de consentement.",
  },
  {
    title: "4. Cookies tiers que nous ne déposons pas",
    content:
      "Ce site ne dépose aucun cookie publicitaire, aucun cookie de réseaux sociaux et aucun traceur de mesure nécessitant consentement. Les polices de caractères sont auto-hébergées : aucune requête n'est envoyée à Google Fonts lors de votre visite. Les liens externes (Linkaband, Mariages.net, Instagram, avis Google) peuvent déposer leurs propres cookies une fois sur ces sites — consultez leurs politiques respectives.",
  },
  {
    title: "5. Gestion de vos préférences",
    content:
      "Les cookies strictement nécessaires ne peuvent pas être désactivés sans empêcher le fonctionnement de l'espace client. Vous pouvez toutefois les supprimer à tout moment dans les réglages de votre navigateur (historique → cookies). Puisque le site n'utilise aucun cookie soumis à consentement, aucune bannière de consentement n'est nécessaire : si nous en ajoutions un à l'avenir, votre consentement sera demandé avant tout dépôt.",
  },
];

export default function PolitiqueCookiesPage() {
  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-3xl px-4 py-10">
        <FadeIn>
          <h1 className="text-3xl font-medium tracking-tight">
            Politique cookies
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Dernière mise à jour : septembre 2026.
          </p>
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
            </Link>{" "}
            — voir aussi notre{" "}
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

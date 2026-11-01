import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";

export const metadata = {
  alternates: { canonical: "/politique-de-confidentialite" },
  title: { absolute: "Politique de confidentialité — Propul'Sound DJ" },
  description:
    "Politique de confidentialité du site Propul'Sound DJ : données collectées, finalités, bases légales, durées de conservation, sous-traitants et vos droits RGPD.",
};

const sections = [
  {
    title: "1. Responsable du traitement",
    content:
      "Propul'Sound DJ — entreprise individuelle de prestation DJ & show lumière, 5 Clos de la Salamandre, 41350 Huisseau-sur-Cosson, France. SIRET : 932 220 791 00010. Contact pour toute question relative à vos données : via le formulaire de la page Contact ou par e-mail à propulsounddj@gmail.com.",
  },
  {
    title: "2. Données collectées",
    content:
      "Selon votre utilisation du site : (a) via le formulaire de devis — nom, e-mail, téléphone, type de prestation, date et lieu de l'événement, formule et options choisies ; (b) via le formulaire de contact — nom, e-mail et message ; (c) via votre espace client — contenu de votre playlist musicale, documents signés (date et heure de signature, adresse IP de signature), messages échangés ; (d) paiements — traités par Stripe (nous ne voyons jamais votre numéro de carte, uniquement un identifiant de paiement, le montant et le statut) ; (e) notifications push — identifiant d'abonnement de votre navigateur, uniquement si vous les activez.",
  },
  {
    title: "3. Finalités et bases légales",
    content:
      "Traiter vos demandes de devis et vos messages (intérêt légitime / mesures précontractuelles, art. 6-1-b RGPD) ; exécuter le contrat de prestation : documents, playlist, paiements, e-mails de suivi (exécution du contrat, art. 6-1-b) ; respecter nos obligations comptables et fiscales (obligation légale, art. 6-1-c) ; améliorer le site grâce à des statistiques d'audience anonymisées (intérêt légitime, art. 6-1-f) ; publier des photos de prestations (consentement, art. 6-1-a — voir article 7).",
  },
];

const sections2 = [
  {
    title: "4. Destinataires et sous-traitants",
    content:
      "Vos données ne sont jamais vendues. Elles sont hébergées et traitées par : Vercel Inc. (hébergement du site, États-Unis — clauses contractuelles types de la Commission européenne) ; Supabase (base de données et authentification de votre espace client) ; Resend (envoi des e-mails transactionnels) ; Stripe Inc. (paiements en ligne) ; Google (Places API, affichage des avis clients, requêtes serveur sans données personnelles) ; Apple (API iTunes, recherche de titres et pochettes pour la playlist, requête effectuée depuis votre navigateur sans donnée personnelle).",
  },
  {
    title: "5. Durées de conservation",
    content:
      "Demandes de devis sans suite : 3 ans à compter du dernier contact. Données clients (compte, devis, contrat, playlist) : durée de la relation contractuelle puis 3 ans pour la prospection et la prescription, hors obligations légales. Documents comptables (devis confirmés, factures) : 10 ans (obligation légale). Photos de prestations publiées : durée du consentement donné au contrat (5 ans, révocable à tout moment). Identifiants de notifications push : jusqu'à désactivation par vous ou suppression du compte.",
  },
  {
    title: "6. Vos droits",
    content:
      "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données, ainsi que du droit de retirer votre consentement (droit à l'image) à tout moment. Pour exercer ces droits : utilisez la page Contact ou écrivez à propulsounddj@gmail.com (réponse sous 30 jours). Vous pouvez également saisir la CNIL (cnil.fr) en cas de litige.",
  },
  {
    title: "7. Droit à l'image",
    content:
      "Les photographies et vidéos de vos événements ne sont publiées (galerie, réseaux sociaux) qu'avec votre accord, formalisé dans l'article 11 du contrat de prestation. Vous pouvez révoquer ce consentement à tout moment par écrit : les contenus concernés sont alors retirés dans les meilleurs délais. Les visiteurs du site qui souhaitent le retrait d'une photo les concernant peuvent nous écrire via la page Contact.",
  },
  {
    title: "8. Sécurité",
    content:
      "Connexions chiffrées (HTTPS), accès aux données d'administration restreint et protégé par mot de passe, séparation des accès clients (authentification Supabase), signatures de documents horodatées. Aucune donnée bancaire ne transite par nos serveurs : elles sont traitées uniquement par Stripe, certifié PCI DSS.",
  },
  {
    title: "9. Cookies",
    content:
      "Consultez notre politique cookies dédiée pour le détail des traceurs utilisés : le site n'utilise que des cookies strictement nécessaires (session de connexion, sécurité) et une mesure d'audience sans cookie (Vercel Analytics), exemptés de consentement.",
  },
];

export default function PolitiqueConfidentialitePage() {
  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-3xl px-4 py-10">
        <FadeIn>
          <h1 className="text-3xl font-medium tracking-tight">
            Politique de confidentialité
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Dernière mise à jour : septembre 2026 — conformité RGPD et loi
            Informatique et Libertés.
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
            Une question sur vos données ?{" "}
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
      <SiteFooter />
    </>
  );
}

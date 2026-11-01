// Gabarit des pages événement SEO (/mariage, /anniversaire, /evenement-entreprise) :
// structure commune, contenu unique par type d'événement + FAQ enrichie JSON-LD.
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { INTERVENTION_ZONES } from "@/lib/site-url";

export type EventLandingData = {
  /** Chemin de la page (pour le JSON-LD) */
  path: string;
  title: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  photo: string;
  photoAlt: string;
  intro: string[];
  highlights: { title: string; text: string }[];
  faq: { q: string; a: string }[];
  /** Section optionnelle « déroulé type » (liste ordonnée, en bas de page) */
  timeline?: { label: string; detail: string }[];
  /** Section optionnelle supplémentaire (liste à puces, en bas de page) */
  extraSection?: { title: string; intro: string; list: string[] };
};

export function EventLanding({ data }: { data: EventLandingData }) {
  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-4xl px-4 py-10">
        {/* Fil d'Ariane structuré (SEO) : hiérarchie claire pour Google/IA */}
        <BreadcrumbJsonLd
          items={[
            { name: "Accueil", href: "/" },
            { name: data.title, href: data.path },
          ]}
        />
        {/* FAQ enrichie pour Google (extrait étoilé / réponse directe) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: data.faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          }}
        />

        <FadeIn>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{data.title}</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{data.subtitle}</p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="relative mt-8 overflow-hidden rounded-2xl border border-border">
            <Image
              src={data.photo}
              alt={data.photoAlt}
              width={1200}
              height={800}
              priority
              className="aspect-[2/1] w-full object-cover"
            />
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mt-10 space-y-4 text-muted-foreground">
            {data.intro.map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h2 className="mt-14 text-2xl font-medium tracking-tight">Ce qui est prévu pour vous</h2>
          {/* Vraie liste HTML (<ul>/<li>) : signal de richesse de contenu fort
              pour les moteurs de recherche et les moteurs IA */}
          <ul className="mt-6 grid list-none gap-4 sm:grid-cols-2">
            {data.highlights.map((h) => (
              <li key={h.title} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-medium text-accent">{h.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{h.text}</p>
              </li>
            ))}
          </ul>
        </FadeIn>

        <FadeIn delay={0.25}>
          <h2 className="mt-14 text-2xl font-medium tracking-tight">Questions fréquentes</h2>
          <div className="mt-6 space-y-3">
            {data.faq.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-border bg-card p-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="cursor-pointer font-medium marker:hidden">
                  <span className="mr-2 text-accent transition-transform group-open:rotate-90 inline-block">›</span>
                  {f.q}
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </FadeIn>

        {data.timeline && data.timeline.length > 0 ? (
          <FadeIn delay={0.26}>
            <h2 className="mt-14 text-2xl font-medium tracking-tight">
              Le déroulé type de votre soirée
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              À titre d&apos;exemple — le vôtre est construit avec vous, au
              détail près, dans votre espace client.
            </p>
            <ol className="mt-6 space-y-3">
              {data.timeline.map((step) => (
                <li
                  key={step.label}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                    ✓
                  </span>
                  <span>
                    <span className="font-medium">{step.label}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {step.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </FadeIn>
        ) : null}

        {data.extraSection ? (
          <FadeIn delay={0.27}>
            <h2 className="mt-14 text-2xl font-medium tracking-tight">
              {data.extraSection.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.extraSection.intro}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {data.extraSection.list.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 text-accent" aria-hidden>
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </FadeIn>
        ) : null}

        <FadeIn delay={0.28}>
          <h2 className="mt-14 text-2xl font-medium tracking-tight">Zones d&apos;intervention</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Basé à Blois (Huisseau-sur-Cosson), Propul&apos;Sound DJ se déplace dans tout le
            Loir-et-Cher et les départements voisins — déplacement offert dans un rayon de
            30 km, au-delà les frais sont calculés automatiquement dans le devis en ligne.
          </p>
          {/* Liste des villes desservies : signal local fort pour le SEO */}
          <ul className="mt-4 flex flex-wrap gap-2">
            {INTERVENTION_ZONES.map((zone) => (
              <li
                key={zone}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
              >
                {zone}
              </li>
            ))}
          </ul>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="mt-14 rounded-xl border border-accent/40 bg-accent/5 p-6 text-center">
            <h2 className="text-xl font-medium">Votre date est encore libre ?</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Configurez votre devis en ligne en quelques minutes — tarif en direct, sans
              engagement, paiement en plusieurs fois possible.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href="/formules" className="btn-primary">
                Configurer mon devis
              </Link>
              <Link href="/disponibilites" className="btn-outline">
                Voir les disponibilités
              </Link>
            </div>
          </div>
        </FadeIn>
      </main>
      <SiteFooter />
    </>
  );
}

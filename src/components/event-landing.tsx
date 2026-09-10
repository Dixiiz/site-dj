// Gabarit des pages événement SEO (/mariage, /anniversaire, /evenement-entreprise) :
// structure commune, contenu unique par type d'événement + FAQ enrichie JSON-LD.
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";

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
};

export function EventLanding({ data }: { data: EventLandingData }) {
  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-4xl px-4 py-10">
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
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {data.highlights.map((h) => (
              <div key={h.title} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-medium text-accent">{h.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{h.text}</p>
              </div>
            ))}
          </div>
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
    </>
  );
}

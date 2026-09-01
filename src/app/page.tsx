import { existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { SiteHeader } from "@/components/site-header";
import { FadeIn } from "@/components/fade-in";
import { GoogleReviews } from "@/components/google-reviews";
import { Gallery } from "@/components/gallery";
import { HeroVideo } from "@/components/hero-video";
import { VideoShowcase } from "@/components/video-showcase";
import { TIKTOK_PROFILE_URL } from "@/config/tiktok";
import Link from "next/link";


export const metadata = {
  title: "Propul'Sound DJ — DJ & animations événementielles",
  description:
    "DJ professionnel basé à Huisseau-sur-Cosson : mariages, anniversaires, soirées privées et événements d'entreprise en Loir-et-Cher et alentours.",
};

const services = [
  {
    title: "Mariages",
    description:
      "Une ambiance sur-mesure pour le plus beau jour de votre vie : cocktail, dîner et piste de danse jusqu'au bout de la nuit.",
  },
  {
    title: "Anniversaires & soirées privées",
    description:
      "Anniversaires, fiançailles, fêtes entre amis : une programmation musicale qui met tout le monde d'accord.",
  },
  {
    title: "Événements d'entreprise",
    description:
      "Séminaires, soirées de gala, arbres de Noël : une prestation professionnelle et adaptée à votre image.",
  },
  {
    title: "Son & lumière",
    description:
      "Matériel professionnel : sonorisation, éclairages dynamiques et machine à fumée pour une ambiance immersive.",
  },
];

export default function Home() {
  const hasHeroVideo = existsSync(join(process.cwd(), "public", "videos", "hero.mp4"));
  const showcaseDir = join(process.cwd(), "public", "videos", "showcase");
  const showcaseVideos = existsSync(showcaseDir)
    ? readdirSync(showcaseDir)
        .filter((f) => /\.(mp4|webm|mov)$/i.test(f))
        .sort()
        .map((f) => `/videos/showcase/${encodeURIComponent(f)}`)
    : [];

  return (
    <>
      <SiteHeader />
      <main className="relative">
        {/* Héro — avec vidéo de fond si public/videos/hero.mp4 existe */}
        <section className="relative mx-auto w-full max-w-5xl px-4 pt-20 pb-16 text-center sm:pt-28">
          {hasHeroVideo && <HeroVideo />}
          <FadeIn>
            <p className="text-sm tracking-[0.3em] text-accent uppercase">
              DJ &amp; animations — Loir-et-Cher
            </p>
            <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-medium tracking-tight text-glow sm:text-5xl">
              Mettez de l&apos;énergie dans vos événements avec{" "}
              <span className="text-accent">Propul&apos;Sound DJ</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              DJ &amp; Show Lumière à proximité de Blois. Une ambiance électro moderne et du
              matériel professionnel pour illuminer et faire vibrer vos événements.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/devis"
                className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg transition hover:brightness-110"
              >
                Demander un devis
              </Link>
              <Link
                href="/formules"
                className="rounded-lg border border-border px-6 py-3 font-medium transition hover:border-accent hover:text-accent"
              >
                Découvrir les formules
              </Link>
            </div>
          </FadeIn>
        </section>

        {/* Galerie photos */}
        <Gallery />

        {/* Vidéos "En action" : déposées dans public/videos/showcase/ */}
        {showcaseVideos.length > 0 && (
          <section className="mx-auto w-full max-w-5xl px-4 pb-4 text-center">
            <FadeIn>
              <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
                Propul&apos;Sound <span className="text-accent">en action</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                Quelques extraits de nos soirées — survolez une vidéo pour la lancer.
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <VideoShowcase videos={showcaseVideos} orientation="portrait" />
            </FadeIn>
            {TIKTOK_PROFILE_URL && (
              <FadeIn delay={0.2}>
                <a
                  href={TIKTOK_PROFILE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium transition hover:border-accent hover:text-accent"
                >
                  Plus de vidéos sur TikTok
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M7 17 17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </a>
              </FadeIn>
            )}
          </section>
        )}

        {/* Présentation + services */}
        <section className="mx-auto w-full max-w-5xl px-4 py-20">
          <FadeIn as="section" className="relative overflow-hidden rounded-3xl border border-border">
            {/* Halos décoratifs : confinés dans la carte pour ne jamais
                interférer avec les fondus de la vidéo du héro */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/25 blur-3xl"
            />
            {/* Photo de fond : se fond dans le bleu du site par un dégradé */}
            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/galerie/moi.jpg')" }}
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/40"
            />

            <div className="relative grid items-center gap-10 p-8 sm:p-12 md:grid-cols-2">
              <div>
                <p className="text-sm tracking-[0.2em] text-accent uppercase">Qui suis-je ?</p>
                <h2 className="mt-2 text-3xl font-medium tracking-tight">
                  Une passion, une exigence
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Passionné de musique et d&apos;ambiance, Propul&apos;Sound DJ accompagne vos
                  événements en Loir-et-Cher et dans toute la région. Chaque prestation est
                  préparée avec vous : sélection musicale personnalisée, synchronisation des
                  temps forts et adaptation en direct à votre public.
                </p>
                <p className="mt-3 text-muted-foreground">
                  Du son cristallin aux lumières qui suivent le rythme, tout est pensé pour que
                  vous n&apos;ayez qu&apos;une chose à faire : profiter.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((service) => (
                  <div
                    key={service.title}
                    className="rounded-xl border border-border bg-background/70 p-5 backdrop-blur-sm transition hover:border-accent/50"
                  >
                    <h3 className="font-medium text-accent">{service.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Appel à l'action */}
        <section className="mx-auto w-full max-w-3xl px-4 pb-20 text-center">
          <FadeIn>
            <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
              Prêt à réserver votre date ?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Configurez votre devis en ligne en quelques minutes : formule, options, lieu et
              créneau. Réponse rapide garantie.
            </p>
            <Link
              href="/devis"
              className="mt-6 inline-block rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground shadow-lg transition hover:brightness-110"
            >
              Configurer mon devis
            </Link>
          </FadeIn>
        </section>

        {/* Avis clients Google */}
        <GoogleReviews />
      </main>
      <footer className="border-t border-white/10 py-8 text-center text-sm text-muted-foreground">
        Propul&apos;Sound DJ — Huisseau-sur-Cosson (41350) · Déplacement offert dans un rayon de
        30 km
      </footer>
    </>
  );
}


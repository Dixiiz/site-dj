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
import { getOrder, listMedia } from "@/lib/site-media";
import { SITE_URL } from "@/lib/site-url";
import Link from "next/link";

// La page d'accueil est régénérée au maximum toutes les 5 minutes (cache) :
// les médias ne changent que via l'admin, pas besoin de tout requêter à chaque visite.
export const revalidate = 300;

export const metadata = {
  title: "Propul'Sound DJ — DJ & animations événementielles",
  description:
 "DJ professionnel basé à Huisseau-sur-Cosson : mariages, anniversaires, soirées privées et événements d'entreprise en Loir-et-Cher et alentours.",
};

const services = [
  {
    title: "Mariages",
    description:
 "Une ambiance sur-mesure pour le plus beau jour de votre vie : cérémonie, cocktail, dîner et piste de danse jusqu'au bout de la nuit.",
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
    title: "Bars, clubs & soirées pro",
    description:
 "Sets adaptés à votre public : électro, house, hits du moment — je m'adapte à l'ambiance de votre établissement et de votre clientèle.",
  },
];

export default async function Home() {
  const hasHeroVideo = existsSync(join(process.cwd(), "public", "videos", "hero.mp4"));
  const showcaseDir = join(process.cwd(), "public", "videos", "showcase");
  const localShowcase = existsSync(showcaseDir)
    ? readdirSync(showcaseDir)
        .filter((f) => /\.(mp4|webm|mov)$/i.test(f))
        .sort()
        .map((f) => `/videos/showcase/${encodeURIComponent(f)}`)
    : [];
  // Requêtes Supabase en parallèle (au lieu de séquentiel) : la page démarre
  // bien plus vite, et la page est régénérée au max toutes les 5 min (cache).
  const [storageShowcase, showcaseOrder, storageHero] = await Promise.all([
    listMedia("videos/showcase")
      .then((files) => files.map((f) => f.url))
      .catch(() => [] as string[]),
    getOrder("videos/showcase").catch(() => [] as string[]),
    listMedia("videos")
      .then((files) => files.find((f) => /^hero/i.test(f.name))?.url ?? files[0]?.url ?? null)
      .catch(() => null),
  ]);
  const showcaseAll = [...storageShowcase, ...localShowcase.filter((src) => !storageShowcase.some((u) => u.endsWith(src.split("/").pop() ?? "")))];
  let showcaseVideos: string[];
  if (showcaseOrder.length > 0) {
    const byName = new Map(
      showcaseAll.map((url) => [decodeURIComponent(url.split("/").pop() ?? ""), url])
    );
    showcaseVideos = showcaseOrder.map((n) => byName.get(n)).filter((u): u is string => !!u);
    for (const url of showcaseAll) {
      const name = decodeURIComponent(url.split("/").pop() ?? "");
      if (!showcaseOrder.includes(name)) showcaseVideos.push(url);
    }
  } else {
    showcaseVideos = showcaseAll;
  }
  const heroSrc = storageHero ?? (hasHeroVideo ? "/videos/hero.mp4" : null);

  return (
    <>
      <SiteHeader />
      {/* Données structurées SEO/GEO : DJ local + FAQ (extraits enrichis Google, compréhension par les IA) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
 "@context": "https://schema.org",
 "@graph": [
              {
 "@type": "DJ",
              name: "Propul'Sound DJ",
              description:
 "DJ généraliste et techno pour mariages, anniversaires et soirées privées. Sonorisation, lumière et options FX incluses.",
              url: SITE_URL,
              telephone: "+33674850769",
              email: "propulsounddj@gmail.com",
              founder: { "@type": "Person", name: "Maxime SOULAINE" },
              address: {
 "@type": "PostalAddress",
                streetAddress: "5 Clos de la Salamandre",
                addressLocality: "Huisseau-sur-Cosson",
                postalCode: "41350",
                addressRegion: "Centre-Val de Loire",
                addressCountry: "FR",
              },
              areaServed: [
                { "@type": "City", name: "Blois" },
                { "@type": "City", name: "Vendôme" },
                { "@type": "City", name: "Romorantin-Lanthenay" },
                { "@type": "City", name: "Amboise" },
                { "@type": "City", name: "La Ferté-Bernard" },
                { "@type": "City", name: "Morée" },
                { "@type": "City", name: "Chambord" },
                { "@type": "City", name: "Montrichard" },
                { "@type": "AdministrativeArea", name: "Loir-et-Cher" },
              ],
              geo: { "@type": "GeoCoordinates", latitude: 47.5667, longitude: 1.4667 },
              priceRange: "€€",
              sameAs: [
 "https://www.instagram.com/propulsounddj/",
 "https://linkaband.com/propulsound-dj",
 "https://www.mariages.net/musique-mariage/propulsound-dj--e366139",
 "https://g.page/r/CYgCQMSAgDcWEAE",
              ],
              makesOffer: [
                { "@type": "Offer", name: "Pack Mariage", description: "Prestation DJ mariage clé en main" },
                { "@type": "Offer", name: "Pack Anniversaire", description: "Animation DJ anniversaire" },
                { "@type": "Offer", name: "Pack Soirée privée / Bar-Club", description: "DJ pour soirées privées et bars" },
              ],
            },
            {
 "@type": "FAQPage",
              mainEntity: [
                {
 "@type": "Question",
                  name: "Dans quelles zones Propul'Sound DJ intervient-il ?",
                  acceptedAnswer: {
 "@type": "Answer",
                    text: "Basé à Huisseau-sur-Cosson (41350), Propul'Sound DJ intervient à Blois, Vendôme, Morée et dans un rayon de 50 km autour. Les 30 premiers kilomètres de déplacement sont offerts.",
                  },
                },
                {
 "@type": "Question",
                  name: "Combien coûte une prestation DJ pour un mariage ?",
                  acceptedAnswer: {
 "@type": "Answer",
                    text: "Les tarifs dépendent de la formule, de la durée et des options. Le site propose un configurateur de devis en ligne gratuit qui calcule le prix en temps réel, acompte de réservation de 20 %, solde arrondi au multiple de 10 €.",
                  },
                },
                {
 "@type": "Question",
                  name: "Comment réserver une date ?",
                  acceptedAnswer: {
 "@type": "Answer",
                    text: "Créez votre devis en ligne, signez le devis et le contrat électroniquement dans votre espace client, puis réglez l'acompte de réservation. La date est bloquée dès la signature des documents.",
                  },
                },
                {
 "@type": "Question",
                  name: "Les options comme la machine à fumée ou les étincelles froides sont-elles disponibles ?",
                  acceptedAnswer: {
 "@type": "Answer",
                    text: "Oui : machine à fumée lourde, étincelles froides et pistolet à confettis CO2 sont proposées en options et peuvent être ajoutées au devis en ligne.",
                  },
                },
              ],
            },
            ],
          }),
        }}
      />
      <main className="relative">
        {/* Héro — avec vidéo de fond si public/videos/hero.mp4 existe */}
        <section className="relative mx-auto w-full max-w-5xl px-4 pt-20 pb-16 text-center sm:pt-28">
          {heroSrc && <HeroVideo src={heroSrc} />}
          <FadeIn>
            <p className="text-sm tracking-[0.3em] text-accent uppercase">
              DJ &amp; animations — Loir-et-Cher
            </p>
            <h1
              className="mx-auto mt-4 max-w-4xl text-5xl font-normal tracking-tight text-glow sm:text-7xl"
              style={{ fontFamily: "var(--font-fjalla), sans-serif" }}
            >
              Mettez de l&apos;énergie dans vos événements avec{" "}
              <span className="text-accent">Propul&apos;Sound DJ</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              DJ &amp; Show Lumière à proximité de Blois. Une ambiance électro moderne et du
              matériel professionnel pour illuminer et faire vibrer vos événements.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/formules"
                className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg transition hover:brightness-110"
              >
                Demander un devis
              </Link>
              <Link
                href="/disponibilites"
                className="rounded-lg border border-border px-6 py-3 font-medium transition hover:border-accent hover:text-accent"
              >
                Voir les disponibilités
              </Link>
            </div>
          </FadeIn>
        </section>

        {/* Galerie photos */}
        <Gallery />

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
                <h2 className="mt-2 text-4xl tracking-tight">
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
            <h2 className="text-4xl tracking-tight sm:text-5xl">
              Prêt à réserver votre date ?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Configurez votre devis en ligne en quelques minutes : formule, options, lieu,
              date et horaires. Réponse rapide garantie.
            </p>
            <Link
              href="/formules"
              className="mt-6 inline-block rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground shadow-lg transition hover:brightness-110"
            >
              Configurer mon devis
            </Link>
          </FadeIn>
        </section>

        {/* Avis clients Google */}
        {/* Vidéos "En action" (clips TikTok auto-hébergés) — juste avant les avis */}
        {showcaseVideos.length > 0 && (
          <section className="mx-auto w-full max-w-5xl px-4 pb-4 text-center">
            <FadeIn>
              <h2 className="text-4xl tracking-tight sm:text-5xl">
                Propul&apos;Sound <span className="text-accent">en action</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                Quelques extraits de nos soirées — survolez ou touchez une vidéo pour la lancer.
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

        <GoogleReviews />

        {/* Badges confiance : Linkaband + Mariages.net */}
        <div className="flex flex-wrap items-center justify-center gap-4 pb-8 -mt-2">
          <a
            href="https://linkaband.com/propulsound-dj?utm_source=badge&utm_campaign=161495"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Réservation confirmée sur Linkaband"
            className="transition-transform hover:scale-105"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://linkaband.com/assets/images/validation/reservation-noir.png"
              alt="Propul'Sound DJ — Réservation confirmée sur Linkaband"
              width={130}
              height={130}
              loading="lazy"
              className="rounded-lg"
            />
          </a>
          <a
            href="https://www.mariages.net/musique-mariage/propulsound-dj--e366139"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Profil Propul'Sound DJ sur Mariages.net — 4,8/5"
            className="flex h-[130px] w-[130px] flex-col items-center justify-center gap-1 rounded-lg border border-border bg-[#12233a] text-center transition-transform hover:scale-105"
          >
            <span className="text-[13px] font-semibold leading-tight text-white">
              Mariages<span className="text-[#f06292]">.net</span>
            </span>
            <span className="text-lg font-bold leading-none text-[#f06292]">4,8<span className="text-xs text-white/70">/5</span></span>
            <span className="text-[10px] leading-tight text-[#fbb1c9]">★★★★★</span>
            <span className="px-2 text-[9px] leading-tight text-white/60">Profil vérifié depuis 2024</span>
          </a>
        </div>
      </main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Propul&apos;Sound DJ — Huisseau-sur-Cosson (41350) · Déplacement offert dans un rayon de
        30 km
        <div className="mt-2">
          <Link href="/mentions-legales" className="text-xs transition-colors hover:text-accent">
            Mentions légales
          </Link>
        </div>
      </footer>
    </>
  );
}


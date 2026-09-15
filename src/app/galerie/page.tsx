// Galerie publique : grille statique des photos (même source que le
// carrousel de l'accueil), avec le nom du photographe en bas à droite au
// survol (desktop) et en permanence, en tout petit, sur mobile.
import type { Metadata } from "next";
import Image from "next/image";
import { Camera, MapPin } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  getCreditsBundle,
  getOrder,
  listLocalMedia,
  listMedia,
  type MediaCreditsBundle,
  type MediaItem,
} from "@/lib/site-media";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Galerie — photos & vidéos de prestations",
  description:
    "Photos et vidéos des mariages, anniversaires et soirées animés par Propul'Sound DJ, créditées à leurs photographes.",
};

// Fusion stockage + local, ordre admin si défini sinon tri alphabétique.
async function mergedPhotos(): Promise<MediaItem[]> {
  const [storage, local, order] = await Promise.all([
    listMedia("galerie").then((files) =>
      files.map((f) => ({ ...f, origin: "storage" as const }))
    ),
    Promise.resolve(listLocalMedia("galerie")),
    getOrder("galerie").catch(() => [] as string[]),
  ]);
  const all = [...storage, ...local.filter((l) => !storage.some((s) => s.name === l.name))];
  const byName = new Map(all.map((m) => [m.name, m]));
  const sorted: MediaItem[] = [];
  for (const name of order) {
    const item = byName.get(name);
    if (item) {
      sorted.push(item);
      byName.delete(name);
    }
  }
  return [...sorted, ...byName.values()];
}

// Vidéos showcase (uploadées dans Admin → Médias) : stockage + repli local.
async function mergedVideos(): Promise<MediaItem[]> {
  const [storage, local] = await Promise.all([
    listMedia("videos/showcase").then((files) =>
      files.map((f) => ({ ...f, origin: "storage" as const }))
    ),
    Promise.resolve(listLocalMedia("videos/showcase")),
  ]);
  return [...storage, ...local.filter((l) => !storage.some((s) => s.name === l.name))];
}

export default async function GaleriePage() {
  const [photos, videos, credits] = await Promise.all([
    mergedPhotos(),
    mergedVideos(),
    getCreditsBundle("galerie").catch(() => ({
      photographers: {},
      lieux: {},
    }) as MediaCreditsBundle),
  ]);

  // photo name → photographe / lieu
  const photoToPhotographer = new Map<string, string>();
  for (const [photographer, names] of Object.entries(credits.photographers)) {
    for (const name of names) photoToPhotographer.set(name, photographer);
  }
  const photoToLieu = new Map<string, string>();
  for (const [lieu, names] of Object.entries(credits.lieux)) {
    for (const name of names) photoToLieu.set(name, lieu);
  }

  // Données structurées (SEO) : galerie + créateur et lieu de chaque photo.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: "Galerie — Propul'Sound DJ",
    description:
      "Photos des mariages, anniversaires et soirées animés par Propul'Sound DJ.",
    url: `${SITE_URL}/galerie`,
    associatedMedia: photos.map((photo) => ({
      "@type": "ImageObject",
      contentUrl: photo.url.startsWith("http")
        ? photo.url
        : `${SITE_URL}${photo.url}`,
      name: `Prestation Propul'Sound DJ${photoToLieu.get(photo.name) ? ` — ${photoToLieu.get(photo.name)}` : ""}`,
      ...(photoToPhotographer.get(photo.name)
        ? {
            creator: {
              "@type": "Person",
              name: photoToPhotographer.get(photo.name),
            },
          }
        : {}),
      ...(photoToLieu.get(photo.name)
        ? {
            contentLocation: {
              "@type": "Place",
              name: photoToLieu.get(photo.name),
            },
          }
        : {}),
    })),
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Retour : fonctionne même si la page a été ouverte directement */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-accent"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour à l&apos;accueil
        </Link>
        <p className="mt-4 text-center text-sm uppercase tracking-[0.2em] text-accent">Galerie</p>
      <h1 className="mt-2 text-center text-2xl font-medium tracking-tight sm:text-3xl">
        Nos dernières prestations
      </h1>
      <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground">
        Merci aux photographes qui ont saisi ces instants — leur nom apparaît
        au survol de chaque photo (en permanence sur mobile).
      </p>

      {photos.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Aucune photo pour le moment.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => {
            const photographer = photoToPhotographer.get(photo.name);
            const lieu = photoToLieu.get(photo.name);
            const altParts = ["Prestation Propul'Sound DJ"];
            if (photographer) altParts.push(`photo ${photographer}`);
            if (lieu) altParts.push(lieu);
            return (
              <figure
                key={photo.name}
                className="group relative aspect-square overflow-hidden rounded-2xl"
              >
                <Image
                  src={photo.url}
                  alt={altParts.join(", ")}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {photographer || lieu ? (
                  <div className="pointer-events-none absolute bottom-2 right-2 flex flex-col items-end gap-1 transition-all duration-300 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                    {photographer ? (
                      <figcaption className="flex items-center gap-1 rounded-full bg-background/25 px-2.5 py-1 text-[11px] font-medium text-foreground/90">
                        <Camera className="size-3" aria-hidden />
                        {photographer}
                      </figcaption>
                    ) : null}
                    {lieu ? (
                      <figcaption className="flex items-center gap-1 rounded-full bg-background/25 px-2.5 py-1 text-[11px] font-medium text-foreground/90">
                        <MapPin className="size-3" aria-hidden />
                        {lieu}
                      </figcaption>
                    ) : null}
                  </div>
                ) : null}
              </figure>
            );
          })}
        </div>
      )}

      {/* Vidéos : extraits des prestations (upload dans Admin → Médias).
          Masqué entièrement tant qu'aucune vidéo n'est disponible. */}
      {videos.length > 0 ? (
        <section className="mt-14">
          <p className="text-center text-sm uppercase tracking-[0.2em] text-accent">Vidéos</p>
          <h2 className="mt-2 text-center text-xl font-medium tracking-tight sm:text-2xl">
            La piste de danse en action
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {videos.map((video) => (
              <figure key={video.name} className="overflow-hidden rounded-2xl border border-border">
                <video
                  src={video.url}
                  controls
                  preload="metadata"
                  playsInline
                  className="aspect-video w-full bg-background"
                />
                <figcaption className="px-3 py-2 text-xs text-muted-foreground">
                  Prestation Propul&apos;Sound DJ
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
      </main>
    </>
  );
}

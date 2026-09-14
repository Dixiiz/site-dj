// Galerie publique : grille statique des photos (même source que le
// carrousel de l'accueil), avec le nom du photographe en bas à droite au
// survol (desktop) et en permanence, en tout petit, sur mobile.
import type { Metadata } from "next";
import Image from "next/image";
import {
  getCredits,
  getOrder,
  listLocalMedia,
  listMedia,
  type MediaCredits,
  type MediaItem,
} from "@/lib/site-media";

export const metadata: Metadata = {
  title: "Galerie — photos de prestations",
  description:
    "Photos des mariages, anniversaires et soirées animés par Propul'Sound DJ, créditées à leurs photographes.",
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

export default async function GaleriePage() {
  const [photos, credits] = await Promise.all([
    mergedPhotos(),
    getCredits("galerie").catch(() => ({}) as MediaCredits),
  ]);

  // photo name → photographe
  const photoToPhotographer = new Map<string, string>();
  for (const [photographer, names] of Object.entries(credits)) {
    for (const name of names) photoToPhotographer.set(name, photographer);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <p className="text-center text-sm uppercase tracking-[0.2em] text-accent">Galerie</p>
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
            return (
              <figure
                key={photo.name}
                className="group relative aspect-square overflow-hidden rounded-2xl"
              >
                <Image
                  src={photo.url}
                  alt={`Prestation Propul'Sound DJ${photographer ? ` — photo ${photographer}` : ""}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {photographer ? (
                  <figcaption
                    className="absolute bottom-2 right-2 rounded-full bg-background/70 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm transition-all duration-300 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
                  >
                    📷 {photographer}
                  </figcaption>
                ) : null}
              </figure>
            );
          })}
        </div>
      )}
    </main>
  );
}

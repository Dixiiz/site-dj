import Image from "next/image";
import { FadeIn } from "@/components/fade-in";
import { readdirSync } from "node:fs";
import { join } from "node:path";

// Lit automatiquement les images du dossier /public/galerie
function listGalleryPhotos(): string[] {
  try {
    const dir = join(process.cwd(), "public", "galerie");
    return readdirSync(dir)
      .filter((file) => /\.(jpe?g|png|webp|avif)$/i.test(file))
      .sort()
      .map((file) => `/galerie/${file}`);
  } catch {
    return [];
  }
}

// Mélange déterministe : l'ordre change chaque jour (graine = date du jour).
function shuffleByDay<T>(items: T[]): T[] {
  const seed = Number(
    new Date().toISOString().slice(0, 10).replaceAll("-", "")
  );
  let state = seed % 2147483647;
  const rand = () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function Gallery() {
  const photos = shuffleByDay(listGalleryPhotos());

  if (photos.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10">
      <FadeIn>
        <p className="text-center text-sm tracking-[0.2em] text-accent uppercase">Galerie</p>
        <h2 className="mt-2 text-center text-3xl font-medium tracking-tight">
          Nos dernières prestations
        </h2>
      </FadeIn>
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {photos.map((src, index) => (
          <FadeIn key={src} delay={Math.min(index, 8) * 0.05}>
            <div className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-card">
              <Image
                src={src}
                alt="Prestation Propul'Sound DJ"
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}


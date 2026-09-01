// Composant serveur : lit le dossier /public/galerie et mélange les photos
// (ordre changeant chaque jour), puis passe la liste au carrousel client.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { GalleryCarousel } from "@/components/gallery-carousel";

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
  const photos = shuffleByDay(listGalleryPhotos()).filter(
    (src) => src !== "/galerie/moi.jpg" // réservée à la section "Qui suis-je ?"
  );
  return <GalleryCarousel photos={photos} />;
}



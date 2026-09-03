// Composant serveur : lit les photos du bucket Supabase « site-media »
// et/ou du dossier /public/galerie, mélange le tout (ordre changeant chaque
// jour), puis passe la liste au carrousel client.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { GalleryCarousel } from "@/components/gallery-carousel";
import { getOrder, listMedia } from "@/lib/site-media";

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

export async function Gallery() {
  const storage = await listMedia("galerie").catch(() => []);
  const local = listGalleryPhotos().filter((src) => src !== "/galerie/moi.jpg");
  const storageUrls = storage.map((f) => f.url);
  const all = [...storageUrls, ...local.filter((src) => !storageUrls.some((u) => u.endsWith(src.split("/").pop() ?? "")))]
    .filter((url) => (url.split("/").pop() ?? "") !== "moi.jpg"); // réservée à "Qui suis-je ?"
  // Ordre défini dans l'admin s'il existe, sinon mélange journalier.
  const order = await getOrder("galerie").catch(() => [] as string[]);
  let photos: string[];
  if (order.length > 0) {
    const byName = new Map(
      all.map((url) => [decodeURIComponent(url.split("/").pop() ?? ""), url])
    );
    photos = order.map((n) => byName.get(n)).filter((u): u is string => !!u);
    for (const url of all) {
      const name = decodeURIComponent(url.split("/").pop() ?? "");
      if (!order.includes(name)) photos.push(url);
    }
  } else {
    photos = shuffleByDay(all);
  }
  return <GalleryCarousel photos={[...new Set(photos)]} />;
}



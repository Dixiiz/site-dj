import Image from "next/image";
import { FadeIn } from "@/components/fade-in";

// Liste des photos de la galerie : déposez vos images dans /public/galerie
// et ajoutez-les ici (nom du fichier + légende optionnelle).
const photos: { src: string; alt: string }[] = [
  { src: "/galerie/photo-1.jpg", alt: "Prestation DJ — piste de danse" },
  { src: "/galerie/photo-2.jpg", alt: "Installation son & lumière" },
  { src: "/galerie/photo-3.jpg", alt: "Ambiance de soirée" },
  { src: "/galerie/photo-4.jpg", alt: "Mariage animé par Propul'Sound DJ" },
  { src: "/galerie/photo-5.jpg", alt: "Matériel professionnel" },
  { src: "/galerie/photo-6.jpg", alt: "Soirée privée" },
];

export function Gallery() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10">
      <FadeIn>
        <p className="text-center text-sm tracking-[0.2em] text-accent uppercase">Galerie</p>
        <h2 className="mt-2 text-center text-3xl font-medium tracking-tight">
          Nos dernières prestations
        </h2>
      </FadeIn>
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {photos.map((photo, index) => (
          <FadeIn key={photo.src} delay={index * 0.05}>
            <div className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-card">
              <Image
                src={photo.src}
                alt={photo.alt}
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

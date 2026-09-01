"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { FadeIn } from "@/components/fade-in";

const AUTOPLAY_MS = 3000;
const VISIBLE = 3; // photos visibles simultanément

export function GalleryCarousel({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (paused || photos.length <= VISIBLE) return;
    timer.current = setInterval(next, AUTOPLAY_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, next, photos.length]);

  if (photos.length === 0) return null;

  // Triplet étendu pour une boucle visuelle fluide
  const extended = [...photos, ...photos.slice(0, VISIBLE)];

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10">
      <FadeIn>
        <p className="text-center text-sm tracking-[0.2em] text-accent uppercase">Galerie</p>
        <h2 className="mt-2 text-center text-3xl font-medium tracking-tight">
          Nos dernières prestations
        </h2>
      </FadeIn>

      <FadeIn delay={0.1} className="relative mt-10">
        <div
          className="overflow-hidden rounded-2xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${(index * 100) / VISIBLE}%)` }}
          >
            {extended.map((src, i) => (
              <div key={`${src}-${i}`} className="w-full shrink-0 sm:w-1/3">
                <div className="relative aspect-square border-r border-border">
                  <Image
                    src={src}
                    alt="Prestation Propul'Sound DJ"
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                    priority={i < VISIBLE}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flèches */}
        <button
          type="button"
          onClick={prev}
          aria-label="Photo précédente"
          className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2.5 backdrop-blur transition hover:border-accent hover:text-accent"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Photo suivante"
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2.5 backdrop-blur transition hover:border-accent hover:text-accent"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </FadeIn>
    </section>
  );
}

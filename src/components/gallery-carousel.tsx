"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { FadeIn } from "@/components/fade-in";

const AUTOPLAY_MS = 5000;
const VISIBLE_DESKTOP = 3; // photos visibles simultanément sur desktop

export function GalleryCarousel({ photos }: { photos: string[] }) {
  const [rawIndex, setRawIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(VISIBLE_DESKTOP);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1 photo visible en mobile, 3 sur écran large (cohérent avec les largeurs w-1/3).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setVisible(mq.matches ? VISIBLE_DESKTOP : 1);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (paused || photos.length <= visible) return;
    timer.current = setInterval(next, AUTOPLAY_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, next, photos.length, visible]);

  // Index toujours valide, quel que soit le mode (1 ou 3 photos visibles).
  const index = rawIndex % photos.length;

  if (photos.length === 0) return null;

  // Suite étendue pour une boucle visuelle fluide
  const extended = [...photos, ...photos.slice(0, visible)];

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10">
      <FadeIn>
        <p className="text-center text-sm tracking-[0.2em] text-accent uppercase">Galerie</p>
        <h2 className="mt-2 text-center text-2xl font-medium tracking-tight sm:text-3xl">
          Nos dernières prestations
        </h2>
      </FadeIn>

      <FadeIn delay={0.1} className="relative mt-8 sm:mt-10">
        <div
          className="touch-pan-y overflow-hidden rounded-2xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="flex transition-transform ease-in-out"
            style={{
              transform: `translateX(-${(index * 100) / visible}%)`,
              transitionDuration: "1200ms",
            }}
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
                    priority={i < visible}
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

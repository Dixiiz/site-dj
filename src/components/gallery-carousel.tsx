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
    setRawIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const prev = useCallback(() => {
    setRawIndex((i) => (i - 1 + photos.length) % photos.length);
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

  // Trop peu de photos pour un défilement en boucle : grille simple, sans clonage
  if (photos.length <= visible) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <FadeIn>
          <p className="text-center text-sm tracking-[0.2em] text-accent uppercase">Galerie</p>
          <h2 className="mt-2 text-center text-2xl font-medium tracking-tight sm:text-3xl">
            Nos dernières prestations
          </h2>
        </FadeIn>
        <FadeIn delay={0.1} className="mt-8 sm:mt-10">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {photos.map((src) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-2xl">
                <Image
                  src={src}
                  alt="Prestation Propul'Sound DJ"
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </FadeIn>
      </section>
    );
  }

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

        {/* Zones tactiles invisibles : toucher le côté gauche/droit pour naviguer,
            avec une fine flèche discrète en indicateur. */}
        <button
          type="button"
          onClick={prev}
          aria-label="Photo précédente"
          className="group absolute inset-y-0 left-0 z-10 flex w-1/4 items-center justify-start pl-2 sm:pl-4"
        >
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-background/40 text-foreground/70 backdrop-blur-sm transition-opacity duration-300 group-hover:bg-background/70 group-hover:text-foreground group-active:bg-background/70 sm:opacity-40 sm:group-hover:opacity-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Photo suivante"
          className="group absolute inset-y-0 right-0 z-10 flex w-1/4 items-center justify-end pr-2 sm:pr-4"
        >
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-background/40 text-foreground/70 backdrop-blur-sm transition-opacity duration-300 group-hover:bg-background/70 group-hover:text-foreground group-active:bg-background/70 sm:opacity-40 sm:group-hover:opacity-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </FadeIn>
    </section>
  );
}

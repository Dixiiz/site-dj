"use client";

import { useEffect, useState } from "react";

type TikTokCarouselProps = {
  /** HTML d'intégration (iframe TikTok) de chaque vidéo, fourni par oEmbed */
  embeds: string[];
};

const VISIBLE = 3; // vidéos visibles à la fois (desktop)
const AUTO_MS = 8000; // défilement automatique toutes les 8 s

export function TikTokCarousel({ embeds }: TikTokCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const max = Math.max(0, embeds.length - VISIBLE);

  useEffect(() => {
    if (paused || max === 0) return;
    const id = setInterval(() => {
      setIndex((i) => (i >= max ? 0 : i + 1));
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [paused, max]);

  if (embeds.length === 0) return null;

  const prev = () => setIndex((i) => (i <= 0 ? max : i - 1));
  const next = () => setIndex((i) => (i >= max ? 0 : i + 1));

  return (
    <div
      className="relative mt-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <div
          className="flex gap-4 transition-transform duration-1000 ease-in-out"
          style={{ transform: `translateX(calc(-${index} * (100% / ${VISIBLE})))` }}
        >
          {embeds.map((html, i) => (
            <div
              key={i}
              className="mx-auto w-[calc(100%/1)] shrink-0 sm:w-[calc((100%-2rem)/3)]"
            >
              <div
                className="overflow-hidden rounded-xl border border-border bg-card/60 [&_iframe]:!w-full"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          ))}
        </div>
      </div>

      {max > 0 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Vidéos précédentes"
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2 text-foreground backdrop-blur transition hover:border-accent hover:text-accent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Vidéos suivantes"
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2 text-foreground backdrop-blur transition hover:border-accent hover:text-accent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <div className="mt-6 flex items-center justify-center gap-2">
            {Array.from({ length: max + 1 }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Aller à la position ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-accent" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

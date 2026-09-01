"use client";

import { useEffect, useRef, useState } from "react";

type VideoShowcaseProps = {
  videos: string[];
  /** "landscape" (16:9) ou "portrait" (9:16) selon vos clips */
  orientation?: "landscape" | "portrait";
};

const AUTO_MS = 8000; // défilement automatique toutes les 8 s

export function VideoShowcase({ videos, orientation = "landscape" }: VideoShowcaseProps) {
  const portrait = orientation === "portrait";
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [mutedStates, setMutedStates] = useState<Record<string, boolean>>(
    Object.fromEntries(videos.map((v) => [v, true]))
  );
  const refs = useRef<Record<string, HTMLVideoElement | null>>({});

  // 1 vidéo visible en mobile, 3 en desktop (mode carrousel)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const visible = portrait ? (isDesktop ? 3 : 1) : videos.length;
  const max = Math.max(0, videos.length - visible);

  useEffect(() => {
    if (!portrait || paused || max === 0) return;
    const id = setInterval(() => {
      setIndex((i) => (i >= max ? 0 : i + 1));
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [portrait, paused, max]);

  if (videos.length === 0) return null;

  const advance = () => setIndex((i) => (i >= max ? 0 : i + 1));

  const toggleSound = (src: string) => {
    setMutedStates((prev) => {
      const next = { ...prev, [src]: !prev[src] };
      const el = refs.current[src];
      if (el) el.muted = next[src];
      return next;
    });
  };

  const videoClass = portrait
    ? "aspect-[9/16] w-full rounded-xl border border-border object-cover"
    : "aspect-video w-full object-cover";

  return (
    <div
      className="relative mt-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <div
          className="flex gap-4 transition-transform duration-1000 ease-in-out"
          style={{ transform: `translateX(-${index * (100 / visible)}%)` }}
        >
          {videos.map((src) => (
            <div
              key={src}
              className="shrink-0"
              style={{ width: `calc(${100 / visible}% - ${visible > 1 ? "1rem" : "0px"})` }}
            >
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card/60">
                <video
                  ref={(el) => {
                    refs.current[src] = el;
                  }}
                  src={src}
                  poster={src.replace(/\.mp4$/, ".jpg")}
                  muted={mutedStates[src]}
                  playsInline
                  preload="metadata"
                  className={videoClass}
                  onEnded={advance}
                />
                <SoundButton muted={mutedStates[src]} onToggle={() => toggleSound(src)} />
                <div
                  className="absolute inset-0"
                  onMouseEnter={() => {
                    const v = refs.current?.[src];
                    v?.play().catch(() => {});
                  }}
                  onMouseLeave={() => {
                    const v = refs.current?.[src];
                    if (v) {
                      v.pause();
                      v.currentTime = 0;
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {max > 0 && (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => (i <= 0 ? max : i - 1))}
            aria-label="Vidéos précédentes"
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2 text-foreground backdrop-blur transition hover:border-accent hover:text-accent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={advance}
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
                  i === index
                    ? "w-6 bg-accent"
                    : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
function SoundButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={muted ? "Activer le son" : "Couper le son"}
      className="absolute bottom-3 right-3 z-10 rounded-full bg-background/80 p-2 text-foreground opacity-0 backdrop-blur transition-opacity focus:opacity-100 group-hover:opacity-100"
    >
      {muted ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  );
}


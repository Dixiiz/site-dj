"use client";

import { useRef, useState } from "react";

type VideoShowcaseProps = {
  videos: string[];
  /** "landscape" (16:9) ou "portrait" (9:16) selon vos clips */
  orientation?: "landscape" | "portrait";
};

export function VideoShowcase({ videos, orientation = "landscape" }: VideoShowcaseProps) {
  const portrait = orientation === "portrait";
  const [mutedStates, setMutedStates] = useState<Record<string, boolean>>(
    Object.fromEntries(videos.map((v) => [v, true]))
  );
  const refs = useRef<Record<string, HTMLVideoElement | null>>({});

  if (videos.length === 0) return null;

  const toggleSound = (src: string) => {
    setMutedStates((prev) => {
      const next = { ...prev, [src]: !prev[src] };
      const el = refs.current[src];
      if (el) el.muted = next[src];
      return next;
    });
  };

  return (
    <div
      className={
        portrait
          ? "mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          : "mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      {videos.map((src) => (
        <div
          key={src}
          className={
            portrait
              ? "group relative overflow-hidden rounded-xl border border-border bg-card/60"
              : "group relative overflow-hidden rounded-xl border border-border bg-card/60"
          }
          onMouseEnter={(e) => {
            const v = e.currentTarget.querySelector("video");
            v?.play().catch(() => {});
          }}
          onMouseLeave={(e) => {
            const v = e.currentTarget.querySelector("video");
            if (v) {
              v.pause();
              v.currentTime = 0;
            }
          }}
        >
          <video
            ref={(el) => {
              refs.current[src] = el;
            }}
            src={src}
            muted={mutedStates[src]}
            loop
            playsInline
            preload="metadata"
            className={portrait ? "aspect-[9/16] w-full object-cover" : "aspect-video w-full object-cover"}
          />
          <button
            type="button"
            onClick={() => toggleSound(src)}
            aria-label={mutedStates[src] ? "Activer le son" : "Couper le son"}
            className="absolute bottom-3 right-3 rounded-full bg-background/80 p-2 text-foreground opacity-0 backdrop-blur transition-opacity focus:opacity-100 group-hover:opacity-100"
          >
            {mutedStates[src] ? (
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
        </div>
      ))}
    </div>
  );
}

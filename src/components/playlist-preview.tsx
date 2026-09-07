"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getMusicPreviewUrl } from "@/app/client-actions";

// Un seul flux audio à la fois sur toute la page : cliquer sur un autre
// titre stoppe automatiquement le précédent ET remet son bouton à zéro.
let currentAudio: HTMLAudioElement | null = null;
const previewCache = new Map<string, string>();
// Registre des boutons : chaque bouton s'y enregistre pour pouvoir être
// réinitialisé quand un autre démarre.
const resetListeners = new Set<() => void>();

export function PreviewButton({ title, artist }: { title: string; artist: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const reset = () => setState("idle");
    resetListeners.add(reset);
    return () => {
      resetListeners.delete(reset);
    };
  }, []);

  async function toggle() {
    // Stoppe la lecture en cours (ce titre ou un autre) et remet
    // tous les autres boutons à l'état neutre.
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    resetListeners.forEach((reset) => reset());
    if (state === "playing") {
      return;
    }
    setState("loading");
    try {
      const cacheKey = `${title}|${artist}`;
      let previewUrl = previewCache.get(cacheKey);
      if (!previewUrl) {
        const result = await getMusicPreviewUrl(title, artist);
        if (!result.ok) {
          toast.error(result.error);
          setState("idle");
          return;
        }
        previewUrl = result.previewUrl;
        previewCache.set(cacheKey, previewUrl);
      }
      const audio = new Audio(previewUrl);
      audio.volume = 0.7;
      audio.onended = () => {
        if (currentAudio === audio) {
          currentAudio = null;
          setState("idle");
        }
      };
      audioRef.current = audio;
      currentAudio = audio;
      await audio.play();
      setState("playing");
    } catch {
      toast.error("Impossible de lire l'extrait.");
      setState("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={state === "loading"}
      aria-label={`Écouter un extrait de ${title} par ${artist}`}
      className={`ml-1 inline-flex translate-y-[3px] items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
        state === "playing"
          ? "border-accent bg-accent text-white"
          : "border-accent/40 text-accent hover:bg-accent/10"
      } disabled:opacity-70`}
    >
      {state === "loading" ? (
        <>
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-90" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" fill="currentColor" />
          </svg>
          …
        </>
      ) : state === "playing" ? (
        <>⏸ Stop</>
      ) : (
        <>▶ 30 s</>
      )}
    </button>
  );
}

// Élément de liste d'article : titre, artiste, note d'ambiance + extrait.
export function SongItem({
  title,
  artist,
  note,
}: {
  title: string;
  artist: string;
  note: React.ReactNode;
}) {
  return (
    <li>
      <PreviewButton title={title} artist={artist} />{" "}
      <strong>
        {artist} — {title}
      </strong>{" "}
      : {note}
    </li>
  );
}
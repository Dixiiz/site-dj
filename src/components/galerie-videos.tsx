"use client";

// Section vidéos de la page /galerie : détecte l'orientation de chaque clip
// (videoWidth/videoHeight dès que les métadonnées sont chargées) et le place
// dans la bonne grille — verticales en 2-3 colonnes (format 9/16, comme le
// showcase TikTok de l'accueil), horizontales en 2 colonnes (16:9).
import { useState } from "react";

export type GalerieVideo = {
  name: string;
  url: string;
  poster?: string;
};

export function GalerieVideos({ videos }: { videos: GalerieVideo[] }) {
  // name → portrait ? (undefined = pas encore connu → grille 16:9 par défaut)
  const [portrait, setPortrait] = useState<Record<string, boolean | undefined>>({});

  const handleMeta = (name: string) => (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (!v.videoWidth || !v.videoHeight) return;
    setPortrait((prev) =>
      prev[name] === undefined
        ? { ...prev, [name]: v.videoHeight > v.videoWidth }
        : prev
    );
  };

  const verticals = videos.filter((v) => portrait[v.name] === true);
  const horizontals = videos.filter((v) => portrait[v.name] !== true);

  const card = (video: GalerieVideo, isPortrait: boolean) => (
    <figure
      key={video.name}
      className={
        isPortrait
          ? "group overflow-hidden rounded-2xl border border-border"
          : "overflow-hidden rounded-2xl border border-border"
      }
    >
      <video
        src={video.url}
        poster={video.poster}
        controls
        preload="metadata"
        playsInline
        onLoadedMetadata={handleMeta(video.name)}
        className={
          isPortrait
            ? "aspect-[9/16] w-full bg-background object-cover"
            : "aspect-video w-full bg-background object-cover"
        }
      />
      <figcaption className="px-3 py-2 text-xs text-muted-foreground">
        Prestation Propul&apos;Sound DJ
      </figcaption>
    </figure>
  );

  return (
    <>
      {horizontals.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {horizontals.map((v) => card(v, false))}
        </div>
      )}
      {verticals.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {verticals.map((v) => card(v, true))}
        </div>
      )}
    </>
  );
}

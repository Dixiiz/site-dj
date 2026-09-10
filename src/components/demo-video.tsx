"use client";

import { useEffect, useRef, useState } from "react";

// Démos de l'espace client : zooms synchronisés + sous-titres.
// Vidéos muettes en boucle (public/videos/).

type Segment = {
  from: number;
  to: number;
  text: string;
  /** Point vers lequel la vidéo zoome (origin CSS en %). */
  origin: string;
  scale: number;
};

const DEMO_DEVIS = {
  src: "/videos/demo-espace-client.mp4",
  poster: "/videos/demo-poster.jpg",
  duration: 55,
  segments: [
    { from: 0, to: 6.4, text: "Choisis ta formule : mariage, anniversaire ou soirée pro", origin: "50% 75%", scale: 1.12 },
    { from: 6.4, to: 14.4, text: "Ajoute des options : fumée lourde, étincelles froides, CO2…", origin: "50% 45%", scale: 1.15 },
    { from: 14.4, to: 22.4, text: "Indique le lieu : les frais de déplacement se calculent tout seuls", origin: "45% 80%", scale: 1.2 },
    { from: 22.4, to: 30.4, text: "Choisis tes horaires : le supplément s'affiche en direct", origin: "35% 60%", scale: 1.2 },
    { from: 30.4, to: 35.2, text: "Sélectionne ta date sur le calendrier", origin: "40% 35%", scale: 1.25 },
    { from: 35.2, to: 46.4, text: "Tes coordonnées, ta playlist… et c'est parti", origin: "40% 80%", scale: 1.2 },
    { from: 46.4, to: 55, text: "Demande envoyée ! Réponse sous 24 à 48 h", origin: "50% 40%", scale: 1.15 },
  ] as Segment[],
};

const DEMO_SIGNATURE = {
  src: "/videos/demo-signature.mp4",
  poster: "/videos/demo-poster-signature.jpg",
  duration: 27.9,
  segments: [
    { from: 0, to: 4, text: "Valide tes options en un clic", origin: "50% 40%", scale: 1.15 },
    { from: 4, to: 12, text: "Signe devis et contrat au doigt, depuis ton téléphone", origin: "55% 55%", scale: 1.3 },
    { from: 12, to: 16, text: "Vos documents sont validés automatiquement", origin: "50% 35%", scale: 1.15 },
    { from: 16, to: 27.9, text: "Règle l'acompte par carte ou virement : ta date est verrouillée", origin: "50% 45%", scale: 1.15 },
  ] as Segment[],
};

const DEMO_PREPA = {
  src: "/videos/demo-preparation.mp4",
  poster: "/videos/demo-poster-preparation.jpg",
  duration: 47,
  segments: [
    { from: 0, to: 8, text: "Change d'avis ? Un message et c'est réglé — même pour réserver un appel", origin: "50% 40%", scale: 1.15 },
    { from: 8, to: 12, text: "Ta fiche de soirée : tout le programme en un coup d'œil", origin: "30% 40%", scale: 1.2 },
    { from: 12, to: 17.6, text: "Tape tes titres préférés et choisis tes temps forts", origin: "55% 55%", scale: 1.25 },
    { from: 17.6, to: 24, text: "Et ceux à éviter à tout prix (on ne juge pas, promis 😄)", origin: "45% 65%", scale: 1.2 },
    { from: 24, to: 36, text: "Une question ? Écris direct à ton DJ, il te répond", origin: "50% 55%", scale: 1.15 },
    { from: 36, to: 47, text: "Tout est prêt. Il ne reste qu'à danser 🕺", origin: "50% 45%", scale: 1.1 },
  ] as Segment[],
};

function DemoVideoPlayer({
  src,
  poster,
  duration,
  segments,
}: {
  src: string;
  poster: string;
  duration: number;
  segments: Segment[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState({ origin: "50% 50%", scale: 1 });
  const [captionIndex, setCaptionIndex] = useState(-1);

  // Lecture uniquement quand la démo est visible à l'écran : chaque vidéo
  // démarre quand on arrive dessus (et jamais toutes en même temps).
  // En sortie de viewport : pause + retour au début, pour que la démo
  // reparte toujours du début à la prochaine visite.
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    let lastIndex = -1;
    const tick = () => {
      const video = videoRef.current;
      if (video && video.currentTime > 0) {
        const segment = segments.find((s) => video.currentTime >= s.from && video.currentTime < s.to) ?? null;
        if (segment) {
          setZoom((current) =>
            current.origin === segment.origin && current.scale === segment.scale
              ? current
              : { origin: segment.origin, scale: segment.scale }
          );
          const index = segments.indexOf(segment);
          if (index !== lastIndex) {
            lastIndex = index;
            setCaptionIndex(index);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [segments, duration]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl border border-border shadow-2xl"
    >
      <video
        ref={videoRef}
        className="w-full transition-transform duration-[2500ms] ease-in-out"
        style={{
          transform: `scale(${zoom.scale})`,
          transformOrigin: zoom.origin,
        }}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
      />
      {/* Sous-titre explicatif, apparition fluide */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-4 px-4">
        {segments.map((segment, index) => (
          <p
            key={segment.text}
            aria-hidden={captionIndex !== index}
            className={`absolute bottom-4 max-w-md rounded-full bg-background/80 px-4 py-2 text-center text-xs font-medium text-foreground shadow-lg backdrop-blur transition-all duration-700 sm:text-sm ${
              captionIndex === index
                ? "translate-y-0 opacity-100"
                : "translate-y-3 opacity-0"
            }`}
          >
            {segment.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export function DemoVideo() {
  return <DemoVideoPlayer {...DEMO_DEVIS} />;
}

export function DemoVideoSignature() {
  return <DemoVideoPlayer {...DEMO_SIGNATURE} />;
}

export function DemoVideoPrepa() {
  return <DemoVideoPlayer {...DEMO_PREPA} />;
}
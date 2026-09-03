"use client";

import { useEffect, useRef, useState } from "react";

const FADE_MS = 700; // durée du fondu de boucle
const PARALLAX = 0.9; // la vidéo descend presque à la vitesse du scroll
const MAX_SHIFT_RATIO = 0.5; // course maximale de la vidéo (proportion du héro)
const SCALE_FROM = 1.45; // zoom initial (marge de sécurité pour la descente)
const SCALE_TO = 1.2; // zoom en fin de course : léger dé-zoom cinématique

// Vidéo de fond du héro : boucle avec fondu enchaîné, bords estompés par des
// masques FIXES (la vidéo glisse dessous au scroll → aucun bord jamais visible).
export function HeroVideo({ src = "/videos/hero.mp4" }: { src?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fading, setFading] = useState(false);

  // Fondu à la boucle
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const remaining = video.duration - video.currentTime;
      setFading(remaining <= FADE_MS / 1000);
    };
    const onRestart = () => setFading(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("seeked", onRestart);
    video.addEventListener("playing", onRestart);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("seeked", onRestart);
      video.removeEventListener("playing", onRestart);
    };
  }, []);

  // Parallaxe : la vidéo descend + dé-zoom cinématique pendant le scroll
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const video = videoRef.current;
      if (!video) return;
      const box = video.parentElement;
      if (!box) return;
      const hero = box.closest("section") ?? box;
      const maxShift = Math.max(hero.clientHeight, 600) * MAX_SHIFT_RATIO;
      const progress = Math.min(window.scrollY / Math.max(hero.clientHeight, 1), 1);
      const shift = Math.min(window.scrollY * PARALLAX, maxShift);
      const scale = SCALE_FROM - (SCALE_FROM - SCALE_TO) * progress;
      box.style.transform = `translate3d(0, ${shift}px, 0)`;
      video.style.transform = `scale(${scale})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Masques fixes : fondus doux sur les 4 côtés, portée réduite pour
  // laisser la vidéo bien visible au centre.
  const fadeX = {
    WebkitMaskImage:
      "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
    maskImage:
      "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
  };
  const fadeY = {
    WebkitMaskImage:
      "linear-gradient(to bottom, transparent 0%, black 18%, black 75%, transparent 100%)",
    maskImage:
      "linear-gradient(to bottom, transparent 0%, black 18%, black 75%, transparent 100%)",
  };

  return (
    <>
      {/* Fond uni couvrant tout le héro, devant les halos décoratifs :
          garantit un raccord de couleur identique sur tout le pourtour */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-background" />
      <div className="absolute inset-0 -z-10" style={fadeX}>
        <div className="absolute inset-0" style={fadeY}>
          {/* Fond uni : le fondu des bords se raccorde exactement à la
              couleur d'arrière-plan du site */}
          <div aria-hidden className="absolute inset-0 bg-background" />
          <video
            ref={videoRef}
            aria-hidden
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            style={{
              transform: `scale(${SCALE_FROM})`,
              transitionProperty: "opacity",
              transitionDuration: `${FADE_MS}ms`,
              willChange: "transform",
            }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out ${
              fading ? "opacity-0" : "opacity-95"
            }`}
          >
            <source src={src} type="video/mp4" />
          </video>
        </div>
      </div>
      {/* Voile dégradé léger pour garder le texte lisible */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background/30 via-background/15 to-background"
      />
    </>
  );
}



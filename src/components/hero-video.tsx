"use client";

import { useEffect, useRef, useState } from "react";

const FADE_MS = 700; // durée du fondu de boucle
const PARALLAX = 0.55; // la vidéo descend à 55% de la vitesse du scroll
const MAX_SHIFT_RATIO = 0.2; // course maximale de la vidéo (proportion du héro)

// Vidéo de fond du héro : boucle avec fondu enchaîné, bords estompés par des
// masques FIXES (la vidéo glisse dessous au scroll → aucun bord jamais visible).
export function HeroVideo() {
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

  // Parallaxe : la vidéo glisse sous les masques fixes
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        const hero = video.closest("section");
        const maxShift = (hero ? hero.offsetHeight : 600) * MAX_SHIFT_RATIO;
        const shift = Math.min(window.scrollY * PARALLAX, maxShift);
        video.style.transform = `translateY(${shift}px) scale(1.5)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
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
              transform: "scale(1.5)",
              transitionDuration: `${FADE_MS}ms`,
              willChange: "transform",
            }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out ${
              fading ? "opacity-0" : "opacity-75"
            }`}
          >
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
      {/* Voile dégradé léger pour garder le texte lisible */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/40 to-background"
      />
    </>
  );
}



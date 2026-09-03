"use client";

import { useEffect, useRef, useState } from "react";

const FADE_MS = 700; // durée du fondu de boucle
const PARALLAX = 0.9; // la vidéo descend presque à la vitesse du scroll
const MAX_SHIFT_RATIO = 0.5; // course maximale de la vidéo (proportion du héro)
const SCALE_FROM = 1.45; // zoom initial (marge de sécurité pour la descente)
const SCALE_TO = 1.2; // zoom en fin de course : léger dé-zoom cinématique
const LERP = 0.12; // amortissement : plus bas = plus fluide/lent à rattraper

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

  // Parallaxe lissée : interpolation douce (lerp) vers la position cible,
  // la vidéo "flotte" avec un léger retard fluide sur le scroll.
  useEffect(() => {
    let raf = 0;
    let currentShift = 0;
    let currentScale = SCALE_FROM;
    let running = false;

    const tick = () => {
      const video = videoRef.current;
      if (!video) {
        running = false;
        return;
      }
      const box = video.parentElement;
      if (!box) {
        running = false;
        return;
      }
      const hero = box.closest("section") ?? box;
      const heroH = Math.max(hero.clientHeight, 600);
      const maxShift = heroH * MAX_SHIFT_RATIO;
      const progress = Math.min(window.scrollY / heroH, 1);
      const targetShift = Math.min(window.scrollY * PARALLAX, maxShift);
      const targetScale = SCALE_FROM - (SCALE_FROM - SCALE_TO) * progress;
      // Amortissement : plus on est loin de la cible, plus on se rapproche vite
      currentShift += (targetShift - currentShift) * LERP;
      currentScale += (targetScale - currentScale) * LERP;
      box.style.transform = `translate3d(0, ${currentShift.toFixed(2)}px, 0)`;
      video.style.transform = `scale(${currentScale.toFixed(4)})`;
      // On continue d'animer tant qu'on n'est pas (quasi) arrivé
      const settled =
        Math.abs(targetShift - currentShift) < 0.3 &&
        Math.abs(targetScale - currentScale) < 0.001;
      if (!settled) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };
    const wake = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    wake();
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake, { passive: true });
    return () => {
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
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



"use client";

import { useEffect, useRef, useState } from "react";

const FADE_MS = 700; // durée du fondu de boucle
const PARALLAX = 0.35; // la vidéo descend à 35% de la vitesse du scroll

// Vidéo de fond du héro : boucle avec fondu enchaîné, bords estompés
// (masque dégradé) et léger décalage au scroll (parallaxe).
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
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

  // Parallaxe : la vidéo suit le scroll plus lentement que la page
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const hero = wrapper.parentElement;
        const maxY = hero ? hero.offsetHeight : 600;
        const shift = Math.min(window.scrollY * PARALLAX, maxY);
        wrapper.style.transform = `translateY(${shift}px)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Masque : bords de la vidéo fondus dans le fond du site
  const edgeFade = {
    WebkitMaskImage:
      "radial-gradient(120% 120% at 50% 50%, black 55%, transparent 92%)",
    maskImage:
      "radial-gradient(120% 120% at 50% 50%, black 55%, transparent 92%)",
  };

  return (
    <>
      <div ref={wrapperRef} className="absolute inset-0 -z-10 will-change-transform">
        <video
          ref={videoRef}
          aria-hidden
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{ ...edgeFade, transitionDuration: `${FADE_MS}ms` }}
          className={`absolute inset-0 h-full w-full scale-110 object-cover transition-opacity ease-in-out ${
            fading ? "opacity-0" : "opacity-60"
          }`}
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
        </video>
      </div>
      {/* Voile dégradé pour garder le texte lisible */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background/80 via-background/60 to-background"
      />
    </>
  );
}


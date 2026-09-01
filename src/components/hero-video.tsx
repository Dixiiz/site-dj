"use client";

import { useEffect, useRef, useState } from "react";

const FADE_MS = 700; // durée du fondu

// Vidéo de fond du héro : lecture en boucle avec fondu enchaîné
// (la vidéo s'estompe vers le fond bleu à la fin et réapparaît au début).
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fading, setFading] = useState(false);

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

  return (
    <>
      <video
        ref={videoRef}
        aria-hidden
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className={`absolute inset-0 -z-10 h-full w-full object-cover transition-opacity ease-in-out ${
          fading ? "opacity-0" : "opacity-60"
        }`}
        style={{ transitionDuration: `${FADE_MS}ms` }}
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>
      {/* Voile dégradé pour garder le texte lisible */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background/80 via-background/60 to-background"
      />
    </>
  );
}

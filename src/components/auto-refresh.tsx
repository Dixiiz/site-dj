"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Rafraîchit automatiquement les données serveur de la page (options en
// attente, musiques, fichiers…) sans rechargement visible.
// Chaque refresh re-rend toute la page côté serveur (coûteux) : on rafraîchit
// donc moins souvent, et UNIQUEMENT si l'onglet est visible et qu'aucune
// interaction n'est en cours — sinon les clics deviennent lents.
export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let stopped = false;
    let lastInteraction = 0;
    const onInteract = () => {
      lastInteraction = Date.now();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") lastInteraction = Date.now();
    };
    const tick = () => {
      if (stopped) return;
      const visible = document.visibilityState === "visible";
      const calme = Date.now() - lastInteraction > 5000;
      if (visible && calme) router.refresh();
    };
    window.addEventListener("pointerdown", onInteract, { passive: true });
    window.addEventListener("keydown", onInteract);
    document.addEventListener("visibilitychange", onVisibility);
    const id = setInterval(tick, intervalMs);
    return () => {
      stopped = true;
      clearInterval(id);
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);
  return null;
}

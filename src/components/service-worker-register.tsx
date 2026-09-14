"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker (public/sw.js) qui permet de consulter
 * les pages d'admin (planning, devis…) en mode hors-ligne.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Ne s'active qu'en production : évite les caches parasites en dev.
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Échec de l'enregistrement du service worker :", error);
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}

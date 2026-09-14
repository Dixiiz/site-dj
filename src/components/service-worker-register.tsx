"use client";

import { useEffect } from "react";

/**
 * Nettoyage complet des service workers et caches PWA.
 *
 * Le service worker (consultation hors-ligne) causait des bugs bloquants
 * sur iOS PWA : ses requêtes partaient sans les cookies de session, le
 * serveur répondait une page de connexion à la place des données, et la
 * navigation Next.js restait figée (clic → scroll en haut, rien d'autre).
 *
 * Ce composant déregistre tout SW existant et vide les caches à chaque
 * visite de l'admin, pour garantir un comportement identique à Safari.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const cleanup = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter(
                (k) => k.startsWith("admin-pages-") || k.startsWith("offline-"),
              )
              .map((k) => caches.delete(k)),
          );
        }
      } catch (error) {
        console.error("Nettoyage PWA :", error);
      }
    };

    cleanup();
  }, []);

  return null;
}

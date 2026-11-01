"use client";

/**
 * Gestion PWA de l'admin : purge des anciens caches + service worker push.
 *
 * Historique : le premier SW (cache hors-ligne) causait des bugs bloquants
 * sur iOS PWA (requêtes sans cookies → navigation figée). Le SW actuel
 * (public/sw.js) est « push only » : il n'intercepte AUCUN fetch, donc le
 * comportement réseau reste 100 % natif. Ce composant purge les vieux
 * caches à chaque visite et enregistre le SW pour les notifications.
 */
import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const setup = async () => {
      try {
        // 1) Purge des anciens caches (versions hors-ligne historiques).
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((k) => k.startsWith("admin-pages-") || k.startsWith("offline-"))
              .map((k) => caches.delete(k)),
          );
        }
        // 2) Enregistrement du SW push-only (si supporté).
        if ("serviceWorker" in navigator && "PushManager" in window) {
          await navigator.serviceWorker.register("/sw.js");
        }
      } catch (error) {
        console.error("PWA setup :", error);
      }
    };

    setup();
  }, []);

  return null;
}

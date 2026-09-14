/* Service worker PWA pour l'admin Propul'Sound.
 *
 * Stratégie : le service worker ne prend la main QUE hors-ligne.
 * - En ligne : les requêtes passent par le navigateur, sans interception
 *   (les bugs WebKit/iOS PWA avec respondWith peuvent casser la navigation
 *   du routeur — page figée qui scrolle en haut sans changer).
 *   Seules les navigations documents /admin mettent à jour le cache en
 *   arrière-plan (fire-and-forget) pour rafraîchir la copie hors-ligne.
 * - Hors-ligne : les pages /admin déjà consultées sont servies depuis le
 *   cache (planning, devis…), sinon page /hors-ligne.
 *
 * Remarque : les modifications (actions serveur, POST) nécessitent le
 * réseau et ne sont pas mises en cache.
 */
const VERSION = "v3";
const PAGES_CACHE = `admin-pages-${VERSION}`;
const OFFLINE_CACHE = `offline-${VERSION}`;
const OFFLINE_URL = "/hors-ligne";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.add(OFFLINE_URL);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.endsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // On ne considère que les GET même origine vers /admin.
  // Les POST (server actions, formulaires) passent toujours par le réseau.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith("/admin")) return;

  const isNavigation = request.mode === "navigate";
  const online = self.navigator.onLine;

  // En ligne : on n'intercepte RIEN sauf les navigations documents
  // (et encore : uniquement pour rafraîchir la copie hors-ligne en fond).
  if (online && !isNavigation) return;

  event.respondWith(
    (async () => {
      if (online) {
        // Navigation en ligne : réseau d'abord + mise en cache silencieuse.
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(PAGES_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline ?? Response.error();
        }
      }

      // Hors-ligne : cache d'abord.
      const cached = await caches.match(request);
      if (cached) return cached;
      const offline = await caches.match(OFFLINE_URL);
      return offline ?? Response.error();
    })(),
  );
});

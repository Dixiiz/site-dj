/* Service worker PWA pour l'admin Propul'Sound.
 *
 * Stratégie « réseau d'abord » pour les navigations vers /admin : la page
 * est servie par le réseau quand c'est possible (données à jour) et une
 * copie est gardée en cache. Si le réseau est indisponible (hors-ligne),
 * la dernière copie connue de la page est affichée — le planning et les
 * devis restent donc consultables sans connexion.
 *
 * Remarque : les modifications (actions serveur, POST) nécessitent le
 * réseau et ne sont pas mises en cache.
 */
const VERSION = "v2";
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

  // On ne gère que les GET de navigation vers l'admin (même origine).
  // Les POST (server actions, formulaires) passent toujours par le réseau.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith("/admin")) return;

  event.respondWith(
    (async () => {
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
    })(),
  );
});

/* Service worker KO — version « auto-destruction ».
 *
 * Le SW causait des bugs sur iOS PWA (fetch sans cookies → réponses
 * invalides → navigation figée). Cette version ne met plus rien en cache :
 * dès qu'un navigateur la télécharge (au lancement de l'app), elle se
 * déregistre et vide tous les caches. La page fait aussi le ménage
 * elle-même (voir components/service-worker-register.tsx).
 *
 * Le hors-ligne sera réintroduit plus tard avec une stratégie fiable.
 */
const CACHES_PREFIXES = ["admin-pages-", "offline-"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => CACHES_PREFIXES.some((p) => key.startsWith(p)))
          .map((key) => caches.delete(key)),
      );
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) client.navigate(client.url);
    })(),
  );
});

// Aucun fetch handler : aucune interception, comportement 100 % natif.

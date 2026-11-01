/* Service worker « push only » — aucune interception réseau.
 *
 * Historique : la première version du SW (cache hors-ligne) causait des
 * bugs bloquants sur iOS PWA (requêtes sans cookies → navigation figée).
 * Elle avait été remplacée par une version auto-destructive.
 *
 * Cette version sert uniquement aux NOTIFICATIONS PUSH de l'admin :
 * elle ne met rien en cache et n'intercepte aucun fetch (comportement
 * réseau 100 % natif, donc aucun des bugs précédents). Elle affiche les
 * notifications envoyées par le serveur (VAPID) et ouvre l'admin au clic.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Réception d'une notification push (payload JSON : { title, body, url }).
self.addEventListener("push", (event) => {
  let data = { title: "Propul'Sound DJ", body: "Nouvelle activité sur le site", url: "/admin" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Payload non JSON : on garde les valeurs par défaut.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      tag: data.url, // regroupe les notifs pointant vers la même page
      data: { url: data.url },
    }),
  );
});

// Clic sur la notification : ouvre (ou focus) la page cible.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});


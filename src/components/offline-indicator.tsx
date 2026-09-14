"use client";

import { useEffect, useState } from "react";

/**
 * Bandeau affiché quand l'appareil perd la connexion : rappelle que les
 * données affichées (planning, devis…) peuvent être périmées et que les
 * modifications nécessitent le réseau.
 */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950"
    >
      Mode hors-ligne — les pages affichées peuvent être périmées. Les
      modifications nécessitent une connexion.
    </div>
  );
}

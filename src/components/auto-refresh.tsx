"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Rafraîchit automatiquement les données serveur de la page (options en
// attente, musiques, fichiers…) sans rechargement visible.
export function AutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}

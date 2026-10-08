"use client";

import { useSyncExternalStore, type ReactNode } from "react";

// Bloc « CA Menuiserie » du tableau de bord : affiché/masqué via une coche
// (préférence mémorisée dans localStorage). Les enfants sont calculés côté
// serveur ; le composant ne fait que basculer leur visibilité.
// useSyncExternalStore : pas de setState dans un effet, et pas de mismatch
// d'hydratation (le rendu serveur part sur « affiché », le client se resync
// juste après depuis localStorage).
const STORAGE_KEY = "admin-afficher-ca-menuiserie";
const SERVER_SNAPSHOT = true;

let listeners: Array<() => void> = [];

function lire(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true; // localStorage indisponible (navigation privée) : affiché.
  }
}

function subscribe(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function ecrire(valeur: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, valeur ? "1" : "0");
  } catch {
    // stockage indisponible : on ignore, l'état reste en mémoire.
  }
  for (const l of listeners) l();
}

export function MenuiserieDashboardBloc({ children }: { children: ReactNode }) {
  const affiche = useSyncExternalStore(subscribe, lire, () => SERVER_SNAPSHOT);

  return (
    <section className="space-y-3">
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={affiche}
          onChange={(e) => ecrire(e.target.checked)}
          className="size-4 accent-amber-600"
        />
        <span className="font-medium">Afficher le CA Menuiserie</span>
        <span className="text-xs text-muted-foreground">
          (rubrique URSSAF distincte : « vente de biens et marchandises »)
        </span>
      </label>
      {affiche ? children : null}
    </section>
  );
}
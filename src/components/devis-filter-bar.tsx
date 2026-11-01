"use client";

import { useRef } from "react";

// Barre de filtres de la page admin « Devis » : le select s'applique
// immédiatement (auto-submit), la recherche texte garde son bouton.
export function DevisFilterBar({ q, tri }: { q?: string; tri?: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} method="get" className="flex flex-wrap gap-2">
      <input
        type="search"
        name="q"
        defaultValue={q ?? ""}
        placeholder="Rechercher : nom, e-mail, téléphone, lieu, date…"
        className="w-full max-w-md flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <select
        name="tri"
        defaultValue={tri ?? "date_proche"}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent sm:w-auto"
      >
        <option value="date_proche">Événement : date la plus proche</option>
        <option value="date_loin">Événement : date la plus lointaine</option>
        <option value="recent">Devis : plus récent d&apos;abord</option>
        <option value="ancien">Devis : plus ancien d&apos;abord</option>
        <option value="cher">Prix : du plus cher au moins cher</option>
        <option value="moins_cher">Prix : du moins cher au plus cher</option>
        <option value="tous">Tous les devis (passés inclus)</option>
        <option value="passes">Soirées passées (archives)</option>
      </select>
      <button
        type="submit"
        className="w-full rounded-lg border border-accent/60 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10 sm:w-auto"
      >
        Filtrer
      </button>
    </form>
  );
}
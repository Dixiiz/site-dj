"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { relanceDateLibre } from "@/app/client-actions";

// Bouton « relance 1 clic » posé dans la ligne résumé du devis (à
// l'intérieur du <summary>) : preventDefault + stopPropagation pour ne PAS
// ouvrir l'accordéon au clic. Envoie l'e-mail « votre date n'est pas
// bloquée » (voir sendRelanceDateLibre) et affiche le résultat en place.
export function RelanceDateButton({
  quoteId,
  lastRelance,
}: {
  quoteId: string;
  /** Date (AAAA-MM-JJ) de la dernière relance envoyée, depuis les notes. */
  lastRelance: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  function onClick(e: React.MouseEvent) {
    // Le bouton vit dans le <summary> : sans ça, le clic ouvrirait le devis.
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const res = await relanceDateLibre(quoteId);
      if (res.ok) {
        setIsError(false);
        setFeedback(
          res.autresDemandes > 0
            ? `✓ Envoyée — ${res.autresDemandes} autre${res.autresDemandes > 1 ? "s" : ""} demande${res.autresDemandes > 1 ? "s" : ""} sur cette date`
            : "✓ Relance envoyée"
        );
      } else {
        setIsError(true);
        setFeedback(res.error);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setFeedback(null), 4500);
    });
  }

  if (feedback) {
    return (
      <span
        className={`w-fit rounded-lg border px-2.5 py-1 text-xs ${
          isError ? "border-red-500/50 text-red-400" : "border-green-500/50 text-green-400"
        }`}
      >
        {feedback}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={
        lastRelance
          ? `Rappel « date non bloquée » — dernière relance le ${new Date(lastRelance + "T12:00:00").toLocaleDateString("fr-FR")}`
          : "Rappel au client : la date n'est réservée qu'à la signature"
      }
      className="w-fit rounded-lg border border-yellow-500/50 px-2.5 py-1 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-500/10 disabled:opacity-60"
    >
      {pending ? "Envoi…" : "⏳ Relancer"}
    </button>
  );
}

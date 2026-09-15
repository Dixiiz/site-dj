"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { marquerAvisRecu } from "@/app/actions";

// Marque l'avis post-soirée comme reçu (ou l'annule) : pose/retire le
// marqueur [[avis-ok]] qui bloque la relance automatique d'avis du cron.
export function ReviewReceivedButton({
  id,
  customerName,
  validated,
}: {
  id: string;
  customerName: string;
  validated: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function run(annuler: boolean) {
    if (annuler && !window.confirm(`Retirer la validation d'avis de ${customerName} ? (une relance pourrait repartir)`)) return;
    const formData = new FormData();
    formData.set("id", id);
    formData.set("annuler", annuler ? "1" : "0");
    startTransition(async () => {
      const result = await marquerAvisRecu(formData);
      if (result.ok) {
        toast.success(result.message ?? "Fait ✓");
      } else {
        toast.error(result.error ?? "Opération impossible.");
      }
    });
  }

  if (validated) {
    return (
      <button
        type="button"
        onClick={() => run(true)}
        disabled={pending}
        className="shrink-0 rounded-full border border-green-500/50 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
        title="Avis reçu — cliquer pour annuler"
      >
        {pending ? "…" : "★ Avis reçu — annuler ?"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => run(false)}
      disabled={pending}
      className={`shrink-0 rounded-full border border-accent/40 px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10 ${
        pending ? "animate-pulse cursor-wait opacity-90" : ""
      }`}
      title="Le client a laissé son avis — bloque la relance automatique"
    >
      {pending ? "…" : "★ Avis reçu"}
    </button>
  );
}

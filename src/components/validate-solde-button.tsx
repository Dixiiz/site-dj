"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { validerSoldeQuote } from "@/app/actions";

// Valide le solde d'une soirée (ou l'annule) : fait basculer le montant
// dans le CA URSSAF du mois.
export function ValidateSoldeButton({
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
    if (annuler && !window.confirm(`Retirer la validation du solde de ${customerName} ?`)) return;
    const formData = new FormData();
    formData.set("id", id);
    formData.set("annuler", annuler ? "1" : "0");
    startTransition(async () => {
      const result = await validerSoldeQuote(formData);
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
        className="shrink-0 rounded-full border border-green-500/50 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 transition-colors hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400"
      >
        {pending ? "…" : "✓ Validé — annuler ?"}
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
    >
      {pending ? "…" : "Valider le solde"}
    </button>
  );
}
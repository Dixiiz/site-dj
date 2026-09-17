"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { validerAcompteUrssaf } from "@/app/actions";

// Valide (ou annule) la déclaration URSSAF d'un acompte reçu pour un devis
// sans échéancier : le fait basculer dans le CA URSSAF du mois de réception.
export function ValidateAcompteButton({
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
    if (annuler && !window.confirm(`Retirer la validation de l'acompte de ${customerName} ?`)) return;
    const formData = new FormData();
    formData.set("id", id);
    formData.set("annuler", annuler ? "1" : "0");
    startTransition(async () => {
      const result = await validerAcompteUrssaf(formData);
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
        className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        {pending ? "…" : "Retirer du CA"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => run(false)}
      disabled={pending}
      className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "…" : "✓ Reçu — compter dans l'URSSAF"}
    </button>
  );
}

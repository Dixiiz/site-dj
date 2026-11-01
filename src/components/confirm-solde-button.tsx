"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { confirmSoldeReceived } from "@/app/client-actions";

// Confirme la réception du solde envoyé par virement (ou reçu à la main) :
// pose les marqueurs URSSAF — le solde est compté automatiquement dans le CA.
export function ConfirmSoldeButton({
  id,
  customerName,
  confirmed,
}: {
  id: string;
  customerName: string;
  confirmed: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function run() {
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      const res = await confirmSoldeReceived(formData);
      if (res.ok) toast.success(res.message ?? "Solde confirmé ✓");
      else toast.error(res.error ?? "Opération impossible.");
    });
  }

  if (confirmed) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        ✓ compté URSSAF
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm(`Confirmer la réception du solde de ${customerName} ? Il sera compté dans l'URSSAF du mois.`))
          return;
        run();
      }}
      disabled={pending}
      className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "…" : "✓ Reçu — compter dans l'URSSAF"}
    </button>
  );
}
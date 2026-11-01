"use client";

import { useTransition } from "react";
import { validerEcheanceUrssaf } from "@/app/actions";
import { toast } from "sonner";

// Confirme (ou retire) une échéance reçue dans le CA URSSAF du mois.
export function ValidateEcheanceButton({
  id,
  annuler = false,
}: {
  id: string;
  annuler?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(formData: FormData) => {
        formData.set("id", id);
        formData.set("annuler", annuler ? "1" : "0");
        startTransition(async () => {
          const res = await validerEcheanceUrssaf(formData);
          if (res.ok) toast.success(res.message ?? "Enregistré ✓");
          else toast.error(res.error ?? "Erreur");
        });
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
          annuler
            ? "border border-border text-muted-foreground hover:text-foreground"
            : "bg-accent text-white hover:opacity-90"
        }`}
      >
        {pending ? "…" : annuler ? "Retirer du CA" : "✓ Reçu — compter dans l'URSSAF"}
      </button>
    </form>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { supprimerAcompte } from "@/app/actions";

// Supprime l'acompte d'une soirée (jamais reçu, ou reçu avant le site déjà
// déclaré) : le solde déjà validé reste inchangé grâce au solde figé.
export function SupprimerAcompteButton({
  id,
  customerName,
}: {
  id: string;
  customerName: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            `Supprimer l'acompte de ${customerName} ?\n\nLe solde déjà validé restera inchangé (montant figé). L'acompte disparaîtra du suivi acomptes.`
          )
        )
          return;
        const formData = new FormData();
        formData.set("id", id);
        startTransition(async () => {
          const res = await supprimerAcompte(formData);
          if (res.ok) toast.success(res.message ?? "Fait ✓");
          else toast.error(res.error ?? "Erreur");
        });
      }}
      className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-red-400 hover:text-red-400 disabled:opacity-50"
      title="Retirer cet acompte du suivi (ex. reçu avant le site, déjà déclaré à l'époque)"
    >
      {pending ? "…" : "✕ Supprimer l'acompte"}
    </button>
  );
}

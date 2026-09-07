"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteFreeInvoice } from "@/app/actions";

// Bouton de suppression d'une facture libre, avec confirmation et
// toast de résultat (succès / erreur).
export function DeleteInvoiceButton({
  fileName,
  invoiceNumber,
}: {
  fileName: string;
  invoiceNumber: string;
}) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!window.confirm(`Supprimer définitivement ${invoiceNumber} ? Cette action est irréversible.`)) {
      return;
    }
    const formData = new FormData();
    formData.set("file_name", fileName);
    startTransition(async () => {
      const result = await deleteFreeInvoice(formData);
      if (result.ok) {
        toast.success(`${invoiceNumber} supprimée ✓`);
      } else {
        toast.error(result.error ?? "Suppression impossible.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className={`rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10 ${
        pending ? "animate-pulse cursor-wait opacity-90" : ""
      }`}
    >
      {pending ? "…" : "Supprimer"}
    </button>
  );
}
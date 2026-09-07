"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { sendFreeInvoiceEmail } from "@/app/actions";

// Formulaire d'envoi d'une facture libre par e-mail, avec retour visuel :
// toast de confirmation/erreur + champ vidé après l'envoi.
export function SendInvoiceForm({ fileName }: { fileName: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("file_name", fileName);
    startTransition(async () => {
      const result = await sendFreeInvoiceEmail(formData);
      if (result.ok) {
        toast.success(result.message ?? "Facture envoyée ✓");
        formRef.current?.reset();
      } else {
        toast.error(result.error ?? "Échec de l'envoi.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 flex items-center gap-2">
      <input type="hidden" name="file_name" value={fileName} />
      <input
        name="email"
        type="email"
        required
        placeholder="e-mail du destinataire"
        className="w-56 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/10 ${
          pending ? "animate-pulse cursor-wait opacity-90" : ""
        }`}
      >
        {pending ? "Envoi…" : "Envoyer par e-mail"}
      </button>
    </form>
  );
}
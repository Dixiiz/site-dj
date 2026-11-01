"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { importPastQuote } from "@/app/actions";

// Formulaire d'ajout d'une soirée d'avant le site (devis papier signé).
const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export function ImportQuoteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await importPastQuote(formData);
      if (result.ok) {
        toast.success(result.message ?? "Soirée ajoutée ✓");
        formRef.current?.reset();
      } else {
        toast.error(result.error ?? "Ajout impossible.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="customer_name" className="text-sm font-medium">
            Nom du client / organisateur *
          </label>
          <input id="customer_name" name="customer_name" required placeholder="Ex. Famille Martin" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="event_date" className="text-sm font-medium">
            Date de la soirée *
          </label>
          <input id="event_date" name="event_date" type="date" required className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="formula_name" className="text-sm font-medium">
            Formule / prestation *
          </label>
          <input id="formula_name" name="formula_name" required placeholder="Ex. Pack Mariage Essential, Soirée anniversaire…" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="total" className="text-sm font-medium">
            Montant total (€) *
          </label>
          <input id="total" name="total" inputMode="decimal" required placeholder="Ex. 1 060 ou 1060" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="event_type" className="text-sm font-medium">
            Type d&apos;événement
          </label>
          <input id="event_type" name="event_type" placeholder="Ex. Mariage, Anniversaire…" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="event_location" className="text-sm font-medium">
            Lieu
          </label>
          <input id="event_location" name="event_location" placeholder="Ex. Salle des fêtes de Mer" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="customer_email" className="text-sm font-medium">
            E-mail du client
          </label>
          <input id="customer_email" name="customer_email" type="email" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="customer_phone" className="text-sm font-medium">
            Téléphone
          </label>
          <input id="customer_phone" name="customer_phone" className={inputClass} />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className={`rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 ${
          pending ? "animate-pulse cursor-wait opacity-90" : ""
        }`}
      >
        {pending ? "Enregistrement…" : "Ajouter la soirée"}
      </button>
    </form>
  );
}
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateManagedQuote } from "@/app/actions";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent";

// Formulaire d'édition inline d'une soirée (date, formule, lieu, montant,
// acompte). Utilisé par la ligne gérée (import/facture libre) et par le
// panneau de détail du CA (pour ajuster le solde d'un vrai devis du site).
export function ManagedQuoteEditForm({
  id,
  eventDate,
  formulaName,
  eventLocation,
  totalCents,
  acompteCents,
  onDone,
}: {
  id: string;
  eventDate: string;
  formulaName: string;
  eventLocation: string;
  totalCents: number;
  acompteCents: number;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function onSave(formData: FormData) {
    formData.set("id", id);
    startTransition(async () => {
      const result = await updateManagedQuote(formData);
      if (result.ok) {
        toast.success(result.message ?? "Soirée mise à jour ✓");
        onDone?.();
      } else {
        toast.error(result.error ?? "Modification impossible.");
      }
    });
  }

  return (
    <form action={onSave} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Date *</label>
          <input name="event_date" type="date" required defaultValue={eventDate} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Formule *</label>
          <input name="formula_name" required defaultValue={formulaName} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Lieu</label>
          <input name="event_location" defaultValue={eventLocation} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Montant (€) *</label>
          <input
            name="total"
            inputMode="decimal"
            required
            defaultValue={(totalCents / 100).toFixed(2).replace(".", ",")}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Acompte réglé (€)</label>
          <input
            name="acompte"
            inputMode="decimal"
            defaultValue={acompteCents > 0 ? (acompteCents / 100).toFixed(2).replace(".", ",") : ""}
            placeholder="Ex. 310 ou vide si rien"
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className={`rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 ${
            pending ? "animate-pulse cursor-wait opacity-90" : ""
          }`}
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => onDone?.()}
          className="rounded-lg border border-border px-4 py-2 text-xs transition-colors hover:border-accent/50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

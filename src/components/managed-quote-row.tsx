"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { updateManagedQuote, deleteManagedQuote } from "@/app/actions";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent";

// Ligne d'une soirée "gérée" (import papier ou facture libre) :
// modification inline (date, formule, lieu, montant) + suppression.
export function ManagedQuoteRow({
  id,
  customerName,
  formulaName,
  eventDate,
  eventLocation,
  totalCents,
  acompteCents,
}: {
  id: string;
  customerName: string;
  formulaName: string;
  eventDate: string;
  eventLocation: string;
  totalCents: number;
  acompteCents: number;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [removed, setRemoved] = useState(false);

  function onSave(formData: FormData) {
    formData.set("id", id);
    startTransition(async () => {
      const result = await updateManagedQuote(formData);
      if (result.ok) {
        toast.success(result.message ?? "Soirée mise à jour ✓");
        setEditing(false);
      } else {
        toast.error(result.error ?? "Modification impossible.");
      }
    });
  }

  function onDelete() {
    if (!window.confirm(`Supprimer définitivement la soirée de ${customerName} ?`)) return;
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      const result = await deleteManagedQuote(formData);
      if (result.ok) {
        toast.success(result.message ?? "Soirée supprimée ✓");
        setRemoved(true);
      } else {
        toast.error(result.error ?? "Suppression impossible.");
      }
    });
  }

  if (removed) return null;

  if (!editing) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{customerName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formulaName}
            {eventLocation ? ` · ${eventLocation}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-medium">
              {eventDate
                ? new Date(`${eventDate}T12:00:00`).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {(totalCents / 100).toFixed(2).replace(".", ",")} €
              {acompteCents > 0
                ? ` · solde ${((totalCents - acompteCents) / 100).toFixed(2).replace(".", ",")} €`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/10"
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
          >
            {pending ? "…" : "Supprimer"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="px-4 py-3">
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
            onClick={() => setEditing(false)}
            className="rounded-lg border border-border px-4 py-2 text-xs transition-colors hover:border-accent/50"
          >
            Annuler
          </button>
        </div>
      </form>
    </li>
  );
}
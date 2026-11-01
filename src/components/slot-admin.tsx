"use client";

import { useState } from "react";
import { createSlot, deleteSlot, toggleSlot } from "@/app/actions";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateSlotForm() {
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const result = await createSlot(formData);
    if (result && !result.ok) setError(result.error);
  }

  return (
    <form action={onSubmit} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor="slot_date">Date</Label>
        <Input id="slot_date" name="slot_date" type="date" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="start_time">Début</Label>
        <Input id="start_time" name="start_time" type="time" defaultValue="18:00" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="end_time">Fin</Label>
        <Input id="end_time" name="end_time" type="time" defaultValue="23:00" required />
      </div>
      <div className="flex items-end">
        <SubmitButton pendingLabel="Ajout…" className="w-full">
          Ajouter le créneau
        </SubmitButton>
      </div>
      {error ? <p className="sm:col-span-4 text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

export function SlotActions({
  id,
  isOpen,
}: {
  id: string;
  isOpen: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <form
          action={async (formData) => {
            setError(null);
            const result = await toggleSlot(formData);
            if (result && !result.ok) setError(result.error);
          }}
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="is_open" value={String(isOpen)} />
          <SubmitButton pendingLabel="…" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {isOpen ? "Fermer" : "Ouvrir"}
          </SubmitButton>
        </form>
        <form
          action={async (formData) => {
            setError(null);
            const result = await deleteSlot(formData);
            if (result && !result.ok) setError(result.error);
          }}
        >
          <input type="hidden" name="id" value={id} />
          <SubmitButton
            pendingLabel="Suppression…"
            confirm="Supprimer ce créneau ?"
            className={buttonVariants({ variant: "destructive", size: "sm" })}
          >
            Supprimer
          </SubmitButton>
        </form>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

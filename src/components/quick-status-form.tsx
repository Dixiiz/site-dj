"use client";

import { SubmitButton } from "@/components/submit-button";
// Changer le statut (ou supprimer) fait bouger le devis dans la liste : il
// quitte le groupe épinglé « nouveau » et se re-positionne selon le tri.
// On garde la vue vissée sur lui autour du rafraîchissement — voir
// src/components/keep-view.ts.
import { garderVue } from "@/components/keep-view";

export function QuickStatusForm({
  statusAction,
  deleteAction,
  quoteId,
  currentStatus,
}: {
  statusAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  quoteId: string;
  currentStatus: string | null;
}) {
  const statuses: [string, string][] = [
    ["nouveau", "Nouveau"],
    ["contacte", "Contacté"],
    ["attente_acompte", "En attente de l'acompte"],
    ["confirme", "Confirmé"],
    ["refuse", "Refusé"],
    ["annule", "Annulé"],
  ];
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2"
      onClick={(e) => e.stopPropagation()}
    >
      <form
        action={async (fd: FormData) => {
          await garderVue(quoteId, async () => {
            await statusAction(fd);
          });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="id" value={quoteId} />
        <span className="text-xs text-muted-foreground">Statut rapide :</span>
        {statuses.map(([value, lbl]) => (
          <SubmitButton
            key={value}
            name="status"
            value={value}
            pendingLabel="…"
            className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
              currentStatus === value
                ? "border-accent bg-accent/15 text-foreground"
                : "border-border text-muted-foreground hover:border-accent hover:text-foreground"
            }`}
          >
            {lbl}
          </SubmitButton>
        ))}
      </form>
      <form
        action={async (fd: FormData) => {
          await garderVue(quoteId, async () => {
            await deleteAction(fd);
          });
        }}
        className="ml-auto"
      >
        <input type="hidden" name="id" value={quoteId} />
        <SubmitButton
          pendingLabel="Suppression…"
          confirm="Supprimer définitivement ce devis ? Cette action est irréversible."
          className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/15"
        >
          Supprimer
        </SubmitButton>
      </form>
    </div>
  );
}
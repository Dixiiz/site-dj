"use client";

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
      <form action={statusAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={quoteId} />
        <span className="text-xs text-muted-foreground">Statut rapide :</span>
        {statuses.map(([value, lbl]) => (
          <button
            key={value}
            type="submit"
            name="status"
            value={value}
            className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
              currentStatus === value
                ? "border-accent bg-accent/15 text-foreground"
                : "border-border text-muted-foreground hover:border-accent hover:text-foreground"
            }`}
          >
            {lbl}
          </button>
        ))}
      </form>
      <form
        action={deleteAction}
        className="ml-auto"
        onSubmit={(e) => {
          if (!window.confirm("Supprimer définitivement ce devis ? Cette action est irréversible.")) {
            e.preventDefault();
            return;
          }
          // Safari/WebKit : une sélection de texte active sur l'élément qui va
          // être retiré du DOM fait planter la mise à jour (« EmptyRanges »).
          window.getSelection()?.removeAllRanges();
          (document.activeElement as HTMLElement | null)?.blur();
        }}
      >
        <input type="hidden" name="id" value={quoteId} />
        <button
          type="submit"
          className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/15"
        >
          Supprimer
        </button>
      </form>
    </div>
  );
}
"use client";

export function QuickStatusForm({
  action,
  quoteId,
  currentStatus,
}: {
  action: (formData: FormData) => void | Promise<void>;
  quoteId: string;
  currentStatus: string | null;
}) {
  const statuses: [string, string][] = [
    ["nouveau", "Nouveau"],
    ["contacte", "Contacté"],
    ["confirme", "Confirmé"],
    ["refuse", "Refusé"],
    ["annule", "Annulé"],
  ];
  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2"
      onClick={(e) => e.stopPropagation()}
    >
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
  );
}
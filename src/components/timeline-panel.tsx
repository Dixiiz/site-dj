"use client";

import { useState } from "react";
import { saveClientTimeline } from "@/app/client-actions";

export type TimelineRow = { time: string; label: string };

// Timeline de la soirée : panneau flottant à droite de l'écran, que le
// client peut ouvrir/fermer. Il renseigne les horaires (cérémonie, cocktail,
// repas, dessert, ouverture de bal…) — visibles aussi par Maxime et sur la
// fiche de soirée PDF.
export function TimelinePanel({
  quoteId,
  initial,
}: {
  quoteId: string;
  initial: TimelineRow[];
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TimelineRow[]>(
    initial.length > 0
      ? initial
      : [
          { time: "", label: "Cérémonie" },
          { time: "", label: "Cocktail" },
          { time: "", label: "Repas" },
          { time: "", label: "Dessert" },
          { time: "", label: "Ouverture de bal" },
        ]
  );
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(i: number, field: keyof TimelineRow, value: string) {
    setRows((current) => current.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
    setSaved(null);
  }

  function save() {
    setPending(true);
    const fd = new FormData();
    fd.set("quote_id", quoteId);
    fd.set("timeline", JSON.stringify(rows.filter((r) => r.label.trim())));
    start();
    function start() {
      void (async () => {
        const res = await saveClientTimeline(fd);
        setPending(false);
        setSaved(res && res.ok ? "Enregistré ✓" : (res && !res.ok ? res.error ?? "Erreur" : "Erreur"));
        if (res && res.ok) setTimeout(() => setSaved(null), 2500);
      })();
    }
  }

  return (
    <>
      {/* Poignée fixe à droite de l'écran */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-lg border border-r-0 border-border bg-background px-2 py-3 text-xs font-medium text-foreground/80 shadow-lg transition-colors hover:text-accent"
        style={{ writingMode: "vertical-rl" }}
        aria-expanded={open}
      >
        {open ? "Fermer la timeline" : "Timeline de la soirée"}
      </button>

      {/* Panneau */}
      {open ? (
        <div className="fixed right-2 top-1/2 z-40 max-h-[80vh] w-[320px] max-w-[92vw] -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Timeline de la soirée</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Réduire
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Renseigne les horaires : ça permet à Maxime de caler la musique au
            millimètre. Tu peux modifier quand tu veux.
          </p>
          <div className="mt-3 space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="time"
                  value={row.time}
                  onChange={(e) => update(i, "time", e.target.value)}
                  className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-accent"
                />
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => update(i, "label", e.target.value)}
                  placeholder="Moment…"
                  className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setRows((current) => current.filter((_, idx) => idx !== i))}
                  className="text-xs text-muted-foreground transition-colors hover:text-red-400"
                  aria-label="Retirer cette ligne"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRows((current) => [...current, { time: "", label: "" }])}
            className="mt-2 text-xs text-accent underline-offset-2 hover:underline"
          >
            + Ajouter un moment
          </button>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
            {saved ? <span className="text-xs text-green-400">{saved}</span> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

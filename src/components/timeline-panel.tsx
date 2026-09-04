"use client";

import { useEffect, useState } from "react";
import { saveClientTimeline } from "@/app/client-actions";

export type TimelineRow = { time: string; label: string };

const DEFAULT_ROWS: TimelineRow[] = [
  { time: "", label: "Cérémonie" },
  { time: "", label: "Cocktail" },
  { time: "", label: "Repas" },
  { time: "", label: "Dessert" },
  { time: "", label: "Ouverture de bal" },
];

// Créneaux de 15 min en 15 min, de 12:00 à 05:45 (le lendemain matin).
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let m = 12 * 60; m <= 29 * 60 + 45; m += 15) {
    const hh = String(Math.floor(m / 60) % 24).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    out.push(`${hh}:${mm}`);
  }
  return out;
})();

// Tri chronologique : les lignes horodatées d'abord, les vides à la fin.
function sortRows(rows: TimelineRow[]): TimelineRow[] {
  const toMin = (t: string) => {
    if (!t) return Infinity;
    const [h, m] = t.split(":").map(Number);
    return (h < 12 ? h + 24 : h) * 60 + m;
  };
  return [...rows].sort((a, b) => toMin(a.time) - toMin(b.time));
}

// Timeline de la soirée : panneau latéral droit coulissant. Le client y
// renseigne les horaires (cérémonie, cocktail, repas…) — visibles par Maxime
// et intégrés à la fiche de soirée PDF.
export function TimelinePanel({
  quoteId,
  initial,
}: {
  quoteId: string;
  initial: TimelineRow[];
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TimelineRow[]>(
    initial.length > 0 ? initial : DEFAULT_ROWS.map((r) => ({ ...r }))
  );
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Panneau ouvert : le contenu de la page est poussé au lieu d'être écrasé.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 640px)");
    const apply = () => {
      document.body.style.paddingRight = mounted && open && wide.matches ? "22rem" : "";
    };
    apply();
    wide.addEventListener("change", apply);
    return () => {
      wide.removeEventListener("change", apply);
      document.body.style.paddingRight = "";
    };
  }, [mounted, open]);

  // Fermeture avec la touche Échap.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function update(i: number, field: keyof TimelineRow, value: string) {
    setRows((current) => {
      const next = current.map((r, idx) => (idx === i ? { ...r, [field]: value } : r));
      return field === "time" ? sortRows(next) : next;
    });
    setSaved(null);
  }

  function save() {
    setPending(true);
    const fd = new FormData();
    fd.set("quote_id", quoteId);
    fd.set("timeline", JSON.stringify(rows.filter((r) => r.label.trim())));
    void (async () => {
      const res = await saveClientTimeline(fd);
      setPending(false);
      if (res && res.ok) {
        setSaved("Enregistré");
        setTimeout(() => setSaved(null), 2000);
      } else {
        setSaved((res && !res.ok ? res.error : null) ?? "Erreur");
      }
    })();
  }

  return (
    <>
      {/* Poignée fixe sur le bord droit */}
      <button
        type="button"
        onClick={() => {
          setMounted(true);
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-lg border border-r-0 border-border bg-background/95 px-1.5 py-4 text-[11px] font-medium tracking-wide text-foreground/70 shadow-md backdrop-blur transition-colors hover:text-accent"
        style={{ writingMode: "vertical-rl" }}
      >
        {open ? "Fermer" : "Timeline"}
      </button>
      {/* Panneau coulissant */}
      <aside
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-40 flex h-full w-[22rem] max-w-[92vw] flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ visibility: mounted ? "visible" : "hidden" }}
      >
        {/* Barre de tiroir : clique dessus pour fermer le panneau */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer la timeline"
          className="group absolute inset-y-0 left-0 flex w-7 items-center justify-center border-r border-border bg-muted/60 transition-colors hover:bg-accent/10"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="text-muted-foreground transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:text-accent"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-medium">Timeline de la soirée</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Les horaires aident à caler la musique.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fermer la timeline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="relative">
            <div className="absolute bottom-3 left-[13px] top-3 w-px bg-border" aria-hidden />
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div
                  key={`${open}-${i}`}
                  className="timeline-row relative flex items-center gap-3 pl-8"
                  style={{ animationDelay: `${i * 45}ms` }}
                >
                  <span
                    className="absolute left-[9px] h-2.5 w-2.5 rounded-full border-2 border-accent bg-background"
                    aria-hidden
                  />
                  <select
                    value={row.time}
                    onChange={(e) => update(i, "time", e.target.value)}
                    className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none transition-colors focus:border-accent"
                  >
                    <option value="">--:--</option>
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) => update(i, "label", e.target.value)}
                    placeholder="Moment…"
                    className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setRows((current) => current.filter((_, idx) => idx !== i))}
                    className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-red-400"
                    aria-label="Retirer cette ligne"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRows((current) => [...current, { time: "", label: "" }])}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Ajouter un moment
          </button>
        </div>

        <div className="flex items-center gap-3 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Enregistrement…" : "Enregistrer ma timeline"}
          </button>
          {saved ? <span className="text-xs font-medium text-green-400">{saved}</span> : null}
        </div>
        </div>
      </aside>
    </>
  );
}

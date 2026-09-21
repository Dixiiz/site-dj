"use client";

// Section repliable pour la page Admin → Médias : évite une page à rallonge
// avec les 4 sections (photos, packs, vidéos, héro) toutes dépliées.
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsibleSection({
  title,
  hint,
  badge,
  children,
}: {
  title: string;
  hint?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{title}</span>
            {badge ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {badge}
              </span>
            ) : null}
          </span>
          {hint ? (
            <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? <div className="border-t border-border p-5">{children}</div> : null}
    </section>
  );
}

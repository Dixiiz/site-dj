"use client";

import { useState, useTransition } from "react";
import { renameClientQuote } from "@/app/client-actions";

// Renommage inline depuis la liste des devis.
export function RenameInline({
  quoteId,
  current,
}: {
  quoteId: string;
  current: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    const formData = new FormData();
    formData.set("quote_id", quoteId);
    formData.set("label", value);
    startTransition(async () => void (await renameClientQuote(formData)));
    setOpen(false);
  }

  if (open) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
        <input
          autoFocus
          value={value}
          maxLength={60}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setOpen(false);
          }}
          className="w-44 rounded-md border border-accent/50 bg-background px-2 py-1 text-xs outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-accent/15 px-2 py-1 text-xs font-medium text-accent"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-white/10 px-2 py-1 text-xs text-muted-foreground"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      title="Renommer ce devis"
      onClick={(e) => {
        e.preventDefault();
        setOpen(true);
      }}
      className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
    >
      ✏️
    </button>
  );
}

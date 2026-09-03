"use client";

import { useState, useTransition } from "react";
import { updateQuoteOptions } from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { formatEuros } from "@/lib/money";

type SimpleOption = { id: string; name: string; price_cents: number };

export function ClientOptionsEditor({
  quoteId,
  options,
  selectedIds,
  disabled,
  notice,
}: {
  quoteId: string;
  options: SimpleOption[];
  selectedIds: string[];
  disabled: boolean;
  notice?: "pending" | "review";
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function toggle(id: string) {
    if (disabled) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateQuoteOptions(formData);
      setFeedback(
        result.ok ? (result.message ?? "Demande envoyée ✓") : (result.error ?? null)
      );
      setIsError(!result.ok);
    });
  }

  return (
    <form action={onSubmit} className="mt-4 space-y-3">
      <input type="hidden" name="quote_id" value={quoteId} />
      <ul className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checked = selected.has(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={checked}
                onClick={() => toggle(option.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  checked
                    ? "border-accent bg-accent/10"
                    : "border-white/10 hover:border-accent/40"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <span className="min-w-0">
                  {checked ? "✓ " : ""}
                  {option.name}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {formatEuros(option.price_cents)}
                </span>
              </button>
              <input
                type="checkbox"
                name="option_ids"
                value={option.id}
                checked={checked}
                onChange={() => toggle(option.id)}
                className="hidden"
              />
            </li>
          );
        })}
      </ul>
      {!disabled ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Envoi…" : "Demander ces options"}
          </Button>
          {notice === "review" && !feedback ? (
            <span className="text-xs text-muted-foreground">
              Soumis à validation avant application au devis.
            </span>
          ) : null}
          {feedback ? (
            <p className={`text-sm ${isError ? "text-destructive" : "text-accent"}`}>
              {feedback}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

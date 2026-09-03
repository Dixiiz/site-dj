"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  // Options déjà confirmées dans le devis (bleu foncé) vs nouvelles demandes (jaune).
  const [confirmedIds] = useState<Set<string>>(new Set(selectedIds));
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
          const confirmed = confirmedIds.has(option.id);
          // Bleu foncé = déjà validé dans le devis ; jaune = nouvelle demande en attente.
          const tone = checked
            ? confirmed
              ? {
                  box: "border-blue-500/70 bg-blue-500/15 shadow-[0_0_20px_-8px_rgba(59,130,246,0.8)]",
                  badge: "bg-blue-500 text-white",
                  label: "text-blue-300",
                }
              : {
                  box: "border-yellow-500/70 bg-yellow-500/15 shadow-[0_0_20px_-8px_rgba(234,179,8,0.8)]",
                  badge: "bg-yellow-500 text-background",
                  label: "text-yellow-300",
                }
            : {
                box: "border-white/10 hover:border-accent/40",
                badge: "",
                label: "",
              };
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={checked}
                onClick={() => toggle(option.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all duration-300 ${
                  tone.box
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
                    <AnimatePresence>
                      {checked ? (
                        <motion.span
                          key={confirmed ? "check-blue" : "check-yellow"}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className={`absolute inset-0 flex items-center justify-center rounded-full text-[10px] font-bold ${tone.badge}`}
                        >
                          ✓
                        </motion.span>
                      ) : (
                        <motion.span
                          key="circle"
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="absolute inset-0 rounded-full border border-white/25"
                        />
                      )}
                    </AnimatePresence>
                  </span>
                  <span className={`min-w-0 ${confirmed ? "" : tone.label}`}>
                    {option.name}
                  </span>
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

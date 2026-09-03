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
  co2InitialQty = 1,
}: {
  quoteId: string;
  options: SimpleOption[];
  selectedIds: string[];
  disabled: boolean;
  notice?: "pending" | "review";
  co2InitialQty?: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  // Options déjà confirmées dans le devis (bleu foncé, non désélectionnables)
  // vs nouvelles demandes (jaune, en attente de validation).
  const [confirmedIds] = useState<Set<string>>(new Set(selectedIds));
  const [co2Qty, setCo2Qty] = useState<1 | 2>(
    co2InitialQty === 2 ? 2 : 1
  );
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
      <input type="hidden" name="co2_qty" value={co2Qty} />
      <ul className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checked = selected.has(option.id);
          const confirmed = confirmedIds.has(option.id);
          const isCo2 = /co2/i.test(option.name);
          const qty = isCo2 && checked ? co2Qty : 1;
          const qtyChanged = isCo2 && co2Qty !== co2InitialQty;
          // Bleu foncé = confirmé et inchangé ; jaune = nouveau / modifié /
          // suppression demandée (en attente de validation).
          const pendingRemoval = !checked && confirmed;
          const stillConfirmed = checked && confirmed && !qtyChanged;
          const tone = stillConfirmed
            ? {
                box: "border-blue-500 bg-blue-600/30 shadow-[0_0_20px_-8px_rgba(59,130,246,0.9)]",
                badge: "bg-blue-500 text-white",
                badgeIcon: "✓",
                label: "text-blue-200",
              }
            : checked || pendingRemoval
              ? {
                  box: "border-yellow-500/70 bg-yellow-500/15 shadow-[0_0_20px_-8px_rgba(234,179,8,0.8)]",
                  badge: "bg-yellow-500 text-background",
                  badgeIcon: "⏳",
                  label: "text-yellow-300",
                }
              : {
                  box: "border-white/10 hover:border-accent/40",
                  badge: "",
                  badgeIcon: "",
                  label: "",
                };
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={checked}
                onClick={() => toggle(option.id)}
                title={
                  stillConfirmed
                    ? "Option confirmée dans le devis"
                    : pendingRemoval
                      ? "Suppression en attente de validation"
                      : checked
                        ? "Modification en attente de validation"
                        : "Cliquer pour demander cette option"
                }
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all duration-300 ${
                  tone.box
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
                    <AnimatePresence>
                      {checked || pendingRemoval ? (
                        <motion.span
                          key={stillConfirmed ? "check-blue" : "wait"}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className={`absolute inset-0 flex items-center justify-center rounded-full text-[10px] font-bold ${tone.badge}`}
                        >
                          {tone.badgeIcon}
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
                  <span
                    className={`min-w-0 ${stillConfirmed ? "text-blue-200" : tone.label} ${
                      pendingRemoval ? "line-through opacity-80" : ""
                    }`}
                  >
                    {option.name}
                  </span>
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {checked ? formatEuros(option.price_cents * qty) : formatEuros(0)}
                </span>
              </button>
              {/* Quantité pour les pistolets CO2 (modifiable, soumise à validation) */}
              {isCo2 && checked ? (
                <div className="mt-1.5 flex items-center gap-2 pl-3 text-xs text-muted-foreground">
                  <span>Quantité :</span>
                  <select
                    value={co2Qty}
                    onChange={(e) =>
                      setCo2Qty(Number(e.target.value) === 2 ? 2 : 1)
                    }
                    className="rounded-md border border-white/10 bg-background px-2 py-1 text-xs"
                  >
                    <option value={1}>1 pistolet</option>
                    <option value={2}>2 pistolets</option>
                  </select>
                  <span>{formatEuros(option.price_cents * co2Qty)}</span>
                </div>
              ) : null}
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

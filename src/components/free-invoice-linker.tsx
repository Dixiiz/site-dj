"use client";

import { useState } from "react";
import { formatEuros } from "@/lib/money";

export type LinkableQuote = {
  id: string;
  label: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  formulaName: string;
  totalCents: number;
};

// Liaison facultative d'une facture libre à un devis existant : la facture
// apparaît alors à la fois sur cette page et dans les documents du devis.
// Sélectionner un devis pré-remplit le nom et les coordonnées du client ;
// saisir un pourcentage pré-remplit la première ligne avec le montant calculé
// (le % n'apparaît jamais sur le PDF, seul le montant figure).
export function FreeInvoiceLinker({ quotes }: { quotes: LinkableQuote[] }) {
  const [quoteId, setQuoteId] = useState("");
  const [percent, setPercent] = useState("");

  const selected = quotes.find((q) => q.id === quoteId);
  const pct = parseFloat(percent.replace(",", "."));
  const percentValue = Number.isFinite(pct) && pct > 0 ? Math.min(100, Math.round(pct)) : null;
  const computedCents =
    selected && percentValue ? Math.round((selected.totalCents * percentValue) / 100) : null;

  // Pré-remplit la première ligne (désignation + prix) avec le % du total.
  const applyPercentLine = (quote: LinkableQuote | undefined, value: string) => {
    const parsed = parseFloat(value.replace(",", "."));
    const clamped = Number.isFinite(parsed) && parsed > 0 ? Math.min(100, Math.round(parsed)) : null;
    if (!quote || !clamped) return;
    const label = document.getElementById("line_label_0") as HTMLInputElement | null;
    const price = document.getElementById("line_price_0") as HTMLInputElement | null;
    if (label) {
      label.value = `Acompte — ${quote.formulaName || "prestation"}`;
    }
    if (price) {
      price.value = (Math.round((quote.totalCents * clamped) / 100) / 100)
        .toFixed(2)
        .replace(".", ",");
    }
  };

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.04] p-4">
      <p className="text-sm font-medium">Lier à un devis (facultatif)</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        La facture apparaîtra aussi dans les documents du devis concerné.
        Sélectionner un devis pré-remplit le nom et les coordonnées du client ;
        un pourcentage pré-remplit la première ligne avec le montant calculé
        (modifiable).
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_150px] sm:items-end">
        <label className="text-xs text-muted-foreground">
          Devis concerné
          <select
            value={quoteId}
            onChange={(e) => {
              const id = e.target.value;
              setQuoteId(id);
              const quote = quotes.find((q) => q.id === id);
              const setValue = (inputId: string, value: string) => {
                const el = document.getElementById(inputId) as HTMLInputElement | null;
                if (el) el.value = value;
              };
              if (quote) {
                setValue("customer_name", quote.customerName);
                setValue("customer_email", quote.customerEmail);
                setValue("customer_phone", quote.customerPhone);
              }
              applyPercentLine(quote, percent);
            }}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">— Aucun (facture libre simple) —</option>
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Part du total (%)
          <input
            value={percent}
            onChange={(e) => {
              setPercent(e.target.value);
              applyPercentLine(selected, e.target.value);
            }}
            inputMode="decimal"
            placeholder="Ex. 50"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>
      {selected && computedCents != null && percentValue ? (
        <p className="mt-2 text-xs text-cyan-300">
          Ligne pré-remplie : <strong>{formatEuros(computedCents)}</strong> (
          {percentValue} % de {formatEuros(selected.totalCents)}) — le
          pourcentage ne figure pas sur le PDF.
        </p>
      ) : null}
    </div>
  );
}

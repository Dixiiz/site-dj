"use client";

import { useState } from "react";
import { saveInvoiceAdjustments } from "@/app/client-actions";

type Adj = { label: string; amount_cents: number };

// Éditeur des lignes personnalisées de la facture (ajouts / réductions).
export function InvoiceAdjustments({
  quoteId,
  initial,
}: {
  quoteId: string;
  initial: Adj[];
}) {
  const [rows, setRows] = useState<Adj[]>(initial);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const add = () => {
    const v = parseFloat(amount.replace(",", "."));
    if (!label.trim() || isNaN(v) || v === 0) {
      setMsg("Renseigne un libellé et un montant non nul.");
      return;
    }
    setRows([...rows, { label: label.trim(), amount_cents: Math.round(v * 100) }]);
    setLabel("");
    setAmount("");
    setMsg(null);
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const res = await saveInvoiceAdjustments(
      rows.map((r) => ({ label: r.label, amount: String(r.amount_cents / 100) })),
      quoteId
    );
    setMsg(res.ok ? (res.message ?? "Enregistré ✓") : (res.error ?? "Erreur"));
    setBusy(false);
  };

  const total = rows.reduce((s, r) => s + r.amount_cents, 0);

  return (
    <div className="mt-3 rounded-lg border border-white/10 p-3">
      <p className="text-xs font-medium text-muted-foreground">
        ✏️ Lignes personnalisées de la facture
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground/70">
        Montant positif = ajout, négatif = réduction (ex. −50 pour une remise de 50 €).
        Ces lignes seront ajoutées au tableau et le total recalculé.
      </p>
      {rows.length > 0 && (
        <ul className="mt-2 space-y-1">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">
                {r.label}{" "}
                <span className={r.amount_cents < 0 ? "text-red-400" : "text-green-400"}>
                  ({r.amount_cents < 0 ? "−" : "+"}
                  {Math.abs(r.amount_cents / 100).toFixed(2)} €)
                </span>
              </span>
              <button
                type="button"
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
                className="text-muted-foreground transition-colors hover:text-red-400"
                aria-label="Supprimer la ligne"
              >
                ✕
              </button>
            </li>
          ))}
          <li className="border-t border-white/10 pt-1 text-xs text-muted-foreground">
            Impact sur le total :{" "}
            <span className={total < 0 ? "text-red-400" : "text-green-400"}>
              {total >= 0 ? "+" : "−"}
              {Math.abs(total / 100).toFixed(2)} €
            </span>
          </li>
        </ul>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé (ex. Remise, Mise à disposition…)"
          className="min-w-40 flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs outline-none focus:border-cyan-400/50"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Montant €"
          className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs outline-none focus:border-cyan-400/50"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-md border border-white/15 px-2 py-1 text-xs transition-colors hover:bg-white/10"
        >
          + Ajouter
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-md border border-cyan-500/50 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-400 transition-colors hover:bg-cyan-400/25 hover:text-cyan-200 disabled:opacity-50"
        >
          {busy ? "…" : "💾 Enregistrer"}
        </button>
      </div>
      {msg && <p className="mt-1 text-[11px] text-muted-foreground">{msg}</p>}
    </div>
  );
}

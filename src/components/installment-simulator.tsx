"use client";

import { useState } from "react";
import { montantsEcheances } from "@/lib/installments";
import { formatEuros } from "@/lib/money";

// Simulateur public de paiement en plusieurs fois : le visiteur voit
// immédiatement ses échéances selon le nombre choisi — sans configurer
// de devis. Montant pré-rempli avec le pack sélectionné, ajustable.
const NIVEAUX = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function InstallmentSimulator({ baseCents }: { baseCents: number | null }) {
  const [montant, setMontant] = useState<string>("");
  const [niveau, setNiveau] = useState<number | null>(null);

  // Montant affiché : saisie manuelle, sinon prix du pack sélectionné.
  const base = baseCents ?? 0;
  const totalCents = (() => {
    const parsed = Number.parseFloat(montant.replace(",", ".").replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : base;
  })();
  const pret = totalCents > 0;
  const detail = pret && niveau ? montantsEcheances(totalCents, niveau) : null;

  return (
    <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-5">
      <p className="font-medium text-accent">
        💳 Simulateur — payez en plusieurs fois, de 2 à 10 fois
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Estimez vos échéances en un clic. Montant indicatif — le montant exact
        sera fixé sur votre devis.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">
            Montant de votre événement (€)
            {baseCents ? " — pré-rempli avec votre pack" : ""}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder={baseCents ? formatEuros(baseCents) : "ex. 1200"}
            className="w-full max-w-48 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {NIVEAUX.map((n) => (
            <button
              key={n}
              type="button"
              disabled={!pret}
              onClick={() => setNiveau(niveau === n ? null : n)}
              aria-pressed={niveau === n}
              className={`min-w-12 rounded-md border px-3 py-2 text-sm font-medium transition-all disabled:opacity-40 ${
                niveau === n
                  ? "border-accent bg-accent text-white shadow-sm"
                  : "border-border bg-background hover:border-accent"
              }`}
            >
              {n}×
            </button>
          ))}
        </div>
      </div>

      {detail && niveau ? (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 space-y-2 rounded-lg border border-border bg-background p-4 text-sm duration-300">
          <p className="font-medium">
            En {niveau} fois, pour {formatEuros(totalCents)} :
          </p>
          <div className="space-y-1 text-muted-foreground">
            <p>
              <span className="text-foreground">1ʳᵉ échéance : {formatEuros(detail.first)}</span>{" "}
              — acompte de réservation, verrouille votre date dès signature
            </p>
            {niveau > 1 ? (
              <p>
                puis {niveau - 1} échéance(s) de{" "}
                <span className="text-foreground">{formatEuros(detail.rest)}</span>, espacées
                d&apos;environ un mois, toujours avant la soirée
              </p>
            ) : null}
            <p className="text-xs">
              Total payé : {formatEuros(detail.first + detail.rest * (niveau - 1))}
              {" — "}frais de paiement en ligne inclus (1,5 % + 0,25 €/échéance).
              Le virement reste toujours possible sans ces frais.
            </p>
          </div>
          <p className="pt-1 text-xs text-muted-foreground">
            Vous choisirez (ou non — c&apos;est une option) votre échéancier dans
            votre espace client, après confirmation du devis. Estimation
            indicative sur la base du montant saisi.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          {pret
            ? "Cliquez sur un format (3×, 4×…) pour voir vos échéances."
            : "Saisissez un montant pour estimer vos échéances."}
        </p>
      )}
    </div>
  );
}
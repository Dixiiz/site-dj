"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { CaDetailPanel, type DetailRow } from "./ca-detail-panel";

type CardDef = {
  vue: string;
  label: string;
  value: string;
  hint: string;
  /** Grande carte du bloc 1 (CA signé / URSSAF). */
  hero?: boolean;
  /** Libellé en accent (carte CA signé). */
  accentLabel?: boolean;
  href?: string;
  icon?: LucideIcon;
};

type DetailData = {
  titre: string;
  rows: DetailRow[];
  solde?: boolean;
};

/**
 * Cartes du tableau de bord + panneaux de détail. Ouverture INSTANTANÉE
 * côté client (pas de navigation serveur) : la section s'affiche en
 * animation juste sous la carte cliquée.
 */
export function DashboardDetail({
  initialVue,
  cards1,
  cards2,
  details,
  echeanciersPanel,
  soldeRecusPanel,
}: {
  initialVue?: string | null;
  cards1: CardDef[];
  cards2: CardDef[];
  details: Record<string, DetailData | undefined>;
  /** Panneau « Échéances en cours » (rendu serveur). */
  echeanciersPanel: ReactNode;
  /** Panneau « paiements d'échéancier reçus à confirmer » (rendu serveur). */
  soldeRecusPanel: ReactNode;
}) {
  const [vue, setVue] = useState<string | null>(initialVue ?? null);
  const toggle = (v: string) => setVue((cur) => (cur === v ? null : v));
  const detail = vue ? details[vue] : undefined;
  const inBlock1 = cards1.some((c) => c.vue === vue);

  const heroClass = (card: CardDef) =>
    `rounded-2xl border p-6 text-left transition-colors ${
      vue === card.vue
        ? "border-accent ring-1 ring-accent"
        : card.accentLabel
          ? "border-accent/40 bg-gradient-to-br from-accent/15 to-accent/5 hover:border-accent"
          : "border-border bg-card hover:border-accent/50"
    }`;

  const defaultClass = (card: CardDef) =>
    `rounded-xl border p-5 text-left transition-colors ${
      vue === card.vue
        ? "border-accent ring-1 ring-accent"
        : "border-border bg-card hover:border-accent/50"
    }`;

  return (
    <>
      {/* BLOC 1 : les 2 chiffres qui comptent */}
      <div className="grid gap-4 md:grid-cols-2">
        {cards1.map((card) => (
          <button
            key={card.vue}
            type="button"
            onClick={() => toggle(card.vue)}
            className={heroClass(card)}
          >
            <p
              className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.15em] ${
                card.accentLabel ? "text-accent" : "text-muted-foreground"
              }`}
            >
              {card.icon ? <card.icon className="size-4" aria-hidden /> : null}
              {card.label}
            </p>
            <p className="mt-2 text-4xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{card.hint}</p>
          </button>
        ))}
      </div>

      {/* Détail ouvert depuis le bloc 1 : affiché juste en dessous */}
      {detail && inBlock1 ? (
        <CaDetailPanel
          titre={detail.titre}
          rows={detail.rows}
          solde={detail.solde}
          onClose={() => setVue(null)}
        />
      ) : null}

      {/* BLOC 2 : détails (cliquables → détail) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards2.map((card) =>
          card.href ? (
            <Link
              key={card.label}
              href={card.href}
              className={defaultClass(card)}
            >
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              <p className="mt-1.5 text-xl font-semibold">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </Link>
          ) : (
            <button
              key={card.label}
              type="button"
              onClick={() => toggle(card.vue)}
              className={defaultClass(card)}
            >
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              <p className="mt-1.5 text-xl font-semibold">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </button>
          ),
        )}
      </div>

      {/* Détails ouverts depuis le bloc 2 : affichés juste en dessous */}
      {vue === "echeanciers" ? echeanciersPanel : null}
      {vue === "solde" ? soldeRecusPanel : null}
      {detail && !inBlock1 ? (
        <CaDetailPanel
          titre={detail.titre}
          rows={detail.rows}
          solde={detail.solde}
          onClose={() => setVue(null)}
        />
      ) : null}
    </>
  );
}

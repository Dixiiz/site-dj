"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CaDetailPanel, type DetailRow } from "./ca-detail-panel";

// Lien animé (survol léger + pression) réutilisé dans le bloc 2.
const MotionLink = motion.create(Link);

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
  /** Icône déjà rendue (élément JSX) — ne pas passer un composant brut. */
  icon?: ReactNode;
};

type DetailData = {
  titre: string;
  rows: DetailRow[];
  solde?: boolean;
};

const MOIS_NOMS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** « 2025-08 » → « août 2025 ». */
function libelleMois(mois: string) {
  const [annee, m] = mois.split("-");
  return `${MOIS_NOMS[Number(m) - 1] ?? mois} ${annee ?? ""}`.trim();
}

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
  detailsUrssaf,
  echeanciersPanel,
  soldeRecusPanel,
}: {
  initialVue?: string | null;
  cards1: CardDef[];
  cards2: CardDef[];
  details: Record<string, DetailData | undefined>;
  /** Détails URSSAF des anciennes périodes, clé « urssaf:AAAA-MM ». */
  detailsUrssaf?: Record<string, DetailData | undefined>;
  /** Panneau « Échéances en cours » (rendu serveur). */
  echeanciersPanel: ReactNode;
  /** Panneau « paiements d'échéancier reçus à confirmer » (rendu serveur). */
  soldeRecusPanel: ReactNode;
}) {
  const [vue, setVue] = useState<string | null>(initialVue ?? null);
  const toggle = (v: string) => setVue((cur) => (cur === v ? null : v));
  // Vue spéciale « détail d'une ancienne période URSSAF » (urssaf:AAAA-MM) :
  // les données sont précalculées côté serveur dans detailsUrssaf.
  const estDetailMois = vue?.startsWith("urssaf:") ?? false;
  const detail = vue ? (details[vue] ?? (estDetailMois ? detailsUrssaf?.[vue] : undefined)) : undefined;
  const inBlock1 = cards1.some((c) => c.vue === vue) || estDetailMois;
  const montreSelecteurMois =
    (vue === "urssaf" || estDetailMois) && Object.keys(detailsUrssaf ?? {}).length > 0;
  // La carte URSSAF reste surlignée quand on consulte un ancien mois.
  const estCarteActive = (card: CardDef) =>
    vue === card.vue || (card.vue === "urssaf" && estDetailMois);

  const heroClass = (card: CardDef) =>
    `rounded-2xl border p-6 text-left transition-colors ${
      estCarteActive(card)
        ? "border-accent ring-1 ring-accent"
        : card.accentLabel
          ? "border-accent/40 bg-gradient-to-br from-accent/15 to-accent/5 hover:border-accent"
          : "border-border bg-card hover:border-accent/50"
    }`;

  const defaultClass = (card: CardDef) =>
    `rounded-xl border p-5 text-left transition-colors ${
      estCarteActive(card)
        ? "border-accent ring-1 ring-accent"
        : "border-border bg-card hover:border-accent/50"
    }`;

  return (
    <>
      {/* BLOC 1 : les 2 chiffres qui comptent */}
      <div className="grid gap-4 md:grid-cols-2">
        {cards1.map((card, i) => (
          <motion.button
            key={card.vue}
            type="button"
            onClick={() => toggle(card.vue)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08, ease: "easeOut" }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className={heroClass(card)}
          >
            <p
              className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.15em] ${
                card.accentLabel ? "text-accent" : "text-muted-foreground"
              }`}
            >
              {card.icon}
              {card.label}
            </p>
            <p className="mt-2 text-4xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{card.hint}</p>
          </motion.button>
        ))}
      </div>

      {/* Détail ouvert depuis le bloc 1 : affiché juste en dessous */}
      {detail && inBlock1 ? (
        <CaDetailPanel
          titre={detail.titre}
          rows={detail.rows}
          solde={detail.solde}
          onClose={() => setVue(null)}
        >
          {montreSelecteurMois ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Anciennes périodes :</span>
              {Object.keys(detailsUrssaf ?? {})
                .sort((a, b) => b.localeCompare(a))
                .slice(0, 12)
                .map((cle) => {
                  const mois = cle.replace(/^urssaf:/, "");
                  return (
                    <button
                      key={cle}
                      type="button"
                      onClick={() => setVue(cle)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        vue === cle
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted-foreground hover:border-accent/50 hover:text-accent"
                      }`}
                    >
                      {libelleMois(mois)}
                    </button>
                  );
                })}
            </div>
          ) : null}
        </CaDetailPanel>
      ) : null}

      {/* BLOC 2 : détails (cliquables → détail) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards2.map((card, i) =>
          card.href ? (
            <MotionLink
              key={card.label}
              href={card.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.16 + i * 0.06, ease: "easeOut" }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={defaultClass(card)}
            >
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              <p className="mt-1.5 text-xl font-semibold">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </MotionLink>
          ) : (
            <motion.button
              key={card.label}
              type="button"
              onClick={() => toggle(card.vue)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.16 + i * 0.06, ease: "easeOut" }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={defaultClass(card)}
            >
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              <p className="mt-1.5 text-xl font-semibold">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </motion.button>
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

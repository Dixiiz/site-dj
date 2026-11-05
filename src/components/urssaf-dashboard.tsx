"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatEuros } from "@/lib/money";
import { Loader2, RotateCcw } from "lucide-react";
import type { UrssafReceipt } from "@/app/api/admin/urssaf/route";

// ============================================================
// Dashboard « CA URSSAF » — administration
// ============================================================
// Chiffre d'affaires comptabilisé à la date réelle d'encaissement
// (et non à la date de prestation), avec :
//  - cartes statistiques animées (CA total / DJ / Menuiserie),
//  - filtres d'activité (tous, DJ, menuiserie),
//  - tableau détaillé groupé par mois de déclaration URSSAF,
//  - totaux mensuels et annuels, détail de chaque encaissement,
//  - modification manuelle du mois de rattachement URSSAF.
// ============================================================

// ---------- Libellés & helpers ----------
const ACTIVITE_LABEL: Record<UrssafReceipt["activite"], string> = {
  dj: "DJ",
  menuiserie: "Menuiserie",
};

const TYPE_LABEL: Record<UrssafReceipt["typePaiement"], string> = {
  acompte: "Acompte",
  solde: "Solde",
  echeance: "Échéance",
  facture: "Facture",
};

const MOIS_NOMS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** « 2026-11 » → « novembre 2026 ». */
function libelleMois(mois: string) {
  const [a, m] = mois.split("-");
  return `${MOIS_NOMS[Number(m) - 1] ?? mois} ${a ?? ""}`.trim();
}

/** « 2026-11-04 » → « 04/11/2026 ». */
function libelleDate(iso: string) {
  const [a, m, j] = iso.split("-");
  return j && m && a ? `${j}/${m}/${a}` : iso;
}

const FILTRES = [
  { value: "tous", label: "Tous" },
  { value: "dj", label: "DJ" },
  { value: "menuiserie", label: "Menuiserie" },
] as const;
type Filtre = (typeof FILTRES)[number]["value"];

// ---------- Dashboard CA URSSAF ----------
export function UrssafDashboard() {
  const [receipts, setReceipts] = useState<UrssafReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [annee, setAnnee] = useState<number>(new Date().getFullYear());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editionId, setEditionId] = useState<string | null>(null);

  // Chargement de tous les encaissements (DJ + Menuiserie).
  // L'indicateur de chargement est actif dès le montage (state initial `true`).
  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/urssaf", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Chargement impossible");
        const list = (data.receipts ?? []) as UrssafReceipt[];
        if (annule) return;
        setReceipts(list);
        if (list.length > 0) {
          const maxi = Math.max(...list.map((r) => Number(r.moisUrssaf.slice(0, 4))));
          if (Number.isFinite(maxi)) setAnnee(maxi);
        }
      } catch (e) {
        if (!annule) toast.error(e instanceof Error ? e.message : "Chargement impossible");
      } finally {
        if (!annule) setLoading(false);
      }
    })();
    return () => {
      annule = true;
    };
  }, []);

  // Années historiques présentes dans les données (anciennes données conservées).
  const annees = useMemo(() => {
    const set = new Set<number>();
    for (const r of receipts) set.add(Number(r.moisUrssaf.slice(0, 4)));
    return [...set].sort((a, b) => b - a);
  }, [receipts]);

  // Filtre activité + année de déclaration.
  const filtrees = useMemo(
    () =>
      receipts.filter(
        (r) =>
          r.moisUrssaf.startsWith(String(annee)) &&
          (filtre === "tous" || r.activite === filtre),
      ),
    [receipts, annee, filtre],
  );

  // Totaux distincts DJ / Menuiserie / total — actualisés selon les filtres.
  const totaux = useMemo(() => {
    const dj = filtrees.reduce((s, r) => (r.activite === "dj" ? s + r.montantCents : s), 0);
    const menuiserie = filtrees.reduce((s, r) => (r.activite === "menuiserie" ? s + r.montantCents : s), 0);
    return { dj, menuiserie, total: dj + menuiserie };
  }, [filtrees]);

  // Groupage par mois de déclaration URSSAF (traçabilité de chaque montant).
  const parMois = useMemo(() => {
    const map = new Map<string, UrssafReceipt[]>();
    for (const r of filtrees) {
      const arr = map.get(r.moisUrssaf);
      if (arr) arr.push(r);
      else map.set(r.moisUrssaf, [r]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtrees]);

  // Modification manuelle du mois de rattachement URSSAF d'un encaissement.
  async function changerMois(id: string, mois: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/urssaf", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, mois }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Modification impossible");
      setReceipts((cur) =>
        cur.map((r) =>
          r.id === id
            ? {
                ...r,
                moisUrssaf: mois || r.moisUrssafAuto,
                rattachementManuel: Boolean(mois) && mois !== r.moisUrssafAuto,
              }
            : r,
        ),
      );
      toast.success(mois ? `Rattaché à ${libelleMois(mois)}` : "Rattachement automatique rétabli");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Modification impossible");
    } finally {
      setBusyId(null);
      setEditionId(null);
    }
  }

  return (
    <section className="space-y-6">
      {/* En-tête */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">CA URSSAF</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Chiffre d&apos;affaires comptabilisé à la date réelle d&apos;encaissement — l&apos;acompte et le solde peuvent
          être rattachés à des mois différents. Cliquez sur le mois d&apos;un encaissement pour le rattacher manuellement.
        </p>
      </header>

      {/* Cartes statistiques (animées, actualisées selon les filtres) */}
      <motion.div
        key={`${filtre}-${annee}`}
        className="grid gap-4 sm:grid-cols-3"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {[
          {
            label: filtre === "dj" ? "CA DJ" : filtre === "menuiserie" ? "CA Menuiserie" : "CA total",
            value: totaux.total,
            hint: `${filtrees.length} encaissement${filtrees.length > 1 ? "s" : ""} · ${annee}`,
            accent: filtre !== "tous",
          },
          { label: "CA DJ", value: totaux.dj, hint: "Prestations de services", accent: false },
          { label: "CA Menuiserie", value: totaux.menuiserie, hint: "Vente de biens", accent: false },
        ].map((c) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`rounded-2xl border bg-card p-5 shadow-sm transition-colors ${
              c.accent ? "border-accent/60" : "border-border"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums">{formatEuros(c.value)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Filtres d'activité + sélecteur d'année */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtre d'activité">
        {FILTRES.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFiltre(f.value)}
            aria-pressed={filtre === f.value}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
              filtre === f.value
                ? "border-accent bg-accent text-accent-foreground shadow-sm"
                : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="annee-urssaf" className="text-xs text-muted-foreground">
            Année
          </label>
          <select
            id="annee-urssaf"
            value={annee}
            onChange={(e) => setAnnee(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent"
          >
            {annees.length === 0 ? <option value={annee}>{annee}</option> : null}
            {annees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Chargement du CA URSSAF…
        </div>
      ) : null}

      {/* Tableau détaillé groupé par mois de déclaration URSSAF */}
      {!loading && parMois.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucun encaissement rattaché à l&apos;année {annee} avec ce filtre.
        </div>
      ) : null}

      {!loading
        ? parMois.map(([mois, lignes]) => {
            const totalMois = lignes.reduce((s, r) => s + r.montantCents, 0);
            const djMois = lignes.reduce((s, r) => (r.activite === "dj" ? s + r.montantCents : s), 0);
            const menuMois = totalMois - djMois;
            return (
              <motion.div
                key={`${mois}-${filtre}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                {/* En-tête du mois : total mensuel détaillé */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                  <p className="text-sm font-semibold capitalize">{libelleMois(mois)}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    <span className="font-semibold text-foreground">{formatEuros(totalMois)}</span>
                    {" — DJ "}
                    {formatEuros(djMois)}
                    {" · Menuiserie "}
                    {formatEuros(menuMois)}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2 font-medium">Date prestation</th>
                        <th className="px-4 py-2 font-medium">Client / Événement</th>
                        <th className="px-4 py-2 font-medium">Activité</th>
                        <th className="px-4 py-2 font-medium">Type</th>
                        <th className="px-4 py-2 font-medium">Encaissement</th>
                        <th className="px-4 py-2 text-right font-medium">Montant</th>
                        <th className="px-4 py-2 font-medium">Mois URSSAF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent/[0.04]"
                        >
                          <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                            {r.datePrestation ? libelleDate(r.datePrestation) : "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium">{r.client}</p>
                            <p className="text-xs text-muted-foreground">{r.libelle}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs ${
                                r.activite === "dj"
                                  ? "border-cyan-500/40 text-cyan-600 dark:text-cyan-400"
                                  : "border-orange-500/40 text-orange-600 dark:text-orange-400"
                              }`}
                            >
                              {ACTIVITE_LABEL[r.activite]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{TYPE_LABEL[r.typePaiement]}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                            {libelleDate(r.dateEncaissement)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums">
                            {formatEuros(r.montantCents)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            {busyId === r.id ? (
                              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                            ) : editionId === r.id ? (
                              <input
                                type="month"
                                autoFocus
                                value={r.moisUrssaf}
                                onChange={(e) => changerMois(r.id, e.target.value)}
                                onBlur={() => setEditionId(null)}
                                className="rounded-md border border-accent bg-background px-1.5 py-0.5 text-xs outline-none"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditionId(r.id)}
                                title="Modifier le mois de rattachement URSSAF"
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                                  r.rattachementManuel
                                    ? "border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                    : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"
                                }`}
                              >
                                {libelleMois(r.moisUrssaf)}
                                {r.rattachementManuel ? (
                                  <RotateCcw
                                    className="size-3"
                                    aria-label="Rétablir le rattachement automatique"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void changerMois(r.id, "");
                                    }}
                                  />
                                ) : null}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            );
          })
        : null}
    </section>
  );
}
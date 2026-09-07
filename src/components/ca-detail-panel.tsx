"use client";

import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { deleteQuote } from "@/app/actions";
import { ManagedQuoteRow } from "./managed-quote-row";
import { ValidateSoldeButton } from "./validate-solde-button";
import { formatEuros } from "@/lib/money";

export type DetailRow = {
  id: string;
  customerName: string;
  formulaName: string;
  eventLocation: string;
  eventDate: string;
  totalCents: number;
  notes: string;
  status: string;
  solde?: boolean;
};

const isManaged = (notes: string) =>
  notes.includes("[[import-avant-site]]") || notes.includes("[[facture-libre]]");
const acompteDe = (notes: string) => {
  const m = /\[\[acompte:(\d+)\]\]/.exec(notes);
  return m ? Number(m[1]) : 0;
};
const soldeDe = (row: DetailRow) => {
  const total = Number.isFinite(row.totalCents) ? row.totalCents : 0;
  const acompte = acompteDe(row.notes);
  if (row.notes.includes("[[facture-libre]]")) return total;
  if (row.notes.includes("[[import-avant-site]]")) {
    return acompte > 0 ? Math.max(0, total - acompte) : total;
  }
  return Math.max(0, total - Math.floor((total * 0.8) / 10) * 10);
};
const soldeValide = (notes: string) => notes.includes("[[solde-valide:");

// Panneau de détail animé : se ferme au clic ailleurs ou avec Échap.
export function CaDetailPanel({
  titre,
  rows,
  solde = false,
}: {
  titre: string;
  rows: DetailRow[];
  solde?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ferme la section : revient au tableau de bord sans ?vue=…
  function onClose() {
    window.history.replaceState(null, "", "/admin");
    window.location.reload();
  }

  function onDeleteSiteQuote(row: DetailRow) {
    if (
      !window.confirm(
        `Supprimer définitivement le devis de ${row.customerName} ? (documents et messages inclus)`
      )
    )
      return;
    const formData = new FormData();
    formData.set("id", row.id);
    startTransition(async () => {
      await deleteQuote(formData);
      toast.success(`Devis de ${row.customerName} supprimé ✓`);
      onClose();
    });
  }
  /* SUITE-RENDU */

  const total = rows.reduce((sum, row) => sum + (solde ? soldeDe(row) : row.totalCents), 0);

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-accent/40 bg-accent/5 p-5 shadow-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{titre}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground transition-colors hover:text-accent"
        >
          ✕ Fermer
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Aucune soirée dans cette catégorie.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((row) => {
            const managed = isManaged(row.notes);
            const affiche = solde ? soldeDe(row) : row.totalCents;
            return (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {row.customerName}{" "}
                    {solde && soldeValide(row.notes) ? (
                      <span className="text-xs font-normal text-green-400">✓ solde validé</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.formulaName}
                    {row.eventLocation ? ` · ${row.eventLocation}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {row.eventDate
                        ? new Date(`${row.eventDate}T12:00:00`).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatEuros(affiche)}</p>
                  </div>
                  {solde ? (
                    <ValidateSoldeButton
                      id={row.id}
                      customerName={row.customerName}
                      validated={soldeValide(row.notes)}
                    />
                  ) : null}
                  {managed ? (
                    <ManagedQuoteRow
                      id={row.id}
                      customerName={row.customerName}
                      formulaName={row.formulaName}
                      eventDate={row.eventDate}
                      eventLocation={row.eventLocation}
                      totalCents={row.totalCents}
                      acompteCents={acompteDe(row.notes)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onDeleteSiteQuote(row)}
                      disabled={pending}
                      className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      {pending ? "…" : "Supprimer"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-right text-sm font-medium">
        Total : <span className="text-accent">{formatEuros(total)}</span>
      </p>
    </motion.section>
  );
}
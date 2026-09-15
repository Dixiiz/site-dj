"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { deleteQuote } from "@/app/actions";
import Link from "next/link";
import { ManagedQuoteRow } from "./managed-quote-row";
import { ManagedQuoteEditForm } from "./managed-quote-edit-form";
import { ValidateSoldeButton } from "./validate-solde-button";
import { ReviewReceivedButton } from "./review-received-button";
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
  onClose: onCloseProp,
}: {
  titre: string;
  rows: DetailRow[];
  solde?: boolean;
  onClose?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    // Positionne la vue sur le panneau (il est rendu sous les cartes).
    ref.current?.scrollIntoView({ block: "start" });

    // Fermeture au clic en dehors du panneau — PAS au pointerdown : sur
    // mobile, un simple scroll commence par un pointerdown et fermait le
    // panneau avant même d'avoir pu le lire. Un clic réel ne se déclenche
    // que si le doigt n'a pas bougé. Petit délai de grâce pour ignorer
    // le tap qui a ouvert le panneau.
    const openedAt = Date.now();
    function onClick(e: MouseEvent) {
      if (Date.now() - openedAt < 500) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ferme la section : via callback (ouverture instantanée côté client) ou,
  // à défaut, retour au tableau de bord sans ?vue=…
  function onClose() {
    if (onCloseProp) {
      onCloseProp();
      return;
    }
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
      className="scroll-mt-20 rounded-xl border border-accent/40 bg-accent/5 p-4 shadow-lg sm:p-5"
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
                  <Link
                    href={`/admin/devis?focus=${row.id}`}
                    className="block truncate text-sm font-medium transition-colors hover:text-accent hover:underline"
                    title="Ouvrir ce devis dans la liste"
                  >
                    {row.customerName}
                  </Link>
                  {solde && soldeValide(row.notes) ? (
                    <span className="text-xs font-normal text-green-400">✓ solde validé</span>
                  ) : null}
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
                  {solde && !soldeValide(row.notes) ? (
                    <ValidateSoldeButton
                      id={row.id}
                      customerName={row.customerName}
                      validated={false}
                    />
                  ) : null}
                  {solde ? (
                    <ReviewReceivedButton
                      id={row.id}
                      customerName={row.customerName}
                      validated={row.notes.includes("[[avis-ok]]")}
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
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingId((cur) => (cur === row.id ? null : row.id))
                        }
                        className="shrink-0 rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/10"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSiteQuote(row)}
                        disabled={pending}
                        className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        {pending ? "…" : "Supprimer"}
                      </button>
                    </>
                  )}
                </div>
                {editingId === row.id ? (
                  <div className="w-full rounded-lg border border-border bg-background/60 p-3">
                    <ManagedQuoteEditForm
                      id={row.id}
                      eventDate={row.eventDate}
                      formulaName={row.formulaName}
                      eventLocation={row.eventLocation}
                      totalCents={row.totalCents}
                      acompteCents={acompteDe(row.notes)}
                      onDone={() => setEditingId(null)}
                    />
                  </div>
                ) : null}
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
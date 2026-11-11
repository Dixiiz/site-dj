"use client";

import { toast } from "sonner";
import { declareFacturePayee } from "@/app/client-actions";
import { validerFactureUrssaf } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatEuros } from "@/lib/money";

// État de paiement d'une facture DJ (lu depuis les marqueurs des notes) :
// [[facture:numéro:montant]] à la génération, [[facture-declaree:numéro:date]]
// quand le client déclare avoir payé, [[facture-paye:numéro:date]] quand
// l'admin valide (→ comptage CA URSSAF).
export type FacturePaiementInfo = {
  payeLe: string | null;
  declareeLe: string | null;
  montantCents: number | null;
};

const frDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Côté ADMIN : badge « Payée le … » ou bouton de validation du paiement
// (compte la facture dans le CA URSSAF à la date du jour). Pour les anciennes
// factures sans montant enregistré, un champ montant apparaît.
export function ValidateFactureButton({
  quoteId,
  numero,
  info,
}: {
  quoteId: string;
  numero: string;
  info: FacturePaiementInfo;
}) {
  if (info.payeLe) {
    return (
      <span className="whitespace-nowrap rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
        ✓ Payée le {frDate(info.payeLe)}
      </span>
    );
  }
  const montantTxt = info.montantCents ? formatEuros(info.montantCents) : null;
  return (
    <div className="flex flex-col items-end gap-1">
      {info.declareeLe ? (
        <span className="whitespace-nowrap rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-medium text-orange-400">
          Déclarée payée le {frDate(info.declareeLe)}
        </span>
      ) : null}
      <form
        action={async (fd: FormData) => {
          const r = await validerFactureUrssaf(fd);
          if (r?.ok) toast.success(r.message ?? "Paiement validé ✓");
          else toast.error(r?.error ?? "Validation impossible.");
        }}
        className="flex flex-wrap items-center justify-end gap-1.5"
      >
        <input type="hidden" name="quote_id" value={quoteId} />
        <input type="hidden" name="numero" value={numero} />
        {info.montantCents ? null : (
          <input
            name="montant"
            inputMode="decimal"
            placeholder="Montant €"
            aria-label={`Montant facturé pour ${numero}`}
            className="w-24 rounded-md border border-border bg-white/5 px-2 py-1 text-xs outline-none focus:border-cyan-400/50"
          />
        )}
        <SubmitButton
          pendingLabel="Validation…"
          confirm={
            montantTxt
              ? `Confirmer le paiement de « Facture ${numero} » (${montantTxt}) et le compter dans le CA URSSAF à la date du jour ?`
              : `Confirmer le paiement de « Facture ${numero} » et le compter dans le CA URSSAF à la date du jour ?`
          }
          className="rounded-lg border border-green-500/50 bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400 transition-colors hover:border-green-400 hover:bg-green-400/25 hover:text-green-200"
        >
          ✓ Facture payée
        </SubmitButton>
      </form>
    </div>
  );
}

// Côté CLIENT : déclaration de paiement (comme « J'ai envoyé l'acompte ») —
// prévient l'admin qui valide ensuite depuis son interface.
export function DeclareFacturePaidButton({
  quoteId,
  numero,
}: {
  quoteId: string;
  numero: string;
}) {
  return (
    <form
      action={async (fd: FormData) => {
        const r = await declareFacturePayee(fd);
        if (r?.ok) toast.success(r.message ?? "Déclaration envoyée ✓");
        else toast.error(r?.error ?? "Déclaration impossible.");
      }}
    >
      <input type="hidden" name="quote_id" value={quoteId} />
      <input type="hidden" name="numero" value={numero} />
      <SubmitButton
        pendingLabel="Envoi…"
        confirm={`Déclarer la facture ${numero} comme payée ? Le prestataire sera prévenu pour vérifier la réception.`}
        className="rounded-lg border border-green-500/50 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:border-green-400 hover:bg-green-400/25 hover:text-green-200"
      >
        {"✓ J'ai payé cette facture"}
      </SubmitButton>
    </form>
  );
}

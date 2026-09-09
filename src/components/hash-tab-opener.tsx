"use client";

// Carte de renvoi de l'onglet Ma soirée vers le panneau Paiement.
// Utilise un événement personnalisé (pas de hash) : 100 % fiable en
// navigation client — l'onglet s'active immédiatement au clic.
export default function OpenPaiementCard({ quoteId }: { quoteId: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent("propul:open-paiement"));
        window.history.replaceState(
          null,
          "",
          `/mon-espace/devis/${quoteId}#paiement`
        );
      }}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-accent/30 bg-accent/5 p-4 text-left text-sm transition-colors hover:border-accent"
    >
      <span>
        <strong>💳 Paiements</strong> — acompte, carte ou virement,
        échéancier : tout est centralisé dans l&apos;onglet Paiement.
      </span>
      <span className="shrink-0 text-accent">Ouvrir →</span>
    </button>
  );
}


"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { rattraperFraisStripe } from "@/app/actions";

// Recalcule le net (frais Stripe déduits) de tous les paiements Stripe
// reçus avant l'activation du suivi net — à lancer une fois après déploiement.
export function BackfillStripeButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Recalculer le net (frais Stripe déduits) de tous les paiements Stripe reçus ?")) return;
        startTransition(async () => {
          const res = await rattraperFraisStripe();
          if (res.ok) toast.success(res.message ?? "Fait ✓");
          else toast.error(res.error ?? "Erreur");
        });
      }}
      className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      title="Déduit les frais Stripe des paiements déjà reçus, pour une base URSSAF exacte"
    >
      {pending ? "Recalcul…" : "↻ Recalculer les frais Stripe des paiements reçus"}
    </button>
  );
}

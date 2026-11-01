"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { sendQuoteAccess } from "@/app/client-actions";

// Bouton « Envoyer un accès » : envoie au client l'e-mail « première
// connexion » (lien valable 7 jours, compte créé automatiquement) — le client
// définit son mot de passe et retrouve son devis dans son espace. Masqué si
// le devis n'a pas d'e-mail client.
export function SendAccessButton({
  quoteId,
  email,
}: {
  quoteId: string;
  email: string | null;
}) {
  const [pending, startTransition] = useTransition();
  if (!email) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Envoyer à ${email} un lien de connexion à son espace client ?`)) {
          return;
        }
        startTransition(async () => {
          const fd = new FormData();
          fd.set("quote_id", quoteId);
          const res = await sendQuoteAccess(fd);
          if (res.ok) {
            toast.success(res.message ?? "Accès envoyé ✓");
          } else {
            toast.error(res.error ?? "Échec de l'envoi.");
          }
        });
      }}
      className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
    >
      ✉ Envoyer un accès
    </button>
  );
}

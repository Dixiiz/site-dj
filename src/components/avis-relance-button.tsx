"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { sendAvisRelanceEmail } from "@/app/client-actions";

// Relance manuelle de la demande d'avis (dossier client) : pose/retourne
// l'erreur exacte en toast — contrairement à un <form> inline, qui avale
// silencieusement le résultat de la server action.
export function AvisRelanceButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await sendAvisRelanceEmail(
        (() => {
          const fd = new FormData();
          fd.set("quote_id", id);
          return fd;
        })()
      );
      if (result.ok) {
        toast.success(result.message ?? "Fait ✓");
      } else {
        toast.error(result.error ?? "Envoi impossible.", { duration: 8000 });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={`shrink-0 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 ${
        pending ? "animate-pulse cursor-wait opacity-90" : ""
      }`}
      title="Envoyer une relance de demande d'avis au client"
    >
      {pending ? "Envoi…" : "★ Relancer l'avis"}
    </button>
  );
}

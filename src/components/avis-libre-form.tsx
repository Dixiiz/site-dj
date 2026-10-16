"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { sendAvisLibreEmail } from "@/app/client-actions";

// Demande d'avis « libre » : client sans devis sur le site (soirée d'avant
// le site, prestation prise en direct…). Formulaire nom + e-mail + date
// optionnelle, replié par défaut pour garder la page épurée.
export function AvisLibreForm() {
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    if (!window.confirm(`Envoyer la demande d'avis à ${email} ?`)) return;
    startTransition(async () => {
      const result = await sendAvisLibreEmail(formData);
      if (result.ok) {
        toast.success(result.message ?? "Envoyé ✓");
      } else {
        toast.error(result.error ?? "Envoi impossible.");
      }
    });
  }

  const input =
    "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none";

  return (
    <details className="group rounded-xl border border-amber-500/40 bg-card">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-amber-300 transition-colors group-open:border-b group-open:border-border">
        ★ Demander un avis (client sans devis sur le site)
      </summary>
      <form action={onSubmit} className="space-y-3 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Pour les soirées qui n&apos;ont pas transité par le site : le même
          e-mail de demande d&apos;avis que pour les dossiers clients, envoyé
          directement à l&apos;adresse indiquée.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            name="name"
            required
            placeholder="Prénom / nom du client"
            className={input}
          />
          <input
            type="email"
            name="email"
            required
            placeholder="E-mail du client"
            className={input}
          />
          <input type="date" name="event_date" className={input} aria-label="Date de la soirée (optionnelle)" />
        </div>
        <button
          type="submit"
          disabled={pending}
          className={`rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 ${
            pending ? "animate-pulse cursor-wait opacity-90" : ""
          }`}
        >
          {pending ? "Envoi…" : "Envoyer la demande d'avis"}
        </button>
      </form>
    </details>
  );
}

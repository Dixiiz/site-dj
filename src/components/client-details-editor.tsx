"use client";

import { useTransition, useState } from "react";
import { updateQuoteDetails, type PendingQuoteDetails } from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { ADMIN_PACK_LIST } from "@/components/pricing-section";

// Formulaire de demande de modification du devis par le client : lieu, date,
// horaires, pack. La demande part en attente de validation de l'admin
// (même principe que les options) — rien n'est appliqué avant validation.
export function ClientDetailsEditor({
  quoteId,
  disabled,
  pending,
  current,
}: {
  quoteId: string;
  disabled: boolean;
  pending: PendingQuoteDetails | null;
  current: {
    event_location: string | null;
    event_date: string | null;
    start_time: string | null;
    end_time: string | null;
    formula_name: string;
  };
}) {
  const [pendingSubmit, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function onSubmit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateQuoteDetails(formData);
      setFeedback(result.ok ? (result.message ?? "Demande envoyée ✓") : (result.error ?? null));
      setIsError(!result.ok);
    });
  }

  const label = "block text-xs text-muted-foreground mb-1";
  const input =
    "w-full rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent";

  if (pending) {
    return (
      <div className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
        <p className="font-medium text-yellow-300">Modification en attente de validation</p>
        <ul className="mt-2 space-y-0.5 text-muted-foreground">
          {pending.event_location ? <li>Lieu : {pending.event_location}</li> : null}
          {pending.event_date ? <li>Date : {pending.event_date}</li> : null}
          {pending.start_time || pending.end_time ? (
            <li>Horaires : {pending.start_time ?? "?"} - {pending.end_time ?? "?"}</li>
          ) : null}
          {pending.formula_name ? <li>Pack : {pending.formula_name}</li> : null}
          {pending.message ? <li>Message : {pending.message}</li> : null}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Nous vous répondons dès que possible — un nouveau devis sera généré si validé.
        </p>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="mt-4 space-y-3">
      <input type="hidden" name="quote_id" value={quoteId} />
      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer list-none px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          Demander une modification (lieu, date, horaires, pack)
        </summary>
        <div className="space-y-3 px-3 pb-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Lieu de réception</label>
              <input name="event_location" defaultValue={current.event_location ?? ""} className={input} placeholder="Lieu souhaité" />
            </div>
            <div>
              <label className={label}>Date</label>
              <input name="event_date" type="date" defaultValue={current.event_date ?? ""} className={input} />
            </div>
            <div>
              <label className={label}>Heure de début</label>
              <input name="start_time" type="time" defaultValue={current.start_time ?? ""} className={input} />
            </div>
            <div>
              <label className={label}>Heure de fin</label>
              <input name="end_time" type="time" defaultValue={current.end_time ?? ""} className={input} />
            </div>
          </div>
          <div>
            <label className={label}>Pack souhaité</label>
            <select name="formula_name" defaultValue="" className={input}>
              <option value="">— Inchangé —</option>
              {ADMIN_PACK_LIST.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} — {(p.price / 100).toFixed(2).replace(".", ",")} €
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Message (optionnel)</label>
            <input name="message" className={input} placeholder="Ex : on décale la fin à 2h, c'est possible ?" />
          </div>
          {!disabled ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="sm" disabled={pendingSubmit}>
                {pendingSubmit ? "Envoi…" : "Envoyer la demande"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Soumis à validation — un nouveau devis sera généré si accepté.
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ce devis est confirmé : contactez-nous via la messagerie pour toute modification.
            </p>
          )}
          {feedback ? (
            <p className={`text-sm ${isError ? "text-destructive" : "text-accent"}`}>{feedback}</p>
          ) : null}
        </div>
      </details>
    </form>
  );
}

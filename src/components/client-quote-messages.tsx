"use client";

import { useRef, useTransition } from "react";
import { sendQuoteMessage } from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = { id: string; sender: string; body: string; created_at: string };

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ClientQuoteMessages({
  quoteId,
  messages,
}: {
  quoteId: string;
  messages: Message[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    formRef.current?.reset();
    startTransition(async () => {
      await sendQuoteMessage(formData);
    });
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-medium">Messagerie</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Une question, un changement ? Écrivez-nous ici.
      </p>

      <ul className="mt-4 space-y-3">
        {messages.length === 0 ? (
          <li className="text-sm text-muted-foreground">Aucun message pour le moment.</li>
        ) : null}
        {messages.map((message) => {
          const mine = message.sender === "client";
          return (
            <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                  mine
                    ? "bg-accent/15 text-foreground"
                    : "border border-white/10 bg-background text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p
                  className="mt-1 text-[11px] text-muted-foreground"
                  suppressHydrationWarning
                >
                  {mine ? "Vous" : "Propul'Sound DJ"} · {timeLabel(message.created_at)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <form ref={formRef} action={onSubmit} className="mt-4 space-y-3">
        <input type="hidden" name="quote_id" value={quoteId} />
        <Textarea name="body" required placeholder="Votre message…" rows={3} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer"}
        </Button>
      </form>
    </section>
  );
}

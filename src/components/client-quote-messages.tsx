"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getQuoteMessages, sendQuoteMessage } from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = { id: string; sender: string; body: string; created_at: string };

const POLL_MS = 4000;

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
  messages: initialMessages,
}: {
  quoteId: string;
  messages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const lastSent = useRef<string>("");

  // Synchronisation avec les props après revalidation serveur (pattern React).
  const initialJson = JSON.stringify(initialMessages);
  const [syncedJson, setSyncedJson] = useState(initialJson);
  if (syncedJson !== initialJson) {
    setSyncedJson(initialJson);
    setMessages(initialMessages);
  }

  // Messagerie "live" : rafraîchit les nouveaux messages toutes les 4 s.
  useEffect(() => {
    const id = setInterval(async () => {
      const fresh = await getQuoteMessages(quoteId);
      setMessages((current) =>
        JSON.stringify(current) === JSON.stringify(fresh) ? current : fresh
      );
    }, POLL_MS);
    return () => clearInterval(id);
  }, [quoteId]);

  function onSubmit(formData: FormData) {
    formRef.current?.reset();
    startTransition(async () => {
      await sendQuoteMessage(formData);
      // Affiche immédiatement son propre message (optimiste).
      const body = String(formData.get("body") ?? "").trim();
      if (body) {
        lastSent.current = body;
        const fresh = await getQuoteMessages(quoteId);
        setMessages((current) =>
          JSON.stringify(current) === JSON.stringify(fresh) ? current : fresh
        );
      }
    });
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-medium">
        Messagerie
        <span
          className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500 align-middle"
          title="Messagerie en direct"
        />
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Une question, un changement ? Écrivez-nous ici — la conversation se met à
        jour automatiquement.
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
        <Textarea
          name="body"
          required
          placeholder="Votre message… (Entrée pour envoyer)"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer"}
        </Button>
      </form>
    </section>
  );
}


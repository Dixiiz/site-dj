"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getQuoteMessagesAdmin, sendAdminMessage } from "@/app/client-actions";
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

// Conversation du devis, avec rafraîchissement automatique (client ↔ admin).
export function AdminQuoteConversation({
  quoteId,
  initialMessages,
}: {
  quoteId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Synchronisation avec les props après revalidation serveur (pattern React).
  const initialJson = JSON.stringify(initialMessages);
  const [syncedJson, setSyncedJson] = useState(initialJson);
  if (syncedJson !== initialJson) {
    setSyncedJson(initialJson);
    setMessages(initialMessages);
  }

  useEffect(() => {
    const id = setInterval(async () => {
      const fresh = await getQuoteMessagesAdmin(quoteId);
      setMessages((current) =>
        JSON.stringify(current) === JSON.stringify(fresh) ? current : fresh
      );
    }, POLL_MS);
    return () => clearInterval(id);
  }, [quoteId]);

  function onSubmit(formData: FormData) {
    formRef.current?.reset();
    startTransition(async () => {
      await sendAdminMessage(formData);
      const fresh = await getQuoteMessagesAdmin(quoteId);
      setMessages((current) =>
        JSON.stringify(current) === JSON.stringify(fresh) ? current : fresh
      );
    });
  }

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Messagerie
        <span
          className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500 align-middle"
          title="Messagerie en direct"
        />
      </h3>
      <ul className="space-y-2">
        {messages.length === 0 ? (
          <li className="text-sm text-muted-foreground">Aucun message.</li>
        ) : null}
        {messages.map((message) => {
          const fromClient = message.sender === "client";
          return (
            <li key={message.id} className={`flex ${fromClient ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  fromClient ? "border border-white/10 bg-background" : "bg-accent/15"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground" suppressHydrationWarning>
                  {fromClient ? "Client" : "Vous"} · {timeLabel(message.created_at)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <form ref={formRef} action={onSubmit} className="mt-2 flex items-end gap-2">
        <input type="hidden" name="quote_id" value={quoteId} />
        <Textarea name="body" required rows={2} placeholder="Répondre au client…" className="flex-1" />
        <Button type="submit" size="sm">
          Envoyer
        </Button>
      </form>
    </div>
  );
}


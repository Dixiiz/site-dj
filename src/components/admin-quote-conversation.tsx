import { sendAdminMessage } from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createAdminClient } from "@/lib/supabase/admin";

type Message = { id: string; sender: string; body: string; created_at: string };

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Conversation du devis, visible dans le détail admin.
export async function AdminQuoteConversation({ quoteId }: { quoteId: string }) {
  const supabase = createAdminClient();
  const { data: messages } = await supabase
    .from("quote_messages")
    .select("id, sender, body, created_at")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Messagerie
      </h3>
      <ul className="space-y-2">
        {!messages || messages.length === 0 ? (
          <li className="text-sm text-muted-foreground">Aucun message.</li>
        ) : null}
        {(messages ?? []).map((message) => {
          const fromClient = message.sender === "client";
          return (
            <li key={message.id} className={`flex ${fromClient ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  fromClient ? "border border-white/10 bg-background" : "bg-accent/15"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {fromClient ? "Client" : "Vous"} · {timeLabel(message.created_at)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <form action={sendAdminMessage} className="mt-2 flex items-end gap-2">
        <input type="hidden" name="quote_id" value={quoteId} />
        <Textarea name="body" required rows={2} placeholder="Répondre au client…" className="flex-1" />
        <Button type="submit" size="sm">
          Envoyer
        </Button>
      </form>
    </div>
  );
}

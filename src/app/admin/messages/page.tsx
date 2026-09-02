import { getAdminPlaylist, getAdminThreads, sendAdminMessage } from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Track = {
  id: string;
  quote_id: string;
  moment: string;
  title: string;
  artist: string | null;
  kind: string;
  preview_url: string | null;
  artwork_url: string | null;
};

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const [messages, playlist] = await Promise.all([getAdminThreads(), getAdminPlaylist()]);

  const tracksByQuote = new Map<string, Track[]>();
  for (const track of playlist) {
    const list = tracksByQuote.get(track.quote_id) ?? [];
    list.push(track);
    tracksByQuote.set(track.quote_id, list);
  }

  // Groupe les messages par devis, devis le plus récent en premier.
  const threads = new Map<string, typeof messages>();
  for (const message of messages) {
    const list = threads.get(message.quote_id) ?? [];
    list.push(message);
    threads.set(message.quote_id, list);
  }
  const orderedThreads = [...threads.entries()].sort(
    (a, b) =>
      new Date(b[1][b[1].length - 1].created_at).getTime() -
      new Date(a[1][a[1].length - 1].created_at).getTime()
  );

  return (
    <main>
      <h1 className="text-2xl font-medium">Messagerie clients</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Les messages envoyés depuis l&apos;espace client, et vos réponses.
      </p>

      {orderedThreads.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Aucun message pour le moment.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {orderedThreads.map(([quoteId, thread]) => {
            const quoteInfo = thread[0]?.quote;
            const lastDate = thread[thread.length - 1].created_at;
            return (
              <section
                key={quoteId}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
              >
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="font-medium">
                      {quoteInfo?.customer_name ?? "Client"} —{" "}
                      {quoteInfo?.formula_name ?? "Devis"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {quoteInfo?.event_date ?? "Date à définir"} ·{" "}
                      {quoteInfo?.customer_email ?? ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Dernier message : {timeLabel(lastDate)}
                  </span>
                </header>

                <ul className="mt-4 space-y-3">
                  {thread.map((message) => {
                    const fromClient = message.sender === "client";
                    return (
                      <li
                        key={message.id}
                        className={`flex ${fromClient ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                            fromClient
                              ? "border border-white/10 bg-background"
                              : "bg-accent/15"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.body}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {fromClient ? "Client" : "Vous"} ·{" "}
                            {timeLabel(message.created_at)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Musiques du dossier — partagées avec le client */}
                {(tracksByQuote.get(quoteId) ?? []).length > 0 ? (
                  <details className="mt-4 rounded-lg border border-white/10 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                      🎵 Musiques du dossier (
                      {(tracksByQuote.get(quoteId) ?? []).length})
                    </summary>
                    <ul className="mt-3 space-y-2">
                      {(tracksByQuote.get(quoteId) ?? []).map((track) => (
                        <li
                          key={track.id}
                          className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm"
                        >
                          {track.artwork_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={track.artwork_url}
                              alt=""
                              width={36}
                              height={36}
                              className="h-9 w-9 shrink-0 rounded-md object-cover"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="truncate">
                              <span className="font-medium">{track.title}</span>
                              {track.artist ? (
                                <span className="text-muted-foreground"> — {track.artist}</span>
                              ) : null}
                            </p>
                            <p
                              className={`text-xs ${
                                track.kind === "blacklist" ? "text-red-400" : "text-muted-foreground"
                              }`}
                            >
                              {track.kind === "blacklist" ? "⚠ À ne PAS passer — " : ""}
                              {track.moment}
                            </p>
                          </div>
                          {track.preview_url ? (
                            <audio
                              controls
                              preload="none"
                              src={track.preview_url}
                              className="h-8 w-44 shrink-0"
                            />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                <form action={sendAdminMessage} className="mt-4 flex items-end gap-3">
                  <input type="hidden" name="quote_id" value={quoteId} />
                  <Textarea
                    name="body"
                    required
                    rows={2}
                    placeholder="Votre réponse…"
                    className="flex-1"
                  />
                  <Button type="submit" size="sm">
                    Répondre
                  </Button>
                </form>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

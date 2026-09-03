"use client";

import { useRef, useState, useTransition } from "react";
import {
  deleteQuoteFile,
  downloadQuoteFile,
  uploadClientFile,
} from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ClientFile = {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

function sizeLabel(bytes: number | null) {
  if (!bytes) return "";
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.round(bytes / 1024)} Ko`;
}

export function ClientQuoteFiles({
  quoteId,
  files,
}: {
  quoteId: string;
  files: ClientFile[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [pendingRemove, startRemove] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function onSubmit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await uploadClientFile(formData);
      setFeedback(result.ok ? (result.message ?? null) : (result.error ?? null));
      setIsError(!result.ok);
      if (result.ok) formRef.current?.reset();
    });
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-medium">Fichiers</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Envoyez vos musiques en MP3, vos vidéos, ou tout document utile
        (texte de cérémonie, timing…) — 50 Mo max par fichier.
      </p>

      <form ref={formRef} action={onSubmit} className="mt-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="quote_id" value={quoteId} />
        <Input
          type="file"
          name="file"
          required
          accept="audio/*,video/*,.pdf,.doc,.docx,.txt,.xlsx,.csv"
          className="max-w-sm cursor-pointer file:cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-accent/15 file:px-3 file:py-1 file:text-xs file:text-accent"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer le fichier"}
        </Button>
        {feedback ? (
          <p className={`text-sm ${isError ? "text-destructive" : "text-accent"}`}>{feedback}</p>
        ) : null}
      </form>

      {files.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm sm:gap-3"
            >
              <span className="shrink-0">
                {file.mime_type?.startsWith("video")
                  ? "🎬"
                  : file.mime_type?.startsWith("audio")
                    ? "🎵"
                    : "📄"}
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{sizeLabel(file.size_bytes)}</p>
              </div>
              <form action={downloadQuoteFile}>
                <input type="hidden" name="quote_id" value={quoteId} />
                <input type="hidden" name="file_id" value={file.id} />
                <Button type="submit" variant="outline" size="sm">
                  Télécharger
                </Button>
              </form>
              <form
                action={(formData) =>
                  startRemove(async () => void (await deleteQuoteFile(formData)))
                }
              >
                <input type="hidden" name="quote_id" value={quoteId} />
                <input type="hidden" name="file_id" value={file.id} />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="text-red-400 hover:bg-red-500/10"
                >
                  Supprimer
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Aucun fichier pour le moment.</p>
      )}
    </section>
  );
}

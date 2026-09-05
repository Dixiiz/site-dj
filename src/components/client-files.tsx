"use client";

import { useRef, useState, useTransition } from "react";
import {
  deleteQuoteFile,
  uploadClientFile,
} from "@/app/client-actions";
import { Button } from "@/components/ui/button";

type ClientFile = {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  moment: string | null;
  from_admin?: boolean;
};

function sizeLabel(bytes: number | null) {
  if (!bytes) return "";
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.round(bytes / 1024)} Ko`;
}

function fileIcon(mime: string | null) {
  if (mime?.startsWith("video")) return "";
  if (mime?.startsWith("audio")) return "";
  return "";
}

// Upload + liste compacte, intégrés dans une catégorie (temps fort).
export function MomentFiles({
  quoteId,
  moment,
  files,
}: {
  quoteId: string;
  moment: string;
  files: ClientFile[];
}) {
  const [pending, startTransition] = useTransition();
  const [, startRemove] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function upload(file: File) {
    const formData = new FormData();
    formData.set("quote_id", quoteId);
    formData.set("moment", moment);
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadClientFile(formData);
      setFeedback(result.ok ? (result.message ?? null) : (result.error ?? null));
      setIsError(!result.ok);
    });
  }

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="audio/*,video/*,.pdf,.doc,.docx,.txt,.xlsx,.csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={pending}
          title={`Joindre un fichier (${moment})`}
          aria-label={`Joindre un fichier (${moment})`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/40 text-sm leading-none text-accent transition-colors hover:bg-accent/15 disabled:opacity-50"
        >
          +
        </button>
        <span className="text-[11px] text-muted-foreground">
          {pending ? "Envoi du fichier…" : "Ajouter un fichier (MP3, vidéo, doc — 50 Mo max)"}
        </span>
        {feedback ? (
          <span className={`text-xs ${isError ? "text-destructive" : "text-accent"}`}>
            {feedback}
          </span>
        ) : null}
      </div>

      {files.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs sm:gap-3"
            >
              <span className="shrink-0">{fileIcon(file.mime_type)}</span>
              <div className="min-w-0 flex-1 basis-32">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {sizeLabel(file.size_bytes)}
                </p>
              </div>
              <a
                href={`/api/files/${file.id}`}
                className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/15"
              >
                ↓ Télécharger
              </a>
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
                  ✕
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// Fichiers sans catégorie (anciens envois) — liste lecture seule.
export function DiversFiles({ files }: { quoteId: string; files: ClientFile[] }) {
  const misc = files.filter((f) => !f.moment && !f.from_admin);
  if (misc.length === 0) return null;
  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="font-medium text-muted-foreground">📎 Autres fichiers</h3>
      <ul className="mt-3 space-y-2">
        {misc.map((file) => (
          <li
            key={file.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span className="shrink-0">{fileIcon(file.mime_type)}</span>
            <div className="min-w-0 flex-1 basis-40">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{sizeLabel(file.size_bytes)}</p>
            </div>
            <a
              href={`/api/files/${file.id}`}
              className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/15"
            >
              Télécharger
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

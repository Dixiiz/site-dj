"use client";

import { useEffect, useRef, useState } from "react";
import { AdminQuotePlaylist, eventMoments } from "@/components/admin-quote-playlist";
import { AdminRdvRequests } from "@/components/rdv-call";
import { AdminQuoteDocuments } from "@/components/admin-quote-documents";
import { AdminQuoteConversation } from "@/components/admin-quote-conversation";

export type TrackRow = {
  id: string; moment: string; title: string; artist: string | null; kind: string; preview_url: string | null; artwork_url: string | null;
};
export type FileRowLite = {
  id: string; name: string; mime_type: string | null; size_bytes: number | null; moment: string | null; doc_kind: string; from_admin: boolean; signed_name: string | null;
};
export type RdvRowLite = { id: string; proposed_at: string | null; availability: string | null; status: string; origin: string | null };

// Dossier complet du devis : les données arrivent EN PROPS (requêtes groupées
// au rendu de la page, pour tous les devis d'un coup). Ouvrir un devis ne
// déclenche AUCUNE requête : le contenu est déjà dans la page.
export function AdminQuoteLazyFolder({
  quoteId,
  formulaName,
  adjustments,
  initialMessages,
  initialTracks,
  initialFiles,
  initialRdvs,
}: {
  quoteId: string;
  formulaName: string;
  adjustments: { label: string; amount_cents: number }[];
  initialMessages: { id: string; sender: string; body: string; created_at: string }[];
  initialTracks: TrackRow[];
  initialFiles: FileRowLite[];
  initialRdvs: RdvRowLite[];
}) {
  const [open, setOpen] = useState(false);
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);

  // L'état « ouvert » vient du <details> parent : on l'écoute directement.
  useEffect(() => {
    const details = rootEl?.closest("details");
    if (!details) return;
    const onToggle = () => setOpen(details.open);
    details.addEventListener("toggle", onToggle);
    setOpen(details.open);
    return () => details.removeEventListener("toggle", onToggle);
  }, [rootEl]);

  // Synchronisation avec les props après revalidation serveur (AutoRefresh,
  // actions…), même pattern que la conversation.
  const [tracks, setTracks] = useState(initialTracks);
  const [files, setFiles] = useState(initialFiles);
  const [rdvs, setRdvs] = useState(initialRdvs);
  const tracksJson = JSON.stringify(initialTracks);
  const filesJson = JSON.stringify(initialFiles);
  const rdvsJson = JSON.stringify(initialRdvs);
  const [synced, setSynced] = useState({ t: tracksJson, f: filesJson, r: rdvsJson });
  if (synced.t !== tracksJson) {
    setSynced((s) => ({ ...s, t: tracksJson }));
    setTracks(initialTracks);
  }
  if (synced.f !== filesJson) {
    setSynced((s) => ({ ...s, f: filesJson }));
    setFiles(initialFiles);
  }
  if (synced.r !== rdvsJson) {
    setSynced((s) => ({ ...s, r: rdvsJson }));
    setRdvs(initialRdvs);
  }

  return (
    <div ref={setRootEl} className="contents">
      {open ? (
        <div className="space-y-6 border-t border-border px-4 pb-5 pt-4">
          <AdminQuoteConversation quoteId={quoteId} initialMessages={initialMessages} />
          <AdminQuotePlaylist
            quoteId={quoteId}
            moments={eventMoments(formulaName)}
            initialTracks={tracks}
            initialFiles={files}
          />
          <AdminQuoteFilesLite files={files} />
          <AdminQuoteDocuments
            quoteId={quoteId}
            files={files}
            adjustments={adjustments}
          />
          <AdminRdvRequests quoteId={quoteId} requests={rdvs} />
        </div>
      ) : null}
    </div>
  );
}

// Fichiers envoyés par le client (alimenté par les props groupées).
function AdminQuoteFilesLite({
  files,
}: {
  files: FileRowLite[];
}) {
  const clientFiles = (files ?? []).filter((f) => f.from_admin === false);
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Fichiers du client
      </h3>
      {clientFiles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun fichier envoyé.</p>
      ) : (
        <ul className="space-y-2">
          {clientFiles.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm sm:gap-3"
            >
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.moment ? `${file.moment} · ` : "Divers · "}
                  {file.size_bytes
                    ? file.size_bytes > 1024 * 1024
                      ? `${(file.size_bytes / (1024 * 1024)).toFixed(1)} Mo`
                      : `${Math.round(file.size_bytes / 1024)} Ko`
                    : ""}
                </p>
              </div>
              <a
                href={`/api/files/${file.id}`}
                download
                className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/15"
              >
                ↓ Télécharger
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import { getQuoteAdminBundle } from "@/app/client-actions";
import { AdminQuotePlaylist, eventMoments } from "@/components/admin-quote-playlist";
import { AdminRdvRequests } from "@/components/rdv-call";
import { AdminQuoteDocuments } from "@/components/admin-quote-documents";
import { AdminQuoteConversation } from "@/components/admin-quote-conversation";

// Chargement paresseux du dossier complet d'un devis (playlist, fichiers,
// documents, RDV) : les requêtes ne partent QU'À L'OUVERTURE du <details>,
// au lieu de s'exécuter pour chaque devis au rendu de la page.
export function AdminQuoteLazyFolder({
  quoteId,
  formulaName,
  adjustments,
  initialMessages,
}: {
  quoteId: string;
  formulaName: string;
  adjustments: { label: string; amount_cents: number }[];
  initialMessages: { id: string; sender: string; body: string; created_at: string }[];
}) {
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [bundle, setBundle] = useState<{
    tracks: {
      id: string; moment: string; title: string; artist: string | null; kind: string; preview_url: string | null; artwork_url: string | null;
    }[];
    files: {
      id: string; name: string; mime_type: string | null; size_bytes: number | null; moment: string | null; doc_kind: string; from_admin: boolean; signed_name: string | null;
    }[];
    rdvs: { id: string; proposed_at: string | null; availability: string | null; status: string }[];
  } | null>(null);
  const [error, setError] = useState(false);
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

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    setLoaded(true);
    getQuoteAdminBundle(quoteId)
      .then((res) => {
        if (cancelled) return;
        if (res.ok)
          setBundle({
            tracks: res.tracks ?? [],
            files: res.files ?? [],
            rdvs: res.rdvs ?? [],
          });
        else setError(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loaded, quoteId]);

  // Rechargement léger du bundle toutes les 15 s tant que le devis est ouvert
  // (nouveau message, nouveau fichier, document généré…).
  useEffect(() => {
    if (!open || !loaded) return;
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const res = await getQuoteAdminBundle(quoteId);
      if (res.ok) setBundle(res);
    }, 15000);
    return () => clearInterval(id);
  }, [open, loaded, quoteId]);

  return (
    <div ref={setRootEl} className="contents">
      {open ? (
        error ? (
          <p className="px-4 pb-4 pt-3 text-sm text-red-400">
            Impossible de charger le dossier — réessaie en rouvrant le devis.
          </p>
        ) : !bundle ? (
          <div className="space-y-2 px-4 pb-5 pt-4 text-sm text-muted-foreground">
            <div className="h-4 w-40 animate-pulse rounded bg-border" />
            <div className="h-4 w-full animate-pulse rounded bg-border" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-border" />
          </div>
        ) : (
          <div className="space-y-6 border-t border-border px-4 pb-5 pt-4">
            <AdminQuoteConversation quoteId={quoteId} initialMessages={initialMessages} />
            <AdminQuotePlaylist
              quoteId={quoteId}
              moments={eventMoments(formulaName)}
              initialTracks={bundle.tracks}
              initialFiles={bundle.files}
            />
            <AdminQuoteFilesLite files={bundle.files} />
            <AdminQuoteDocuments
              quoteId={quoteId}
              files={bundle.files}
              adjustments={adjustments}
            />
            <AdminRdvRequests quoteId={quoteId} requests={bundle.rdvs} />
          </div>
        )
      ) : null}
    </div>
  );
}

// Fichiers envoyés par le client (version client alimentée par le bundle,
// remplace l'ancien composant serveur AdminQuoteFiles : plus de requête par
// devis au rendu de la liste).
function AdminQuoteFilesLite({
  files,
}: {
  files: {
    id: string;
    name: string;
    mime_type: string | null;
    size_bytes: number | null;
    moment: string | null;
    doc_kind: string;
    from_admin: boolean;
  }[];
}) {
  const clientFiles = files.filter((f) => f.from_admin === false);
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

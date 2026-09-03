"use client";

import { useRef, useState } from "react";
import type { MediaItem } from "@/lib/site-media";
import { SubmitButton } from "@/components/submit-button";

type Action = (formData: FormData) => void | Promise<void>;

// Gestionnaire de médias : upload, suppression, import des fichiers locaux
// et réordonnancement par glisser-déposer (ordre envoyé au serveur).
export function MediaManager({
  folder,
  items,
  accept,
  kind,
  uploadAction,
  deleteStorageAction,
  deleteLocalAction,
  importLocalAction,
  orderAction,
}: {
  folder: string;
  items: MediaItem[];
  accept: string;
  kind: "image" | "video";
  uploadAction: Action;
  deleteStorageAction: Action;
  deleteLocalAction: Action;
  importLocalAction: Action;
  orderAction: (folder: string, names: string[]) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [list, setList] = useState<MediaItem[]>(items);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const persistOrder = async (ordered: MediaItem[]) => {
    setBusy(true);
    setMsg(null);
    const res = await orderAction(folder, ordered.map((m) => m.name));
    setMsg(res.ok ? "Ordre enregistré ✓" : (res.error ?? "Échec de l'enregistrement."));
    setBusy(false);
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= list.length) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setList(next);
    void persistOrder(next);
  };

  return (
    <div>
      {/* Upload */}
      <form action={uploadAction} className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="files"
          multiple
          accept={accept}
          className="text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-foreground"
        />
        <SubmitButton
          pendingLabel="Envoi…"
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          ⬆ Envoyer
        </SubmitButton>
        {busy ? <span className="text-xs text-muted-foreground">…</span> : null}
      </form>

      <p className="mt-2 text-[11px] text-muted-foreground/70">
        Glisse-dépose les vignettes pour changer l&apos;ordre d&apos;affichage sur le site.
        <span className="ml-1 rounded bg-yellow-500/10 px-1.5 py-0.5 text-yellow-300 border border-yellow-500/30">local</span>
        {" "}= fichier du dossier du projet — importe-le (⬆) dans le stockage pour qu&apos;il reste en ligne.
      </p>

      {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}

      {/* Grille avec glisser-déposer */}
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((item, i) => (
          <li
            key={`${item.origin}-${item.name}`}
            draggable
            onDragStart={() => (dragIndex.current = i)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(i);
            }}
            onDragLeave={() => setDragOver((cur) => (cur === i ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              if (dragIndex.current !== null) move(dragIndex.current, i);
              dragIndex.current = null;
            }}
            onDragEnd={() => {
              dragIndex.current = null;
              setDragOver(null);
            }}
            className={`group relative cursor-grab overflow-hidden rounded-lg border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
              dragOver === i ? "border-accent scale-[1.02]" : "border-border"
            }`}
          >
            {/* Flèches de réordre : indispensables sur mobile (pas de glisser au doigt) */}
            <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center gap-1 opacity-70 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
              <button
                type="button"
                aria-label="Déplacer à gauche"
                disabled={i === 0 || busy}
                onClick={() => move(i, i - 1)}
                className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white disabled:opacity-30"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Déplacer à droite"
                disabled={i === list.length - 1 || busy}
                onClick={() => move(i, i + 1)}
                className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white disabled:opacity-30"
              >
                →
              </button>
            </div>
            {kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={item.name} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <video src={item.url} className="aspect-[4/3] w-full object-cover" muted preload="metadata" />
            )}
            <span
              className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-medium ${
                item.origin === "local"
                  ? "bg-yellow-500/20 text-yellow-200"
                  : "bg-cyan-500/20 text-cyan-200"
              }`}
            >
              {item.origin === "local" ? "local" : "en ligne"}
            </span>
            <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {item.origin === "local" ? (
                <form action={importLocalAction}>
                  <input type="hidden" name="folder" value={folder} />
                  <input type="hidden" name="name" value={item.name} />
                  <SubmitButton
                    pendingLabel="…"
                    className="rounded-md bg-black/60 px-2 py-1 text-xs text-white hover:bg-cyan-600"
                  >
                    ⬆
                  </SubmitButton>
                </form>
              ) : null}
              <form action={item.origin === "local" ? deleteLocalAction : deleteStorageAction}>
                <input type="hidden" name="folder" value={folder} />
                <input type="hidden" name="name" value={item.name} />
                <SubmitButton
                  pendingLabel="…"
                  confirm={`Supprimer « ${item.name} » ?`}
                  className="rounded-md bg-black/60 px-2 py-1 text-xs text-white hover:bg-red-600"
                >
                  ✕
                </SubmitButton>
              </form>
            </div>
            <p className="truncate bg-black/50 px-2 py-1 text-[10px] text-white/80">{item.name}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

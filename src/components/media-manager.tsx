"use client";

import { useRef, useState, useTransition } from "react";
import type { MediaItem } from "@/lib/site-media";
import { SubmitButton } from "@/components/submit-button";
import { UploadDropzone } from "@/components/upload-dropzone";

type Action = (formData: FormData) => void | Promise<void>;

// Compresse une image dans le navigateur avant l'envoi : max ~2400px,
// JPEG qualité 85 %. Indispensable car les server actions Vercel sont
// limitées à ~4,5 Mo par requête et les photos d'origine font souvent 10 Mo+.
async function compressImage(file: File, maxDim = 2400, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size < 2_000_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

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
  homeToggle,
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
  // Optionnel (vidéos showcase) : coche « accueil » par fichier.
  // initial = null → fichier _accueil.json absent → tout affiché.
  homeToggle?: {
    initial: string[] | null;
    action: (formData: FormData) => void | Promise<void>;
  };
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  // Réordonnancement local (null = ordre serveur tel quel).
  const [reordered, setReordered] = useState<MediaItem[] | null>(null);
  // Photos présentes au chargement de la page : tout ce qui arrive ensuite
  // (upload, import) est marqué « nouveau » et mis en surbrillance.
  const [initialNames] = useState<Set<string>>(
    () => new Set(items.map((i) => `${i.origin}-${i.name}`))
  );
  const list = reordered ?? items;

  // Case « accueil » (vidéos showcase) : état local optimiste, la server
  // action enregistre dans le bucket et revalide la page d'accueil.
  // initial null → tout coché (aucune sélection enregistrée).
  const [homeVisible, setHomeVisible] = useState<Set<string> | null>(
    () => (homeToggle ? new Set(homeToggle.initial ?? []) : null)
  );
  const isHomeVisible = (name: string) =>
    homeVisible === null ? true : homeVisible.has(name);

  const toggleHome = (name: string, visible: boolean) => {
    if (!homeToggle) return;
    setHomeVisible((cur) => {
      const base = cur ?? new Set(list.map((m) => m.name));
      const next = new Set(base);
      if (visible) next.add(name);
      else next.delete(name);
      return next;
    });
    const fd = new FormData();
    fd.set("folder", folder);
    fd.set("name", name);
    fd.set("visible", visible ? "1" : "0");
    void homeToggle.action(fd);
  };

  // Envoi fichier par fichier (une requête chacun) après compression :
  // évite de dépasser la limite de taille des server actions.
  async function runUpload(files: File[]) {
    if (files.length === 0) return;
    setBusy(true);
    let ok = 0;
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      setMsg(`Envoi ${i + 1}/${files.length} — ${files[i].name}…`);
      try {
        const file = accept.startsWith("image") ? await compressImage(files[i]) : files[i];
        const formData = new FormData();
        formData.set("file", file);
        await uploadAction(formData);
        ok++;
      } catch {
        failed++;
      }
    }
    setMsg(
      failed === 0
        ? `${ok} fichier(s) envoyé(s) ✓`
        : `${ok} envoyé(s), ${failed} en échec (réessaie les fichiers restants).`
    );
    // Repart de l'ordre serveur (qui inclut les nouveaux fichiers).
    setReordered(null);
    setBusy(false);
    // Rafraîchit la liste serveur (revalidatePath déjà fait côté action).
    startTransition(() => {});
  }

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
    setReordered(next);
    void persistOrder(next);
  };

  return (
    <div>
      {/* Upload : zone évidente (clic ou glisser-déposer) + envoi un fichier
          par requête après compression navigateur des images */}
      <UploadDropzone
        accept={accept}
        disabled={busy}
        onFiles={(fl) => void runUpload([...fl].filter((f) => f.size > 0))}
      />

      {busy ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block size-2 animate-pulse rounded-full bg-accent" />
          Envoi en cours…
        </p>
      ) : null}

      <p className="mt-2 text-[11px] text-muted-foreground/70">
        {kind === "image"
          ? "Les images sont compressées automatiquement (max 2400 px, JPEG 85 %) avant l'envoi."
          : "Les vidéos ne sont pas compressées : privilégie des .mp4 (H.264) de moins de 100 Mo."}
      </p>

      <p className="mt-2 text-[11px] text-muted-foreground/70">
        Glisse-dépose les vignettes pour changer l&apos;ordre d&apos;affichage sur le site.
        <span className="ml-1 rounded bg-yellow-500/10 px-1.5 py-0.5 text-yellow-300 border border-yellow-500/30">local</span>
        {" "}= fichier du dossier du projet — importe-le dans le stockage pour qu&apos;il reste en ligne.
      </p>

      {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}

      {/* Grille avec glisser-déposer */}
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((item, i) => {
          const isNew = !initialNames.has(`${item.origin}-${item.name}`);
          return (
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
            } ${isNew ? "ring-2 ring-emerald-400/80" : ""}`}
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
              <video
                src={item.url}
                className="aspect-[4/3] w-full bg-black object-contain"
                muted
                preload="metadata"
              />
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
            {isNew ? (
              <span className="absolute left-1.5 top-6 rounded bg-emerald-500/80 px-1.5 py-0.5 text-[9px] font-medium text-white">
                nouveau
              </span>
            ) : null}
            <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {item.origin === "local" ? (
                <form action={importLocalAction}>
                  <input type="hidden" name="folder" value={folder} />
                  <input type="hidden" name="name" value={item.name} />
                  <SubmitButton
                    pendingLabel="…"
                    className="rounded-md bg-black/60 px-2 py-1 text-xs text-white hover:bg-cyan-600"
                  >
                    Importer
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
            <div className="flex items-center gap-1.5 bg-black/50 px-1.5 py-1">
              {homeToggle ? (
                <label
                  className="flex shrink-0 cursor-pointer items-center gap-1 text-[9px] text-white/70"
                  title={
                    isHomeVisible(item.name)
                      ? "Affichée dans le carrousel de l'accueil — décoche pour la retirer"
                      : "Masquée de l'accueil — coche pour l'afficher"
                  }
                >
                  <input
                    type="checkbox"
                    checked={isHomeVisible(item.name)}
                    onChange={(e) => toggleHome(item.name, e.target.checked)}
                    className="size-3 accent-emerald-500"
                  />
                  accueil
                </label>
              ) : null}
              <span className="truncate text-[10px] text-white/80">{item.name}</span>
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import type { MediaItem } from "@/lib/site-media";
import { compressImage } from "@/components/media-manager";
import { NO_VIDEO_SENTINEL } from "@/lib/upsell";

type Action = (formData: FormData) => void | Promise<void>;

type PackDefault = { name: string; image: string; video?: string };

const IMAGE_RE = /\.(jpe?g|png|webp|avif)$/i;
const VIDEO_RE = /\.(mp4|webm|mov)$/i;

// Gestion simple des visuels de packs : chaque pack = une carte avec son
// aperçu. Clic « Photo » ou « Vidéo » → grille de miniatures : on clique sur
// celle voulue (ou on upload directement, rattachement automatique). Les
// personnalisations vivent dans _packs.json (bucket site-media).
export function PackMediaManager({
  packs,
  items,
  initial,
  assignAction,
  uploadAssignAction,
  deleteAction,
}: {
  packs: PackDefault[];
  items: MediaItem[];
  initial: Record<string, { image?: string; video?: string }>;
  assignAction: Action;
  uploadAssignAction: Action;
  deleteAction: Action;
}) {
  const [open, setOpen] = useState<string | null>(null); // `pack|field`
  const [pending, startTransition] = useTransition();

  // Visuel réellement affiché sur le site pour un pack/champ.
  const current = (pack: PackDefault, field: "image" | "video") => {
    const saved = initial[pack.name]?.[field];
    if (saved === NO_VIDEO_SENTINEL) {
      return field === "image" ? pack.image : undefined;
    }
    return saved ?? (field === "image" ? pack.image : pack.video);
  };

  const mediaOf = (field: "image" | "video") =>
    items.filter((i) => (field === "image" ? IMAGE_RE.test(i.url) : VIDEO_RE.test(i.url)));

  function assign(pack: PackDefault, field: "image" | "video", url: string | null) {
    const fd = new FormData();
    fd.set("pack", pack.name);
    fd.set("field", field);
    fd.set("url", url ?? "");
    startTransition(async () => {
      await assignAction(fd);
    });
  }

  async function upload(pack: PackDefault, field: "image" | "video", file: File) {
    const optimized = await compressImage(file);
    const fd = new FormData();
    fd.set("pack", pack.name);
    fd.set("field", field);
    fd.set("file", optimized);
    startTransition(async () => {
      await uploadAssignAction(fd);
    });
  }

  // Grille de miniatures pour un pack et un type de média (image ou vidéo).
  function Picker({ pack, field }: { pack: PackDefault; field: "image" | "video" }) {
    const active = current(pack, field);
    return (
      <div className="mt-3 border-t border-border pt-3">
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
          {/* Tuile « Par défaut » : remet le visuel d'origine du site */}
          <button
            type="button"
            onClick={() => assign(pack, field, null)}
            className={`relative overflow-hidden rounded-lg border-2 transition-colors ${
              field === "image"
                ? active === pack.image
                  ? "border-accent"
                  : "border-transparent hover:border-border"
                : !active
                  ? "border-accent"
                  : "border-transparent hover:border-border"
            }`}
          >
            {field === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pack.image} alt="" className="aspect-video w-full object-cover" />
            ) : (
              <span className="flex aspect-video w-full items-center justify-center bg-muted/50 text-xl">
                {pack.video ? "🎬" : "∅"}
              </span>
            )}
            <span className="block bg-black/50 py-0.5 text-center text-[10px] text-white/80">
              Par défaut
            </span>
          </button>

          {/* Miniatures des médias disponibles (aperçu visuel, pas de nom) */}
          {mediaOf(field).map((item) => {
            const isCurrent = active === item.url;
            return (
              <div key={`${item.origin}-${item.name}`} className="relative">
                <button
                  type="button"
                  onClick={() => assign(pack, field, item.url)}
                  title={item.name}
                  className={`block w-full overflow-hidden rounded-lg border-2 transition-colors ${
                    isCurrent ? "border-accent" : "border-transparent hover:border-border"
                  }`}
                >
                  {field === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt=""
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <video
                      src={item.url}
                      muted
                      preload="metadata"
                      className="aspect-video w-full bg-black object-cover"
                    />
                  )}
                  {isCurrent ? (
                    <span className="absolute left-1 top-1 rounded bg-accent px-1 text-[9px] font-medium text-background">
                      ✓ en place
                    </span>
                  ) : null}
                </button>
                {item.origin === "storage" ? (
                  <form action={deleteAction} className="absolute right-0.5 top-0.5">
                    <input type="hidden" name="folder" value="packs" />
                    <input type="hidden" name="name" value={item.name} />
                    <button
                      type="submit"
                      title="Supprimer ce média"
                      className="rounded bg-black/60 px-1 text-[10px] text-white hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </form>
                ) : null}
              </div>
            );
          })}

          {/* Upload direct : le média est rattaché au pack automatiquement */}
          <label
            className={`flex aspect-auto cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border p-2 text-center text-[11px] text-muted-foreground transition-colors hover:border-accent hover:text-accent ${
              pending ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <input
              type="file"
              className="hidden"
              accept={field === "image" ? "image/*" : "video/*"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(pack, field, file);
                e.target.value = "";
              }}
            />
            <span className="text-lg leading-none">＋</span>
            Uploader
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Pour changer le visuel d&apos;un pack : cliquez sur <strong>📷 Photo</strong>{" "}
        ou <strong>🎬 Vidéo</strong>, puis choisissez une miniature (ou uploadez
        — le fichier est rattaché tout seul). Le bouton{" "}
        <strong>Par défaut</strong> remet le visuel d&apos;origine du site.
      </p>
      {packs.map((pack) => {
        const imgKey = `${pack.name}|image`;
        const vidKey = `${pack.name}|video`;
        const vid = current(pack, "video");
        return (
          <div key={pack.name} className="rounded-xl border border-border bg-card/50 p-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Aperçus réels : image affichée + vidéo affichée */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current(pack, "image")}
                alt={`Visuel du ${pack.name}`}
                className="h-14 w-24 shrink-0 rounded-lg object-cover"
              />
              {vid ? (
                <video
                  src={vid}
                  muted
                  preload="metadata"
                  className="h-14 w-24 shrink-0 rounded-lg bg-black object-cover"
                />
              ) : (
                <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                  Pas de vidéo
                </div>
              )}
              <div className="min-w-40 flex-1">
                <p className="text-sm font-medium">{pack.name}</p>
                <p className="text-xs text-muted-foreground">
                  {initial[pack.name]?.image ? "Photo personnalisée" : "Photo d'origine"}
                  {pack.video || vid
                    ? initial[pack.name]?.video
                      ? " · vidéo personnalisée"
                      : " · vidéo d'origine"
                    : " · pas de vidéo"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(open === imgKey ? null : imgKey)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    open === imgKey
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-foreground hover:border-accent/50"
                  }`}
                >
                  📷 Photo
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(open === vidKey ? null : vidKey)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    open === vidKey
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-foreground hover:border-accent/50"
                  }`}
                >
                  🎬 Vidéo
                </button>
              </div>
            </div>
            {open === imgKey ? <Picker pack={pack} field="image" /> : null}
            {open === vidKey ? <Picker pack={pack} field="video" /> : null}
          </div>
        );
      })}
      {pending ? <p className="text-xs text-accent">Enregistrement…</p> : null}
    </div>
  );
}

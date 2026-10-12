"use client";

import { useState, useTransition } from "react";
import type { MediaItem } from "@/lib/site-media";

type Action = (formData: FormData) => void | Promise<void>;

type PackDefault = { name: string; image: string; video?: string };

// Valeur sentinelle : la vidéo par défaut du pack est explicitement retirée
// (stockée telle quelle dans _packs.json, interprétée par pricing-section).
export const NO_VIDEO = "__aucune_video__";

// Rattachement des médias (dossier « packs ») aux packs du site : pour chaque
// pack, choix de l'image et de la vidéo affichées sur /formules. L'état est
// tenu à jour de façon optimiste ; la server action persiste dans le bucket
// (_packs.json) et revalide les pages publiques.
export function PackMediaAssigner({
  packs,
  items,
  initial,
  assignAction,
}: {
  packs: PackDefault[];
  items: MediaItem[];
  initial: Record<string, { image?: string; video?: string }>;
  assignAction: Action;
}) {
  const [overrides, setOverrides] = useState(initial);
  const [pending, startTransition] = useTransition();

  const imageItems = items.filter((i) => /\.(jpe?g|png|webp|avif)$/i.test(i.name));
  const videoItems = items.filter((i) => /\.(mp4|webm|mov)$/i.test(i.name));

  // Image réellement affichée pour un pack (personnalisée ou par défaut).
  const resolvedImage = (pack: PackDefault) => overrides[pack.name]?.image ?? pack.image;

  function assign(packName: string, field: "image" | "video", url: string | null) {
    // Mise à jour optimiste, puis persistance via la server action.
    setOverrides((current) => {
      const next = { ...(current[packName] ?? {}) };
      if (url) next[field] = url;
      else delete next[field];
      const copy = { ...current };
      if (next.image || next.video) copy[packName] = next;
      else delete copy[packName];
      return copy;
    });
    const fd = new FormData();
    fd.set("pack", packName);
    fd.set("field", field);
    fd.set("url", url ?? "");
    startTransition(async () => {
      await assignAction(fd);
    });
  }

  // Récapitulatif « quel média s'affiche où » (badge par média affecté).
  const assignments = Object.entries(overrides)
    .flatMap(([packName, ov]) => [
      ov.image ? { media: ov.image, pack: packName, kind: "image" } : null,
      ov.video && ov.video !== NO_VIDEO
        ? { media: ov.video, pack: packName, kind: "vidéo" }
        : null,
    ])
    .filter((a): a is { media: string; pack: string; kind: string } => a !== null);

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-border bg-card/50 p-4">
      <div>
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Rattachement aux packs
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Pour chaque pack, choisissez l&apos;image (et éventuellement la vidéo)
          affichées sur la page Formules. Les médias proposés proviennent de la
          grille au-dessus : uploadez-y une photo, puis rattachez-la ici. Sans
          choix, le visuel d&apos;origine du site s&apos;affiche.
        </p>
      </div>

      {assignments.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">En place actuellement :</span>
          {assignments.map((a) => {
            const name = decodeURIComponent(a.media.split("/").pop() ?? a.media);
            return (
              <span
                key={`${a.pack}-${a.kind}`}
                className="rounded-full bg-accent/15 px-2 py-0.5 text-accent"
              >
                {name} → {a.pack} ({a.kind})
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Aucun visuel personnalisé : tous les packs utilisent leurs visuels d&apos;origine.
        </p>
      )}

      <div className="space-y-3">
        {packs.map((pack) => {
          const ov = overrides[pack.name] ?? {};
          return (
            <div
              key={pack.name}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background/50 p-3 sm:flex-row sm:items-center"
            >
              {/* Aperçu du visuel réellement affiché sur le site */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedImage(pack)}
                alt={`Visuel actuel du ${pack.name}`}
                className="h-16 w-24 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-44 flex-1">
                <p className="text-sm font-medium">{pack.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ov.image ? "Visuel personnalisé" : "Visuel d'origine"}
                  {pack.video || ov.video
                    ? ` · vidéo : ${
                        ov.video === NO_VIDEO
                          ? "retirée"
                          : ov.video
                            ? "personnalisée"
                            : "d'origine"
                      }`
                    : " · pas de vidéo"}
                  {pending ? " · enregistrement…" : ""}
                </p>
              </div>
              <label className="text-xs">
                <span className="mb-1 block text-muted-foreground">Image affichée</span>
                <select
                  value={ov.image ?? ""}
                  onChange={(e) => assign(pack.name, "image", e.target.value || null)}
                  className="w-52 rounded-md border border-border bg-background px-2 py-1.5"
                >
                  <option value="">Visuel d&apos;origine</option>
                  {imageItems.map((i) => (
                    <option key={`${i.origin}-${i.name}`} value={i.url}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-muted-foreground">Vidéo (survol)</span>
                <select
                  value={ov.video ?? ""}
                  onChange={(e) =>
                    assign(
                      pack.name,
                      "video",
                      e.target.value === NO_VIDEO ? NO_VIDEO : e.target.value || null
                    )
                  }
                  className="w-52 rounded-md border border-border bg-background px-2 py-1.5"
                >
                  {pack.video ? (
                    <option value="">Vidéo d&apos;origine</option>
                  ) : (
                    <option value="">Aucune vidéo</option>
                  )}
                  {pack.video ? (
                    <option value={NO_VIDEO}>Retirer la vidéo</option>
                  ) : null}
                  {videoItems.map((i) => (
                    <option key={`${i.origin}-${i.name}`} value={i.url}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

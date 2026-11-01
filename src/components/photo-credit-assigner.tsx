"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, ChevronDown, MapPin, PenLine } from "lucide-react";
import { toast } from "sonner";

type Item = { name: string; url: string };
type CreditsMap = Record<string, string[]>;

const inputClass =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent";

/**
 * Attribution rapide par photo : on clique une photo, on choisit (ou on
 * tape) son photographe et son lieu — avec suggestions des valeurs déjà
 * utilisées. Sauvegarde immédiate photo par photo.
 */
export function PhotoCreditAssigner({
  items,
  photographers,
  lieux,
  onSavePhoto,
}: {
  items: Item[];
  photographers: CreditsMap;
  lieux: CreditsMap;
  /** Attribue photographe/lieu à une photo (persist serveur + état parent). */
  onSavePhoto: (name: string, photographer: string, lieu: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [photoPh, setPhotoPh] = useState("");
  const [photoLieu, setPhotoLieu] = useState("");
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  const photographerOf = (name: string) => {
    for (const [who, photos] of Object.entries(photographers)) {
      if (photos.includes(name)) return who;
    }
    return "";
  };
  const lieuOf = (name: string) => {
    for (const [where, photos] of Object.entries(lieux)) {
      if (photos.includes(name)) return where;
    }
    return "";
  };

  function openEditor(item: Item) {
    setSelected(item.name);
    setPhotoPh(photographerOf(item.name));
    setPhotoLieu(lieuOf(item.name));
  }

  async function saveOne() {
    if (!selected) return;
    setPending(true);
    const res = await onSavePhoto(selected, photoPh, photoLieu);
    setPending(false);
    if (res.ok) toast.success("Photo attribuée ✓");
    else toast.error(res.error ?? "Enregistrement impossible.");
    return res;
  }

  const unassignedCount = items.filter(
    (i) => !photographerOf(i.name) && !lieuOf(i.name)
  ).length;
  const selectedItem = items.find((i) => i.name === selected);

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <PenLine className="size-4 text-accent" aria-hidden />
          Attribution rapide par photo
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {open ? (
        <>
      <p className="mt-1 text-xs text-muted-foreground">
        Cliquez sur une photo, puis choisissez (ou tapez) son photographe et
        son lieu. Les suggestions reprennent les valeurs déjà utilisées —
        en tapant un nouveau nom, il est créé. Enregistrement immédiat.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {unassignedCount === 0
          ? "Toutes les photos sont attribuées ✓"
          : `${unassignedCount} photo(s) sans photographe ni lieu.`}
      </p>

      {/* Grille de toutes les photos */}
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => {
          const ph = photographerOf(item.name);
          const lie = lieuOf(item.name);
          const isSel = selected === item.name;
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => openEditor(item)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition-all ${
                isSel ? "ring-accent" : ph || lie ? "ring-emerald-500/40" : "ring-amber-500/60"
              }`}
              title={item.name}
            >
              <Image src={item.url} alt={item.name} fill sizes="80px" className="object-cover" />
              {ph || lie ? (
                <span className="absolute bottom-0 right-0 flex items-center gap-0.5 rounded-tl-md bg-background/60 px-1 py-0.5 text-foreground/90">
                  {ph ? <Camera className="size-2.5" aria-hidden /> : null}
                  {lie ? <MapPin className="size-2.5" aria-hidden /> : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Panneau d'édition de la photo sélectionnée */}
      {selectedItem ? (
        <div className="mt-3 rounded-lg border border-accent/40 bg-card p-3">
          <div className="flex items-start gap-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
              <Image src={selectedItem.url} alt={selectedItem.name} fill sizes="96px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Photographe</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {Object.keys(photographers)
                    .filter((n) => n !== photoPh)
                    .slice(0, 6)
                    .map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPhotoPh(n)}
                        className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
                      >
                        {n}
                      </button>
                    ))}
                </div>
                <input
                  list="suggestions-photographes"
                  value={photoPh}
                  onChange={(e) => setPhotoPh(e.target.value)}
                  placeholder="Photographe (ex. Jeanne Bastien) — vide pour retirer"
                  className={`mt-1 ${inputClass}`}
                />
                <datalist id="suggestions-photographes">
                  {Object.keys(photographers).map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Lieu</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {Object.keys(lieux)
                    .filter((n) => n !== photoLieu)
                    .slice(0, 6)
                    .map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPhotoLieu(n)}
                        className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
                      >
                        {n}
                      </button>
                    ))}
                </div>
                <input
                  list="suggestions-lieux"
                  value={photoLieu}
                  onChange={(e) => setPhotoLieu(e.target.value)}
                  placeholder="Lieu (ex. Blois) — vide pour retirer"
                  className={`mt-1 ${inputClass}`}
                />
                <datalist id="suggestions-lieux">
                  {Object.keys(lieux).map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={saveOne}
                  disabled={pending}
                  className={`rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 ${
                    pending ? "animate-pulse cursor-wait opacity-90" : ""
                  }`}
                >
                  {pending ? "Enregistrement…" : "Enregistrer cette photo"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg border border-border px-4 py-2 text-xs transition-colors hover:border-accent/50"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
        </>
      ) : null}
    </div>
  );
}

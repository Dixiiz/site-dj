"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

type Item = { name: string; url: string };

/**
 * Gestion des crédits média (photographes ou lieux) : créer une entrée,
 * lui assigner des photos (cases à cocher), retirer des photos ou
 * supprimer. Toutes les modifications sont locales jusqu'à « Enregistrer ».
 */
export function MediaCreditsManager({
  title,
  hint,
  placeholder,
  icon,
  items,
  credits,
  onSave,
}: {
  title: string;
  hint: string;
  placeholder: string;
  icon?: ReactNode;
  items: Item[];
  credits: Record<string, string[]>;
  /** Applique la nouvelle version des crédits (persist serveur + état parent). */
  onSave: (next: Record<string, string[]>) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [newName, setNewName] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const assigned = new Set(Object.values(credits).flat());
  const unassigned = items.filter((i) => !assigned.has(i.name));

  // Applique immédiatement une modification : le parent persiste côté
  // serveur et met à jour l'état partagé → toutes les sections suivent.
  async function apply(next: Record<string, string[]>, message?: string) {
    const res = await onSave(next);
    if (res.ok) toast.success(message ?? "Crédits enregistrés ✓");
    else toast.error(res.error ?? "Enregistrement impossible.");
    return res;
  }

  async function addPhotographer() {
    const name = newName.trim();
    if (!name || credits[name]) return;
    await apply({ ...credits, [name]: [] }, `${name} créé ✓`);
    setNewName("");
  }

  async function removePhotographer(name: string) {
    if (!window.confirm(`Retirer « ${name} » ? (les photos resteront, sans crédit)`)) return;
    const copy = { ...credits };
    delete copy[name];
    await apply(copy, `${name} retiré ✓`);
  }

  async function removePhoto(photographer: string, photo: string) {
    await apply({
      ...credits,
      [photographer]: (credits[photographer] ?? []).filter((p) => p !== photo),
    }, "Photo retirée ✓");
  }

  function toggleSelect(photo: string) {
    setSelected((s) => (s.includes(photo) ? s.filter((p) => p !== photo) : [...s, photo]));
  }

  async function confirmAssign() {
    if (!assigning) return;
    await apply(
      {
        ...credits,
        [assigning]: [...new Set([...(credits[assigning] ?? []), ...selected])],
      },
      `${selected.length} photo(s) assignée(s) ✓`
    );
    setAssigning(null);
    setSelected([]);
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {icon}
          {title}
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
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>

      {/* Créer une entrée */}
      <div className="mt-3 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPhotographer()}
          placeholder={placeholder}
          className="w-full max-w-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={addPhotographer}
          disabled={!newName.trim()}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          + Créer
        </button>
      </div>

      {/* Liste des photographes */}
      <div className="mt-3 space-y-3">
        {Object.entries(credits).map(([name, photos]) => (
          <div key={name} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{photos.length} photo(s)</span>
                <button
                  type="button"
                  onClick={() => {
                    setAssigning(assigning === name ? null : name);
                    setSelected([]);
                  }}
                  className="rounded-lg border border-accent/40 px-2.5 py-1 text-xs text-accent transition-colors hover:bg-accent/10"
                >
                  {assigning === name ? "Fermer" : "+ Photos"}
                </button>
                <button
                  type="button"
                  onClick={() => removePhotographer(name)}
                  className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Supprimer
                </button>
              </div>
            </div>

            {/* Photos du photographe */}
            {photos.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {photos.map((photo) => {
                  const item = items.find((i) => i.name === photo);
                  if (!item) return null;
                  return (
                    <div key={photo} className="group relative h-16 w-16 overflow-hidden rounded-lg">
                      <Image src={item.url} alt={photo} fill sizes="64px" className="object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(name, photo)}
                        aria-label={`Retirer ${photo}`}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Aucune photo assignée.</p>
            )}

            {/* Grille d'assignation */}
            {assigning === name ? (
              <div className="mt-3 rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Sélectionnez les photos de {name} (hors photos déjà attribuées), puis validez.
                </p>
                {unassigned.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Toutes les photos sont déjà attribuées.
                  </p>
                ) : (
                  <>
                    <div className="mt-2 flex max-h-64 flex-wrap gap-2 overflow-y-auto">
                      {unassigned.map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => toggleSelect(item.name)}
                          className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition-all ${
                            selected.includes(item.name)
                              ? "ring-accent"
                              : "ring-transparent hover:ring-accent/40"
                          }`}
                        >
                          <Image src={item.url} alt={item.name} fill sizes="80px" className="object-cover" />
                          {selected.includes(item.name) ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-accent/30 text-lg">✓</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={confirmAssign}
                      disabled={selected.length === 0}
                      className="mt-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      Assigner {selected.length > 0 ? `(${selected.length})` : ""}
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        ))}
        {Object.keys(credits).length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune entrée créée.</p>
        ) : null}
      </div>
        </>
      ) : null}
    </div>
  );
}

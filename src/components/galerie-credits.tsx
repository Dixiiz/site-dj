"use client";

import { useRef, useState } from "react";

import { MediaCreditsManager } from "./media-credits-manager";
import { PhotoCreditAssigner } from "./photo-credit-assigner";
import { Camera, MapPin } from "lucide-react";

type CreditsMap = Record<string, string[]>;
export type CreditsBundle = { photographers: CreditsMap; lieux: CreditsMap };
type Item = { name: string; url: string };

/**
 * État partagé des crédits galerie : une seule source de vérité côté client.
 * Toute modification (rapide ou en lot) est d'abord persistée côté serveur ;
 * l'état n'est mis à jour qu'en cas de succès — sinon l'interface continue
 * d'afficher l'état réel et l'erreur est visible (toast). Les sauvegardes
 * sont sérialisées pour qu'aucune ne puisse en écraser une autre.
 */
export function GalerieCredits({
  items,
  initial,
  savePhotographers,
  saveLieux,
  setPhoto,
}: {
  items: Item[];
  initial: CreditsBundle;
  savePhotographers: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  saveLieux: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  setPhoto: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [bundle, setBundle] = useState<CreditsBundle>(initial);
  // Référence miroir : garantit que chaque sauvegarde part bien de l'état le
  // plus récent, même si plusieurs actions s'enchaînent rapidement.
  const bundleRef = useRef<CreditsBundle>(initial);
  // File d'attente : les sauvegardes s'exécutent l'une après l'autre.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  function commit(next: CreditsBundle) {
    bundleRef.current = next;
    setBundle(next);
  }

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queueRef.current.then(task, task);
    queueRef.current = run.catch(() => {});
    return run;
  }

  async function applySection(
    section: "photographers" | "lieux",
    credits: CreditsMap
  ): Promise<{ ok: boolean; error?: string }> {
    return enqueue(async () => {
      const formData = new FormData();
      formData.set("credits", JSON.stringify(credits));
      const res =
        section === "photographers"
          ? await savePhotographers(formData)
          : await saveLieux(formData);
      if (res.ok) commit({ ...bundleRef.current, [section]: credits });
      return res;
    });
  }

  async function applyPhoto(
    name: string,
    photographer: string,
    lieu: string
  ): Promise<{ ok: boolean; error?: string }> {
    return enqueue(async () => {
      // Retire la photo de toutes les entrées, puis la réassigne.
      const strip = (map: CreditsMap) => {
        const copy: CreditsMap = {};
        for (const [key, photos] of Object.entries(map)) {
          const rest = photos.filter((n) => n !== name);
          if (rest.length > 0) copy[key] = rest;
        }
        return copy;
      };
      const next = {
        photographers: strip(bundleRef.current.photographers),
        lieux: strip(bundleRef.current.lieux),
      };
      if (photographer.trim()) {
        next.photographers[photographer.trim()] = [
          ...(next.photographers[photographer.trim()] ?? []),
          name,
        ];
      }
      if (lieu.trim()) {
        next.lieux[lieu.trim()] = [...(next.lieux[lieu.trim()] ?? []), name];
      }
      const formData = new FormData();
      formData.set("name", name);
      formData.set("photographer", photographer);
      formData.set("lieu", lieu);
      const res = await setPhoto(formData);
      if (res.ok) commit(next);
      return res;
    });
  }

  return (
    <>
      <MediaCreditsManager
        icon={<Camera className="size-4 text-accent" aria-hidden />}
        title="Crédits photographes"
        hint="Créez un photographe, sélectionnez ses photos, enregistrez. Le nom apparaît au survol sur la page /galerie (et en permanence sur mobile)."
        placeholder="Nom du photographe (ex. Jeanne Bastien)"
        items={items}
        credits={bundle.photographers}
        onSave={(credits) => applySection("photographers", credits)}
      />
      <MediaCreditsManager
        icon={<MapPin className="size-4 text-accent" aria-hidden />}
        title="Lieux des photos"
        hint="Créez un lieu (ex. Blois, Château de Chambord) et assignez-y les photos prises à cet endroit."
        placeholder="Lieu (ex. Blois, Château de Chambord)"
        items={items}
        credits={bundle.lieux}
        onSave={(credits) => applySection("lieux", credits)}
      />
      <PhotoCreditAssigner
        items={items}
        photographers={bundle.photographers}
        lieux={bundle.lieux}
        onSavePhoto={applyPhoto}
      />
    </>
  );
}

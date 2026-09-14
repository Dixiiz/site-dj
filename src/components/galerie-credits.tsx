"use client";

import { useState } from "react";

import { MediaCreditsManager } from "./media-credits-manager";
import { PhotoCreditAssigner } from "./photo-credit-assigner";
import { Camera, MapPin } from "lucide-react";

type CreditsMap = Record<string, string[]>;
export type CreditsBundle = { photographers: CreditsMap; lieux: CreditsMap };
type Item = { name: string; url: string };

/**
 * État partagé des crédits galerie : une seule source de vérité côté client.
 * Toute modification (rapide ou en lot) met à jour cet état puis persiste —
 * les trois sections restent toujours synchronisées, sans rechargement.
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

  async function applySection(
    section: "photographers" | "lieux",
    credits: CreditsMap
  ): Promise<{ ok: boolean; error?: string }> {
    setBundle((b) => ({ ...b, [section]: credits }));
    const formData = new FormData();
    formData.set("credits", JSON.stringify(credits));
    return section === "photographers"
      ? await savePhotographers(formData)
      : await saveLieux(formData);
  }

  async function applyPhoto(
    name: string,
    photographer: string,
    lieu: string
  ): Promise<{ ok: boolean; error?: string }> {
    // Mise à jour optimiste : retire la photo de toutes les entrées, puis réassigne.
    const strip = (map: CreditsMap) => {
      const copy: CreditsMap = {};
      for (const [key, photos] of Object.entries(map)) {
        const rest = photos.filter((n) => n !== name);
        if (rest.length > 0) copy[key] = rest;
      }
      return copy;
    };
    const next = {
      photographers: strip(bundle.photographers),
      lieux: strip(bundle.lieux),
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
    setBundle(next);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("photographer", photographer);
    formData.set("lieu", lieu);
    return await setPhoto(formData);
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

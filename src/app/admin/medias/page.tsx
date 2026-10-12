import {
  deleteLocalMedia,
  deleteMedia,
  getHomeSelection,
  getCreditsBundle,
  getOrder,
  getPackOverrides,
  importLocalToStorage,
  listLocalMedia,
  listMedia,
  saveCreditsSection,
  saveHomeSelection,
  saveOrder,
  setPhotoCredit,
  type MediaCredits,
  type MediaFolder,
  type MediaItem,
} from "@/lib/site-media";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { MediaManager } from "@/components/media-manager";
import { PackMediaAssigner } from "@/components/pack-media-assigner";
import { PACK_DEFAULTS } from "@/components/pricing-section";
import { CollapsibleSection } from "@/components/collapsible-section";
import { GalerieCredits } from "@/components/galerie-credits";

const FOLDERS: { key: MediaFolder; titre: string; hint: string; accept: string; kind: "image" | "video" | "mixed" }[] = [
  {
    key: "galerie",
    titre: "Galerie photos",
    hint: "Photos du carrousel de la page d'accueil (ordre = ordre du carrousel).",
    accept: "image/jpeg,image/png,image/webp,image/avif",
    kind: "image",
  },
  {
    key: "packs",
    titre: "Visuels des packs",
    hint: "Aperçus des packs de la page Formules. Uploadez ici vos photos (et vidéos), puis rattachez chaque média à un pack dans « Rattachement aux packs » sous la grille. Sans rattachement, le visuel d'origine du site s'affiche.",
    accept:
      "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/quicktime,video/webm",
    kind: "mixed",
  },
  {
    key: "videos/showcase",
    titre: "Vidéos showcase",
    hint: "Vidéos de la page Galerie (verticales ou horizontales — l'affichage s'adapte tout seul). Coche « accueil » sur celles à afficher dans le carrousel de la page d'accueil.",
    accept: "video/mp4,video/quicktime,video/webm",
    kind: "video",
  },
  {
    key: "videos",
    titre: "Vidéo de fond (héro)",
    hint: "Vidéo de fond de l'accueil : celle nommée hero* est prioritaire, sinon la première de la liste.",
    accept: "video/mp4,video/quicktime,video/webm",
    kind: "video",
  },
];

async function requireAdmin() {
  const { isAdmin } = await import("@/lib/admin-auth");
  return isAdmin();
}

// Fusionne stockage + fichiers locaux, triés selon l'ordre enregistré.
async function mergedItems(folder: MediaFolder): Promise<MediaItem[]> {
  const [storage, local, order] = await Promise.all([
    listMedia(folder).then((files) =>
      files.map((f) => ({ ...f, origin: "storage" as const }))
    ),
    Promise.resolve(listLocalMedia(folder)),
    getOrder(folder).catch(() => [] as string[]),
  ]);
  const all = [...storage, ...local.filter((l) => !storage.some((s) => s.name === l.name))];
  const byName = new Map(all.map((m) => [m.name, m]));
  const sorted: MediaItem[] = [];
  for (const name of order) {
    const item = byName.get(name);
    if (item) {
      sorted.push(item);
      byName.delete(name);
    }
  }
  return [...sorted, ...byName.values()];
}

function makeUploadAction(folder: MediaFolder) {
  return async (formData: FormData) => {
 "use server";
    if (!(await requireAdmin())) return;
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      const { uploadMedia } = await import("@/lib/site-media");
      await uploadMedia(folder, file);
    }
    revalidatePath("/admin/medias");
    revalidatePath("/");
    revalidatePath("/galerie");
    revalidatePath("/formules");
  };
}

function makeDeleteStorageAction(folder: MediaFolder) {
  return async (formData: FormData) => {
 "use server";
    if (!(await requireAdmin())) return;
    const name = String(formData.get("name") ?? "");
    if (name) await deleteMedia(folder, name);
    revalidatePath("/admin/medias");
    revalidatePath("/");
  };
}

function makeDeleteLocalAction(folder: MediaFolder) {
  return async (formData: FormData) => {
 "use server";
    if (!(await requireAdmin())) return;
    const name = String(formData.get("name") ?? "");
    if (name) deleteLocalMedia(folder, name);
    revalidatePath("/admin/medias");
    revalidatePath("/");
  };
}

function makeImportLocalAction(folder: MediaFolder) {
  return async (formData: FormData) => {
 "use server";
    if (!(await requireAdmin())) return;
    const name = String(formData.get("name") ?? "");
    if (name) await importLocalToStorage(folder, name);
    revalidatePath("/admin/medias");
    revalidatePath("/");
  };
}

function makeSaveCreditsAction(folder: MediaFolder, section: "photographers" | "lieux") {
  return async (formData: FormData) => {
 "use server";
    if (!(await requireAdmin())) return { ok: false as const, error: "Non autorisé." };
    let credits: MediaCredits;
    try {
      credits = JSON.parse(String(formData.get("credits") ?? "{}"));
    } catch {
      return { ok: false as const, error: "Données invalides." };
    }
    const res = await saveCreditsSection(folder, section, credits);
    if (res.ok) {
      revalidatePath("/admin/medias");
      revalidatePath("/galerie");
    }
    return res;
  };
}

function makeSetPhotoCreditAction(folder: MediaFolder) {
  return async (formData: FormData) => {
 "use server";
    if (!(await requireAdmin())) return { ok: false as const, error: "Non autorisé." };
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { ok: false as const, error: "Photo introuvable." };
    const res = await setPhotoCredit(
      folder,
      name,
      String(formData.get("photographer") ?? ""),
      String(formData.get("lieu") ?? "")
    );
    if (res.ok) {
      revalidatePath("/admin/medias");
      revalidatePath("/galerie");
    }
    return res;
  };
}

function makeSetHomeVisibleAction(folder: MediaFolder) {
  return async (formData: FormData) => {
 "use server";
    if (!(await requireAdmin())) return;
    const name = String(formData.get("name") ?? "");
    const visible = String(formData.get("visible") ?? "") === "1";
    if (!name) return;
    const current = await getHomeSelection(folder).catch(() => null);
    if (!visible && current === null) {
      // Première désélection : on crée la liste = tout sauf ce fichier.
      const all = await listMedia(folder).catch(() => [] as { name: string }[]);
      await saveHomeSelection(folder, all.map((f) => f.name).filter((n) => n !== name));
    } else {
      const cur = current ?? [];
      const next = visible
        ? [...new Set([...cur, name])]
        : cur.filter((n) => n !== name);
      await saveHomeSelection(folder, next);
    }
    revalidatePath("/admin/medias");
    revalidatePath("/");
  };
}

// Rattachement d'un média (image/vidéo) à un pack : persiste _packs.json.
function makeAssignPackAction() {
  return async (formData: FormData) => {
 "use server";
    if (!(await requireAdmin())) return;
    const pack = String(formData.get("pack") ?? "");
    const field = String(formData.get("field") ?? "");
    const url = String(formData.get("url") ?? "").trim();
    if (!pack || (field !== "image" && field !== "video")) return;
    const { savePackOverride } = await import("@/lib/site-media");
    await savePackOverride(pack, field as "image" | "video", url || null);
    revalidatePath("/admin/medias");
    revalidatePath("/formules");
  };
}

async function saveOrderAction(folder: string, names: string[]) {
 "use server";
  if (!(await requireAdmin())) return { ok: false as const, error: "Non autorisé." };
  const res = await saveOrder(folder as MediaFolder, names);
  if (res.ok) {
    revalidatePath("/admin/medias");
    revalidatePath("/");
  }
  return res;
}

export default async function AdminMediasPage() {
  const [sections, galerieCredits, showcaseHome, packOverrides] = await Promise.all([
    Promise.all(
      FOLDERS.map(async (f) => ({ ...f, items: await mergedItems(f.key) }))
    ),
    getCreditsBundle("galerie").catch(() => ({
      photographers: {} as MediaCredits,
      lieux: {} as MediaCredits,
    })),
    getHomeSelection("videos/showcase").catch(() => null as string[] | null),
    getPackOverrides().catch(() => ({})),
  ]);

  return (
    <main className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Médias du site</h1>
        <Link href="/admin/devis" className="text-sm text-muted-foreground hover:text-foreground">
          ← Devis
        </Link>
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Ajoutez, supprimez et réordonnez les photos et vidéos du site public. Les
        modifications sont visibles après rechargement de la page publique.
        Cliquez sur une section ci-dessous pour la déplier.
      </p>

      {sections.map((section) => (
        <CollapsibleSection
          key={section.key}
          title={section.titre}
          hint={section.hint}
          badge={`${section.items.length} fichier${section.items.length > 1 ? "s" : ""}`}
        >
          <MediaManager
            folder={section.key}
            items={section.items}
            accept={section.accept}
            kind={section.kind}
            uploadAction={makeUploadAction(section.key)}
            deleteStorageAction={makeDeleteStorageAction(section.key)}
            deleteLocalAction={makeDeleteLocalAction(section.key)}
            importLocalAction={makeImportLocalAction(section.key)}
            orderAction={saveOrderAction}
            homeToggle={
              section.key === "videos/showcase"
                ? {
                    initial: showcaseHome,
                    action: makeSetHomeVisibleAction(section.key),
                  }
                : undefined
            }
          />
          {section.key === "packs" ? (
            <PackMediaAssigner
              packs={PACK_DEFAULTS}
              items={section.items}
              initial={packOverrides}
              assignAction={makeAssignPackAction()}
            />
          ) : null}
          {section.key === "galerie" ? (
            <>
              <GalerieCredits
                items={section.items}
                initial={galerieCredits}
                savePhotographers={makeSaveCreditsAction("galerie", "photographers")}
                saveLieux={makeSaveCreditsAction("galerie", "lieux")}
                setPhoto={makeSetPhotoCreditAction("galerie")}
              />
            </>
          ) : null}
        </CollapsibleSection>
      ))}
    </main>
  );
}

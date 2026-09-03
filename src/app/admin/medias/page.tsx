import {
  deleteLocalMedia,
  deleteMedia,
  getOrder,
  importLocalToStorage,
  listLocalMedia,
  listMedia,
  saveOrder,
  type MediaFolder,
  type MediaItem,
} from "@/lib/site-media";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { MediaManager } from "@/components/media-manager";

const FOLDERS: { key: MediaFolder; titre: string; hint: string; accept: string; kind: "image" | "video" }[] = [
  {
    key: "galerie",
    titre: "📷 Galerie photos",
    hint: "Photos du carrousel de la page d'accueil (ordre = ordre du carrousel).",
    accept: "image/jpeg,image/png,image/webp,image/avif",
    kind: "image",
  },
  {
    key: "videos/showcase",
    titre: "🎬 Vidéos showcase",
    hint: "Vidéos verticales de la section « En action » (ordre = ordre d'affichage).",
    accept: "video/mp4,video/quicktime,video/webm",
    kind: "video",
  },
  {
    key: "videos",
    titre: "⭐ Vidéo de fond (héro)",
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
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    const { uploadMedia } = await import("@/lib/site-media");
    for (const file of files) await uploadMedia(folder, file);
    revalidatePath("/admin/medias");
    revalidatePath("/");
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
  const sections = await Promise.all(
    FOLDERS.map(async (f) => ({ ...f, items: await mergedItems(f.key) }))
  );

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
      </p>

      {sections.map((section) => (
        <section key={section.key} className="rounded-xl border border-border p-5">
          <h2 className="font-medium">{section.titre}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{section.hint}</p>
          <div className="mt-3">
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
            />
          </div>
        </section>
      ))}
    </main>
  );
}

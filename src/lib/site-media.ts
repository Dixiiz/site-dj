// Gestion des médias du site (galerie photos, vidéos showcase, héro) via
// Supabase Storage — bucket public « site-media ». Repli automatique sur le
// dossier public/ local si le bucket n'est pas encore disponible.
import { createAdminClient } from "@/lib/supabase/admin";

export const MEDIA_BUCKET = "site-media";

export type MediaFolder = "galerie" | "packs" | "videos/showcase" | "videos";

export async function ensureMediaBucket() {
  const supabase = createAdminClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === MEDIA_BUCKET)) return true;
  const { error } = await supabase.storage.createBucket(MEDIA_BUCKET, { public: true });
  if (error) {
    // Déjà existant (course) ou permission manquante : on tente de lister.
    const probe = await supabase.storage.from(MEDIA_BUCKET).list("", { limit: 1 });
    return !probe.error;
  }
  return true;
}

export async function listMedia(folder: MediaFolder): Promise<{ name: string; url: string }[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.storage.from(MEDIA_BUCKET).list(folder, {
    limit: 200,
    sortBy: { column: "name", order: "asc" },
  });
  const files = (data ?? []).filter(
    (f) => !f.name.startsWith(".") && /\.(jpe?g|png|webp|avif|mp4|mov|webm)$/i.test(f.name)
  );
  return files.map((f) => ({
    name: f.name,
    url: supabase.storage.from(MEDIA_BUCKET).getPublicUrl(`${folder}/${f.name}`).data.publicUrl,
  }));
}

export async function uploadMedia(
  folder: MediaFolder,
  file: File
): Promise<{ ok: boolean; error?: string }> {
  const ok = await ensureMediaBucket();
  if (!ok) return { ok: false, error: "Bucket de médias indisponible." };
  const safe = file.name.replace(/[^\w.\-]+/g, "-").toLowerCase();
  const path = `${folder}/${Date.now()}-${safe}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteMedia(folder: MediaFolder, name: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([`${folder}/${name}`]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------- Ordre d'affichage (stocké dans le bucket, _ordre.json) ----------

type MediaOrder = Record<string, string[]>; // clé : nom de fichier → position implicite par index

export async function getOrder(folder: MediaFolder): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.storage.from(MEDIA_BUCKET).download(`${folder}/_ordre.json`);
  if (!data) return [];
  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function saveOrder(folder: MediaFolder, names: string[]): Promise<{ ok: boolean; error?: string }> {
  await ensureMediaBucket();
  const supabase = createAdminClient();
  const body = JSON.stringify(names);
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(`${folder}/_ordre.json`, body, {
      contentType: "application/json",
      upsert: true,
    });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------- Fichiers locaux (public/) : liste, import, suppression ----------

const LOCAL_DIRS: Record<MediaFolder, string> = {
  galerie: "public/galerie",
  packs: "public/images/packs",
 "videos/showcase": "public/videos/showcase",
  videos: "public/videos",
};

export type MediaItem = {
  name: string;
  url: string;
  origin: "storage" | "local";
};

export function listLocalMedia(folder: MediaFolder): MediaItem[] {
  try {
    const { readdirSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    const dir = join(process.cwd(), LOCAL_DIRS[folder]);
    return readdirSync(dir)
      .filter((f) => !f.startsWith(".") && /\.(jpe?g|png|webp|avif|mp4|mov|webm)$/i.test(f))
      .sort()
      .map((name) => ({
        name,
        url: `${LOCAL_DIRS[folder].replace("public", "")}/${encodeURIComponent(name)}`,
        origin: "local" as const,
      }));
  } catch {
    return [];
  }
}

export function deleteLocalMedia(folder: MediaFolder, name: string): { ok: boolean; error?: string } {
  try {
    const { unlinkSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    unlinkSync(join(process.cwd(), LOCAL_DIRS[folder], name));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Suppression impossible." };
  }
}

export async function importLocalToStorage(
  folder: MediaFolder,
  name: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    const bytes = readFileSync(join(process.cwd(), LOCAL_DIRS[folder], name));
    await ensureMediaBucket();
    const supabase = createAdminClient();
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const mime =
      ["jpg", "jpeg"].includes(ext) ? "image/jpeg"
      : ext === "png" ? "image/png"
      : ext === "webp" ? "image/webp"
      : ext === "avif" ? "image/avif"
      : ext === "mp4" ? "video/mp4"
      : ext === "mov" ? "video/quicktime"
      : "video/webm";
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(`${folder}/${name}`, bytes, { contentType: mime, upsert: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import impossible." };
  }
}

// Gestion des médias du site (galerie photos, vidéos showcase, héro) via
// Supabase Storage — bucket public « site-media ». Repli automatique sur le
// dossier public/ local si le bucket n'est pas encore disponible.
import { createAdminClient } from "@/lib/supabase/admin";
import { readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

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

// ---------- Fichiers d'état JSON : lecture hors cache CDN ----------
// Le CDN de Supabase met les objets en cache ~1 h (cacheControl par défaut
// 3600). Les fichiers d'état (_ordre, _credits, _accueil, _packs) sont
// réécrits par l'admin : une lecture passant par le CDN peut renvoyer
// jusqu'à une heure l'ancienne version — ce qui masquait les enregistrements
// et faisait écraser les modifications récentes par les sauvegardes
// suivantes (lire-vieux → réécrire-tout). On lit donc en direct avec un
// paramètre d'URL unique (nouvelle clé de cache CDN) et cache: "no-store".
async function downloadStateJson<T>(path: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const bust = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  try {
    const res = await fetch(
      `${url.replace(/\/$/, "")}/storage/v1/object/site-media/${path}?cb=${bust}`,
      { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
    if (!res.ok) return null;
    return (JSON.parse(await res.text())) as T;
  } catch {
    return null;
  }
}

// Les écritures d'état font lire-modifier-écrire le même fichier : deux
// requêtes simultanées pourraient s'écraser mutuellement. On les sérialise.
let stateWriteQueue: Promise<unknown> = Promise.resolve();
function enqueueStateWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = stateWriteQueue.then(task, task);
  stateWriteQueue = run.catch(() => {});
  return run;
}

// ---------- Ordre d'affichage (stocké dans le bucket, _ordre.json) ----------

export async function getOrder(folder: MediaFolder): Promise<string[]> {
  const parsed = await downloadStateJson<unknown>(`${folder}/_ordre.json`);
  if (parsed === null) return [];
  return Array.isArray(parsed) ? parsed.map(String) : [];
}

export async function saveOrder(folder: MediaFolder, names: string[]): Promise<{ ok: boolean; error?: string }> {
  await ensureMediaBucket();
  const supabase = createAdminClient();
  const body = JSON.stringify(names);
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(`${folder}/_ordre.json`, body, {
      contentType: "application/json",
      cacheControl: "0",
      upsert: true,
    });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------- Sélection « accueil » (stockée dans le bucket, _accueil.json) ----
// Pour les vidéos showcase : liste des fichiers affichés dans le carrousel
// « En action » de la page d'accueil. Fichier absent → tout est affiché
// (comportement historique, rétrocompatible).
export async function getHomeSelection(folder: MediaFolder): Promise<string[] | null> {
  const parsed = await downloadStateJson<unknown>(`${folder}/_accueil.json`);
  if (parsed === null) return null;
  return Array.isArray(parsed) ? parsed.map(String) : null;
}

export async function saveHomeSelection(
  folder: MediaFolder,
  names: string[]
): Promise<{ ok: boolean; error?: string }> {
  await ensureMediaBucket();
  const supabase = createAdminClient();
  const body = JSON.stringify(names);
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(`${folder}/_accueil.json`, body, {
      contentType: "application/json",
      cacheControl: "0",
      upsert: true,
    });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------- Crédits média (stockés dans le bucket, _credits.json) ----------
// Associe des noms de fichiers à un photographe et/ou à un lieu.
// Shape : { photographers: { "Jeanne Bastien": [fichiers...] }, lieux: { "Blois": [...] } }
// (compat : ancien fichier plat { "Jeanne Bastien": [...] } = photographes)

export type MediaCredits = Record<string, string[]>;

export type MediaCreditsBundle = {
  photographers: MediaCredits;
  lieux: MediaCredits;
};

export async function getCreditsBundle(folder: MediaFolder): Promise<MediaCreditsBundle> {
  const parsed = await downloadStateJson<Record<string, unknown>>(`${folder}/_credits.json`);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { photographers: {}, lieux: {} };
  }
  if (parsed.photographers || parsed.lieux) {
    return {
      photographers: (parsed.photographers as MediaCredits) ?? {},
      lieux: (parsed.lieux as MediaCredits) ?? {},
    };
  }
  // Ancien format : mapping plat photographe → photos.
  return { photographers: parsed as MediaCredits, lieux: {} };
}

// Enregistre une seule section (photographers ou lieux) en fusionnant avec
// le bundle existant — évite qu'un enregistrement écrase l'autre.
export async function saveCreditsSection(
  folder: MediaFolder,
  section: "photographers" | "lieux",
  credits: MediaCredits
): Promise<{ ok: boolean; error?: string }> {
  return enqueueStateWrite(async () => {
    await ensureMediaBucket();
    const bundle = await getCreditsBundle(folder);
    bundle[section] = credits;
    return uploadCreditsBundle(folder, bundle);
  });
}

// Attribue photographe et/ou lieu à UNE photo : retire la photo de toutes
// les entrées existantes puis l'ajoute aux nouvelles (créées si besoin).
export async function setPhotoCredit(
  folder: MediaFolder,
  name: string,
  photographer: string,
  lieu: string
): Promise<{ ok: boolean; error?: string }> {
  return enqueueStateWrite(async () => {
    await ensureMediaBucket();
    const bundle = await getCreditsBundle(folder);

    const removeFrom = (map: MediaCredits) => {
      for (const key of Object.keys(map)) {
        map[key] = (map[key] ?? []).filter((n) => n !== name);
        if (map[key].length === 0) delete map[key];
      }
    };
    removeFrom(bundle.photographers);
    removeFrom(bundle.lieux);

    const p = photographer.trim();
    if (p) (bundle.photographers[p] ||= []).push(name);
    const l = lieu.trim();
    if (l) (bundle.lieux[l] ||= []).push(name);

    return uploadCreditsBundle(folder, bundle);
  });
}

async function uploadCreditsBundle(
  folder: MediaFolder,
  bundle: MediaCreditsBundle
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(`${folder}/_credits.json`, JSON.stringify(bundle), {
      contentType: "application/json",
      cacheControl: "0",
      upsert: true,
    });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------- Visuels des packs (rattachement média → pack) ----------
// Stocké dans le bucket, dossier « packs », fichier _packs.json :
// { "Pack Deluxe": { image?: url, video?: url }, ... }
// À défaut d'entrée pour un pack, le visuel par défaut du code s'applique.
export type PackMediaEntry = { image?: string; video?: string };
export type PackMediaOverrides = Record<string, PackMediaEntry>;

export async function getPackOverrides(): Promise<PackMediaOverrides> {
  const parsed = await downloadStateJson<PackMediaOverrides>("packs/_packs.json");
  return parsed && typeof parsed === "object" ? parsed : {};
}

/** Affecte (url) ou retire (null) un média image/vidéo d'un pack. */
export async function savePackOverride(
  packName: string,
  field: "image" | "video",
  url: string | null
): Promise<{ ok: boolean; error?: string }> {
  return enqueueStateWrite(async () => {
    await ensureMediaBucket();
    const supabase = createAdminClient();
    const current = await getPackOverrides();
    const entry: PackMediaEntry = { ...(current[packName] ?? {}) };
    if (url) entry[field] = url;
    else delete entry[field];
    if (entry.image || entry.video) current[packName] = entry;
    else delete current[packName];
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload("packs/_packs.json", JSON.stringify(current), {
        contentType: "application/json",
        cacheControl: "0",
        upsert: true,
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
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
    // Le commentaire est placé DANS l'appel à join() : c'est ce que Turbopack
    // exige pour ne pas tracer tout le projet (et copier public/ + node_modules
    // dans chaque déploiement).
    const dir = join(/* turbopackIgnore: true */ process.cwd(), LOCAL_DIRS[folder]);
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
    unlinkSync(join(/* turbopackIgnore: true */ process.cwd(), LOCAL_DIRS[folder], name));
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
    const bytes = readFileSync(join(/* turbopackIgnore: true */ process.cwd(), LOCAL_DIRS[folder], name));
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

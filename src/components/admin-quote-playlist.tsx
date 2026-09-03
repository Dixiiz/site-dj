import { downloadQuoteFile } from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";

type Track = {
  id: string;
  moment: string;
  title: string;
  artist: string | null;
  kind: string;
  preview_url: string | null;
  artwork_url: string | null;
};

type FileRow = {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  moment: string | null;
};

const DANCE = "Soirée / Piste de danse";
const FIXED_MOMENTS = [
  "Cérémonie laïque",
  "Entrée des mariés",
  "Cocktail / Vin d'honneur",
  "Repas",
  "Ouverture de bal",
  "Anniversaires & temps forts",
];

function sizeLabel(bytes: number | null) {
  if (!bytes) return "";
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.round(bytes / 1024)} Ko`;
}

function fileIcon(mime: string | null) {
  if (mime?.startsWith("video")) return "🎬";
  if (mime?.startsWith("audio")) return "🎵";
  return "📄";
}

function trackRow(track: Track) {
  return (
    <li
      key={track.id}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm sm:gap-3"
    >
      {track.artwork_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={track.artwork_url}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-md object-cover"
        />
      ) : null}
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate">
          <span className="font-medium">{track.title}</span>
          {track.artist ? (
            <span className="text-muted-foreground"> — {track.artist}</span>
          ) : null}
        </p>
      </div>
      {track.preview_url ? (
        <audio controls preload="none" src={track.preview_url} className="h-8 w-full min-w-0 sm:w-44" />
      ) : null}
    </li>
  );
}

function fileRow(quoteId: string, file: FileRow) {
  return (
    <li
      key={file.id}
      className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs sm:gap-3"
    >
      <span className="shrink-0">{fileIcon(file.mime_type)}</span>
      <div className="min-w-0 flex-1 basis-32">
        <p className="truncate font-medium">{file.name}</p>
        <p className="text-[11px] text-muted-foreground">{sizeLabel(file.size_bytes)}</p>
      </div>
      <form action={downloadQuoteFile}>
        <input type="hidden" name="quote_id" value={quoteId} />
        <input type="hidden" name="file_id" value={file.id} />
        <Button type="submit" variant="outline" size="sm">
          ⬇
        </Button>
      </form>
    </li>
  );
}

// Playlist du devis : même présentation en 2 colonnes que le client.
export async function AdminQuotePlaylist({ quoteId }: { quoteId: string }) {
  const supabase = createAdminClient();
  const [{ data: tracks }, { data: files }] = await Promise.all([
    supabase
      .from("playlist_tracks")
      .select("id, moment, title, artist, kind, preview_url, artwork_url")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: true }),
    supabase
      .from("quote_files")
      .select("id, name, mime_type, size_bytes, moment")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: true }),
  ]);

  const all = tracks ?? [];
  const allFiles = files ?? [];
  const dance = all.filter((t) => t.moment === DANCE && t.kind === "souhait");
  const wishes = all.filter((t) => t.kind === "souhait");
  const danceBlacklist = all.filter(
    (t) => t.moment === DANCE && t.kind === "blacklist"
  );
  const danceFiles = allFiles.filter((f) => f.moment === DANCE);
  const miscFiles = allFiles.filter((f) => !f.moment);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {/* Gauche : soirée / danse + blacklist */}
      <div className="rounded-xl border border-white/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium text-accent">🎵 Soirée / Piste de danse</h3>
          <span className="text-xs text-muted-foreground">{dance.length}/30 titres</span>
        </div>

        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-accent">
          ▶ À passer ({dance.length})
        </p>
        {dance.length > 0 ? (
          <ul className="mt-2 space-y-2">{dance.map(trackRow)}</ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Aucun titre.</p>
        )}

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-red-400">
          🚫 À ne PAS passer ({danceBlacklist.length})
        </p>
        {danceBlacklist.length > 0 ? (
          <ul className="mt-2 space-y-2">{danceBlacklist.map(trackRow)}</ul>
        ) : (
          <p className="mt-2 text-xs text-red-400/70">Aucune musique blacklistée.</p>
        )}

        {danceFiles.length > 0 ? (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              📎 Fichiers de la soirée
            </p>
            <ul className="mt-2 space-y-1.5">{danceFiles.map((f) => fileRow(quoteId, f))}</ul>
          </>
        ) : null}
      </div>

      {/* Droite : chaque temps fort avec ses musiques et ses fichiers */}
      <div className="space-y-4">
        {FIXED_MOMENTS.map((moment) => {
          const momentTracks = all.filter(
            (t) => t.kind === "souhait" && t.moment === moment
          );
          const momentFiles = allFiles.filter((f) => f.moment === moment);
          if (momentTracks.length === 0 && momentFiles.length === 0) return null;
          return (
            <div key={moment} className="rounded-xl border border-white/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-accent">{moment}</h3>
                <span className="text-xs text-muted-foreground">
                  {momentTracks.length}/4 musique{momentTracks.length > 1 ? "s" : ""}
                </span>
              </div>
              {momentTracks.length > 0 ? (
                <ul className="mt-3 space-y-2">{momentTracks.map(trackRow)}</ul>
              ) : null}
              {momentFiles.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {momentFiles.map((f) => fileRow(quoteId, f))}
                </ul>
              ) : null}
            </div>
          );
        })}

        {/* Temps forts personnalisés créés par le client */}
        {[
          ...new Set(
            wishes
              .map((t) => t.moment)
              .filter((m) => m !== DANCE && !(FIXED_MOMENTS as string[]).includes(m))
          ),
        ].map((moment) => {
          const momentTracks = wishes.filter((t) => t.moment === moment);
          const momentFiles = allFiles.filter((f) => f.moment === moment);
          return (
            <div key={moment} className="rounded-xl border border-white/10 p-4">
              <h3 className="font-medium text-accent">{moment} ✨</h3>
              <ul className="mt-3 space-y-2">{momentTracks.map(trackRow)}</ul>
              {momentFiles.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {momentFiles.map((f) => fileRow(quoteId, f))}
                </ul>
              ) : null}
            </div>
          );
        })}

        {miscFiles.length > 0 ? (
          <div className="rounded-xl border border-white/10 p-4">
            <h3 className="font-medium text-muted-foreground">📎 Autres fichiers</h3>
            <ul className="mt-3 space-y-1.5">{miscFiles.map((f) => fileRow(quoteId, f))}</ul>
          </div>
        ) : null}

        {all.length === 0 && allFiles.length === 0 ? (
          <div className="rounded-xl border border-white/10 p-4 text-sm text-muted-foreground">
            Aucune musique ni fichier pour le moment.
          </div>
        ) : null}
      </div>
    </div>
  );
}


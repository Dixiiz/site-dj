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

// Playlist du devis, groupée par temps fort + blacklist (même présentation que le client).
export async function AdminQuotePlaylist({ quoteId }: { quoteId: string }) {
  const supabase = createAdminClient();
  const { data: tracks } = await supabase
    .from("playlist_tracks")
    .select("id, moment, title, artist, kind, preview_url, artwork_url")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: true });

  const all = tracks ?? [];
  const wishes = all.filter((t) => t.kind === "souhait");
  const blacklist = all.filter((t) => t.kind === "blacklist");
  const moments = [...new Set(wishes.map((t) => t.moment))];

  const row = (track: Track) => (
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

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Musiques ({all.length})
      </h3>
      {all.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune musique pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {moments.map((moment) => {
            const momentTracks = wishes.filter((t) => t.moment === moment);
            return (
              <div key={moment}>
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {moment}{" "}
                  <span className="text-muted-foreground">({momentTracks.length})</span>
                </p>
                <ul className="mt-2 space-y-2">{momentTracks.map(row)}</ul>
              </div>
            );
          })}
          {blacklist.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                ⚠ À ne PAS passer ({blacklist.length})
              </p>
              <ul className="mt-2 space-y-2">{blacklist.map(row)}</ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

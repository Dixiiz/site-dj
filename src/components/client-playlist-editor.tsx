"use client";

import { useTransition } from "react";
import { addPlaylistTrack, removePlaylistTrack } from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const PLAYLIST_MOMENTS = [
  "Cérémonie laïque",
  "Cocktail / Vin d'honneur",
  "Repas",
  "Ouverture de bal",
  "Soirée / Piste de danse",
  "Anniversaires & temps forts",
];

type Track = {
  id: string;
  moment: string;
  title: string;
  artist: string | null;
  kind: string;
  preview_url: string | null;
  artwork_url: string | null;
};

export function ClientPlaylistEditor({
  quoteId,
  tracks,
}: {
  quoteId: string;
  tracks: Track[];
}) {
  const [pendingAdd, startAdd] = useTransition();
  const [pendingRemove, startRemove] = useTransition();

  const wishes = tracks.filter((t) => t.kind === "souhait");
  const blacklist = tracks.filter((t) => t.kind === "blacklist");

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-medium">Musiques</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choisissez vos titres pour chaque temps fort, et ceux à éviter absolument.
      </p>

      {/* Ajout */}
      <form
        action={(formData) => startAdd(async () => void (await addPlaylistTrack(formData)))}
        className="mt-4 grid gap-3 sm:grid-cols-2"
      >
        <input type="hidden" name="quote_id" value={quoteId} />
        <div className="space-y-1.5">
          <Label htmlFor="kind">Type</Label>
          <select
            id="kind"
            name="kind"
            className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
          >
            <option value="souhait">Souhait (à passer)</option>
            <option value="blacklist">À ne PAS passer</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="moment">Temps fort</Label>
          <select
            id="moment"
            name="moment"
            className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
          >
            {PLAYLIST_MOMENTS.map((moment) => (
              <option key={moment} value={moment}>
                {moment}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">Titre *</Label>
          <Input id="title" name="title" required placeholder="Ex : Can't Help Falling in Love" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="artist">Artiste</Label>
          <Input id="artist" name="artist" placeholder="Ex : Elvis Presley" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={pendingAdd}>
            {pendingAdd ? "Ajout…" : "Ajouter à ma playlist"}
          </Button>
        </div>
      </form>

      {/* Souhaits */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-accent">
          Mes souhaits ({wishes.length})
        </h3>
        <ul className="mt-2 space-y-2">
          {wishes.length === 0 ? (
            <li className="text-sm text-muted-foreground">Aucun souhait pour le moment.</li>
          ) : null}
          {wishes.map((track) => (
            <TrackRow key={track.id} track={track} quoteId={quoteId} onRemove={startRemove} />
          ))}
        </ul>
      </div>

      {/* Blacklist */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-red-400">
          À ne PAS passer ({blacklist.length})
        </h3>
        <ul className="mt-2 space-y-2">
          {blacklist.length === 0 ? (
            <li className="text-sm text-muted-foreground">Aucune musique blacklistée.</li>
          ) : null}
          {blacklist.map((track) => (
            <TrackRow key={track.id} track={track} quoteId={quoteId} onRemove={startRemove} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function TrackRow({
  track,
  quoteId,
  onRemove,
}: {
  track: Track;
  quoteId: string;
  onRemove: (cb: () => Promise<void>) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm">
      {track.artwork_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={track.artwork_url}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-md object-cover"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate">
          <span className="font-medium">{track.title}</span>
          {track.artist ? <span className="text-muted-foreground"> — {track.artist}</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">{track.moment}</p>
      </div>
      {track.preview_url ? (
        <audio controls preload="none" src={track.preview_url} className="h-8 w-44 shrink-0" />
      ) : null}
      <form
        action={(formData) => onRemove(async () => void (await removePlaylistTrack(formData)))}
      >
        <input type="hidden" name="quote_id" value={quoteId} />
        <input type="hidden" name="track_id" value={track.id} />
        <Button type="submit" variant="outline" size="sm">
          Retirer
        </Button>
      </form>
    </li>
  );
}

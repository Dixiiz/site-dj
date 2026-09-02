"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  addPlaylistTrack,
  removePlaylistTrack,
  searchTrackSuggestions,
  type TrackSuggestion,
} from "@/app/client-actions";
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

  // Recherche de titres : suggestions avec écoute avant sélection.
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TrackSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selected, setSelected] = useState<TrackSuggestion | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      if (query.trim().length < 3) {
        setSuggestions([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      const results = await searchTrackSuggestions(query);
      setSuggestions(results);
      setSearching(false);
      setShowSuggestions(true);
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  function playPreview(previewUrl: string | null, key: string) {
    if (!previewUrl) return;
    audioRef.current?.pause();
    if (previewing === key) {
      setPreviewing(null);
      return;
    }
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    audio.play().catch(() => {});
    setPreviewing(key);
    audio.onended = () => setPreviewing(null);
  }

  function chooseSuggestion(suggestion: TrackSuggestion) {
    setSelected(suggestion);
    setQuery(suggestion.title);
    setShowSuggestions(false);
  }

  const wishes = tracks.filter((t) => t.kind === "souhait");
  const blacklist = tracks.filter((t) => t.kind === "blacklist");

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-medium">Musiques</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tapez un titre : des suggestions avec extrait audio apparaissent — écoutez,
        puis ajoutez.
      </p>

      {/* Ajout */}
      <form
        action={(formData) => {
          startAdd(async () => void (await addPlaylistTrack(formData)));
          setSelected(null);
          setQuery("");
        }}
        className="mt-4 grid gap-3 sm:grid-cols-2"
      >
        <input type="hidden" name="quote_id" value={quoteId} />
        <input type="hidden" name="preview_url" value={selected?.previewUrl ?? ""} />
        <input type="hidden" name="artwork_url" value={selected?.artworkUrl ?? ""} />
        <input type="hidden" name="artist" value={selected?.artist ?? ""} />

        <div className="relative sm:col-span-2">
          <Label htmlFor="title">Titre *</Label>
          <Input
            id="title"
            name="title"
            required
            value={query}
            autoComplete="off"
            placeholder="Ex : Can't Help Falling in Love"
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />

          {showSuggestions && (searching || suggestions.length > 0) ? (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-background shadow-xl">
              {searching ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">Recherche…</li>
              ) : null}
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion.key}
                  className="flex items-center gap-3 border-b border-white/5 px-3 py-2 last:border-0"
                >
                  {suggestion.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={suggestion.artworkUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-md object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{suggestion.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{suggestion.artist}</p>
                  </div>
                  {suggestion.previewUrl ? (
                    <button
                      type="button"
                      onClick={() => playPreview(suggestion.previewUrl, suggestion.key)}
                      className="shrink-0 rounded-full border border-accent/40 px-2.5 py-1 text-xs text-accent transition-colors hover:bg-accent/15"
                    >
                      {previewing === suggestion.key ? "■ Stop" : "▶ Écouter"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => chooseSuggestion(suggestion)}
                    className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/25"
                  >
                    Choisir
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {selected ? (
            <div className="mt-2 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
              {selected.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.artworkUrl}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 rounded-md object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{selected.title}</p>
                <p className="truncate text-xs text-muted-foreground">{selected.artist}</p>
              </div>
              {selected.previewUrl ? (
                <button
                  type="button"
                  onClick={() => playPreview(selected.previewUrl, selected.key)}
                  className="shrink-0 rounded-full border border-accent/40 px-2.5 py-1 text-xs text-accent transition-colors hover:bg-accent/15"
                >
                  {previewing === selected.key ? "■ Stop" : "▶ Réécouter"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

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
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={pendingAdd || !selected}>
            {pendingAdd ? "Ajout…" : "Ajouter à ma playlist"}
          </Button>
          {!selected ? (
            <span className="ml-3 text-xs text-muted-foreground">
              Choisissez une suggestion pour activer l&apos;ajout
            </span>
          ) : null}
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

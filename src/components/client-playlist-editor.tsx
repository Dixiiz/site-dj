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
  const [moment, setMoment] = useState(PLAYLIST_MOMENTS[0]);
  const [kind, setKind] = useState<"souhait" | "blacklist">("souhait");
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

  // Ajout en un clic sur la suggestion (avec le temps fort et le type choisis).
  function addSuggestion(suggestion: TrackSuggestion) {
    const formData = new FormData();
    formData.set("quote_id", quoteId);
    formData.set("moment", moment);
    formData.set("title", suggestion.title);
    formData.set("artist", suggestion.artist);
    formData.set("kind", kind);
    if (suggestion.previewUrl) formData.set("preview_url", suggestion.previewUrl);
    if (suggestion.artworkUrl) formData.set("artwork_url", suggestion.artworkUrl);
    startAdd(async () => void (await addPlaylistTrack(formData)));
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function removeTrack(trackId: string) {
    const formData = new FormData();
    formData.set("quote_id", quoteId);
    formData.set("track_id", trackId);
    startRemove(async () => void (await removePlaylistTrack(formData)));
  }

  const blacklist = tracks.filter((t) => t.kind === "blacklist");

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-medium">Musiques</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tapez un titre : des suggestions avec extrait audio apparaissent — écoutez,
        puis ajoutez.
      </p>

      {/* Choix du contexte d'ajout */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="kind">Type d&apos;ajout</Label>
          <select
            id="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value === "blacklist" ? "blacklist" : "souhait")}
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
            value={moment}
            onChange={(e) => setMoment(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
          >
            {PLAYLIST_MOMENTS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Recherche : un clic sur une suggestion l'ajoute directement */}
        <div
          className="relative sm:col-span-2"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setShowSuggestions(false);
            }
          }}
        >
          <Label htmlFor="title">Titre</Label>
          <div className="relative">
            <Input
              id="title"
              value={query}
              autoComplete="off"
              inputMode="search"
              placeholder="Tapez un titre…"
              className="pr-10"
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowSuggestions(false);
              }}
            />
            {query && !pendingAdd ? (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                ✕
              </button>
            ) : null}
          </div>

          {showSuggestions && (searching || suggestions.length > 0) ? (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-white/10 bg-background shadow-xl">
              {searching ? (
                <li className="px-3 py-2.5 text-sm text-muted-foreground">Recherche…</li>
              ) : null}
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion.key}
                  className="flex flex-wrap items-center gap-2 border-b border-white/5 px-3 py-2.5 last:border-0 sm:gap-3"
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
                  {/* Clic sur le nom = ajout direct dans la catégorie choisie */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addSuggestion(suggestion)}
                    disabled={pendingAdd}
                    className="min-w-0 flex-1 basis-40 rounded-md py-0.5 text-left transition-colors hover:text-accent"
                    title={`Ajouter « ${suggestion.title} » — ${moment}`}
                  >
                    <p className="truncate text-sm font-medium underline decoration-accent/40 underline-offset-2">
                      {suggestion.title}
                      {pendingAdd ? (
                        <span className="ml-2 text-xs font-normal text-accent">Ajout…</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{suggestion.artist}</p>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {suggestion.previewUrl ? (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => playPreview(suggestion.previewUrl, suggestion.key)}
                        className="rounded-full border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/15"
                      >
                        {previewing === suggestion.key ? "■ Stop" : "▶ Écouter"}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* Catégories par temps fort */}
      <div className="mt-8 space-y-6">
        {PLAYLIST_MOMENTS.map((m) => {
          const momentTracks = tracks.filter((t) => t.kind === "souhait" && t.moment === m);
          if (momentTracks.length === 0) return null;
          return (
            <div key={m}>
              <h3 className="text-sm font-medium text-accent">
                {m} <span className="text-muted-foreground">({momentTracks.length})</span>
              </h3>
              <ul className="mt-2 space-y-2">
                {momentTracks.map((track) => (
                  <TrackRow key={track.id} track={track} onRemove={() => removeTrack(track.id)} />
                ))}
              </ul>
            </div>
          );
        })}

        {blacklist.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium text-red-400">
              À ne PAS passer ({blacklist.length})
            </h3>
            <ul className="mt-2 space-y-2">
              {blacklist.map((track) => (
                <TrackRow key={track.id} track={track} onRemove={() => removeTrack(track.id)} />
              ))}
            </ul>
          </div>
        ) : null}

        {tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune musique pour le moment — ajoutez votre premier titre ci-dessus.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function TrackRow({
  track,
  onRemove,
}: {
  track: Track;
  onRemove: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm sm:gap-3">
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
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate">
          <span className="font-medium">{track.title}</span>
          {track.artist ? <span className="text-muted-foreground"> — {track.artist}</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">{track.moment}</p>
      </div>
      {track.preview_url ? (
        <audio
          controls
          preload="none"
          src={track.preview_url}
          className="h-8 w-full min-w-0 sm:w-44"
        />
      ) : null}
      <form action={onRemove} className="ml-auto sm:ml-0">
        <Button type="submit" variant="outline" size="sm">
          Retirer
        </Button>
      </form>
    </li>
  );
}

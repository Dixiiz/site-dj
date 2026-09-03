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

// Les temps forts "fixes" : une section dédiée, 1 à 4 musiques max.
const FIXED_MOMENTS = [
  "Cérémonie laïque",
  "Entrée des mariés",
  "Cocktail / Vin d'honneur",
  "Repas",
  "Ouverture de bal",
  "Anniversaires & temps forts",
];

const DANCE_MOMENT = "Soirée / Piste de danse";

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
  const [pendingRemove, startRemove] = useTransition();

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
        Chaque temps fort a sa section : tapez un titre et touchez la suggestion
        pour l&apos;ajouter. Écoutez avant d&apos;ajouter si vous voulez.
      </p>

      {/* Temps forts : 1 à 4 musiques, une section chacun */}
      <div className="mt-6 space-y-4">
        {FIXED_MOMENTS.map((moment) => (
          <MomentSection
            key={moment}
            quoteId={quoteId}
            moment={moment}
            tracks={tracks.filter((t) => t.kind === "souhait" && t.moment === moment)}
            onRemove={removeTrack}
          />
        ))}
      </div>

      {/* Soirée / danse : souhait ou blacklist, sans limite */}
      <DanceSection
        quoteId={quoteId}
        danceTracks={tracks.filter(
          (t) => t.moment === DANCE_MOMENT && t.kind === "souhait"
        )}
        blacklist={blacklist}
        onRemove={removeTrack}
      />
    </section>
  );
}

// Hook de recherche partagé (suggestions + lecture d'extraits).
function useTrackSearch() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TrackSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
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
    }, 300);
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

  return {
    query,
    setQuery,
    suggestions,
    setSuggestions,
    searching,
    showSuggestions,
    setShowSuggestions,
    previewing,
    playPreview,
  };
}

// Construit le FormData d'ajout pour une suggestion.
function buildAddFormData(
  quoteId: string,
  moment: string,
  kind: "souhait" | "blacklist",
  suggestion: TrackSuggestion
) {
  const formData = new FormData();
  formData.set("quote_id", quoteId);
  formData.set("moment", moment);
  formData.set("title", suggestion.title);
  formData.set("artist", suggestion.artist);
  formData.set("kind", kind);
  if (suggestion.previewUrl) formData.set("preview_url", suggestion.previewUrl);
  if (suggestion.artworkUrl) formData.set("artwork_url", suggestion.artworkUrl);
  return formData;
}

// Recherche + ajout en un clic, pour une section donnée.
function SectionSearch({
  quoteId,
  moment,
  kind,
  disabled,
  disabledLabel,
}: {
  quoteId: string;
  moment: string;
  kind: "souhait" | "blacklist";
  disabled?: boolean;
  disabledLabel?: string;
}) {
  const [pendingAdd, startAdd] = useTransition();
  const {
    query,
    setQuery,
    suggestions,
    setSuggestions,
    searching,
    showSuggestions,
    setShowSuggestions,
    previewing,
    playPreview,
  } = useTrackSearch();

  function add(suggestion: TrackSuggestion) {
    startAdd(async () =>
      void (await addPlaylistTrack(buildAddFormData(quoteId, moment, kind, suggestion)))
    );
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  }

  return (
    <div
      className="relative mt-3"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setShowSuggestions(false);
        }
      }}
    >
      <div className="relative">
        <Input
          value={query}
          autoComplete="off"
          inputMode="search"
          placeholder={disabled ? disabledLabel ?? "Complet" : "Tapez un titre…"}
          disabled={disabled}
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
            aria-label="Effacer"
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
      {/* Suggestions : un clic sur le nom ajoute directement */}
      {showSuggestions && (searching || suggestions.length > 0) && !disabled ? (
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
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(suggestion)}
                disabled={pendingAdd}
                className="min-w-0 flex-1 basis-40 rounded-md py-0.5 text-left transition-colors hover:text-accent"
                title={`Ajouter « ${suggestion.title} »`}
              >
                <p className="truncate text-sm font-medium underline decoration-accent/40 underline-offset-2">
                  {suggestion.title}
                  {pendingAdd ? (
                    <span className="ml-2 text-xs font-normal text-accent">Ajout…</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">{suggestion.artist}</p>
              </button>
              {suggestion.previewUrl ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => playPreview(suggestion.previewUrl, suggestion.key)}
                  className="shrink-0 rounded-full border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/15"
                >
                  {previewing === suggestion.key ? "■ Stop" : "▶ Écouter"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// Section d'un temps fort fixe : 1 à 4 musiques maximum.
function MomentSection({
  quoteId,
  moment,
  tracks,
  onRemove,
}: {
  quoteId: string;
  moment: string;
  tracks: Track[];
  onRemove: (trackId: string) => void;
}) {
  const full = tracks.length >= 4;
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-accent">{moment}</h3>
        <span className="text-xs text-muted-foreground">
          {tracks.length}/4 musique{tracks.length > 1 ? "s" : ""}
        </span>
      </div>
      {tracks.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {tracks.map((track) => (
            <TrackRow key={track.id} track={track} onRemove={() => onRemove(track.id)} />
          ))}
        </ul>
      ) : null}
      {full ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Complet (4 max) — retirez un titre pour en changer.
        </p>
      ) : (
        <SectionSearch quoteId={quoteId} moment={moment} kind="souhait" />
      )}
    </div>
  );
}

// Section danse : souhaits illimités + blacklist, chacune avec sa recherche.
function DanceSection({
  quoteId,
  danceTracks,
  blacklist,
  onRemove,
}: {
  quoteId: string;
  danceTracks: Track[];
  blacklist: Track[];
  onRemove: (trackId: string) => void;
}) {
  const [danceKind, setDanceKind] = useState<"souhait" | "blacklist">("souhait");

  return (
    <div className="mt-4 rounded-xl border border-white/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-accent">Soirée / Piste de danse</h3>
        <div className="flex gap-1 rounded-lg border border-white/10 p-1 text-xs">
          <button
            type="button"
            onClick={() => setDanceKind("souhait")}
            className={`rounded-md px-3 py-1 transition-colors ${
              danceKind === "souhait"
                ? "bg-accent/15 font-medium text-accent"
                : "text-muted-foreground"
            }`}
          >
            ▶ À passer
          </button>
          <button
            type="button"
            onClick={() => setDanceKind("blacklist")}
            className={`rounded-md px-3 py-1 transition-colors ${
              danceKind === "blacklist"
                ? "bg-red-500/15 font-medium text-red-400"
                : "text-muted-foreground"
            }`}
          >
            🚫 Blacklist
          </button>
        </div>
      </div>

      {danceKind === "souhait" ? (
        <>
          <SectionSearch quoteId={quoteId} moment={DANCE_MOMENT} kind="souhait" />
          {danceTracks.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {danceTracks.map((track) => (
                <TrackRow key={track.id} track={track} onRemove={() => onRemove(track.id)} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Aucun titre pour la piste de danse — ajoutez-en autant que vous voulez !
            </p>
          )}
        </>
      ) : (
        <>
          <SectionSearch
            quoteId={quoteId}
            moment={DANCE_MOMENT}
            kind="blacklist"
            disabledLabel="Blacklist"
          />
          {blacklist.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {blacklist.map((track) => (
                <TrackRow key={track.id} track={track} onRemove={() => onRemove(track.id)} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-red-400/80">
              Aucune musique blacklistée — ajoutez celles à éviter absolument.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function TrackRow({ track, onRemove }: { track: Track; onRemove: () => void }) {
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


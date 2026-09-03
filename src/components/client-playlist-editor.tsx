"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  addPlaylistTrack,
  deleteQuoteMoment,
  removePlaylistTrack,
  searchTrackSuggestions,
  type TrackSuggestion,
} from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MomentFiles } from "@/components/client-files";

type PlaylistFile = {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  moment: string | null;
  from_admin?: boolean;
};

// Le type d'événement (mariage / anniversaire) détermine les temps forts
// : la liste est passée en prop depuis la page du devis.
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
  files,
  moments,
}: {
  quoteId: string;
  tracks: Track[];
  files: PlaylistFile[];
  moments: string[];
}) {
  const [activeMoment, setActiveMoment] = useState(moments[0]);
  // Temps forts personnalisés créés par le client (ouverture du dessert…)
  const allCustom = [
    ...new Set(
      tracks
        .map((t) => t.moment)
        .filter((m) => m !== DANCE_MOMENT && !moments.includes(m))
    ),
  ];
  const [customMoments, setCustomMoments] = useState<string[]>(allCustom);
  const [newMoment, setNewMoment] = useState("");
  const [pendingRemove, startRemove] = useTransition();

  function removeTrack(trackId: string) {
    const formData = new FormData();
    formData.set("quote_id", quoteId);
    formData.set("track_id", trackId);
    startRemove(async () => void (await removePlaylistTrack(formData)));
  }

  function removeCustomMoment(moment: string) {
    const formData = new FormData();
    formData.set("quote_id", quoteId);
    formData.set("moment", moment);
    startRemove(async () => void (await deleteQuoteMoment(formData)));
    setCustomMoments((current) => current.filter((m) => m !== moment));
    if (activeMoment === moment) setActiveMoment(moments[0]);
  }

  const blacklist = tracks.filter((t) => t.kind === "blacklist");

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-medium">Musiques</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Chaque temps fort a sa section : tapez un titre et touchez la suggestion
        pour l&apos;ajouter. Écoutez avant d&apos;ajouter si vous voulez.
      </p>

      {/* Deux colonnes : danse à gauche, temps forts à droite */}
      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
        <DanceSection
          quoteId={quoteId}
          danceTracks={tracks.filter(
            (t) => t.moment === DANCE_MOMENT && t.kind === "souhait"
          )}
          blacklist={blacklist}
          files={files.filter((f) => f.moment === DANCE_MOMENT)}
          onRemove={removeTrack}
        />

        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="font-medium text-accent">Temps forts</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[...moments, ...customMoments].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setActiveMoment(m)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  activeMoment === m
                    ? "border-accent bg-accent/15 font-medium text-accent"
                    : "border-white/10 text-muted-foreground hover:border-accent/40"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <MomentSection
            key={activeMoment}
            quoteId={quoteId}
            moment={activeMoment}
            tracks={tracks.filter(
              (t) => t.kind === "souhait" && t.moment === activeMoment
            )}
            files={files.filter((f) => f.moment === activeMoment)}
            onRemove={removeTrack}
            onDelete={() => {
              if (
                window.confirm(
                  `Supprimer le temps fort « ${activeMoment} » ainsi que ses musiques et fichiers ?`
                )
              ) {
                removeCustomMoment(activeMoment);
              }
            }}
          />

          {/* Temps forts personnalisés (supprimables) */}
          {customMoments.map((moment) => (
            <MomentSection
              key={moment}
              quoteId={quoteId}
              moment={moment}
              tracks={tracks.filter(
                (t) => t.kind === "souhait" && t.moment === moment
              )}
              files={files.filter((f) => f.moment === moment)}
              onRemove={removeTrack}
              onDelete={() => removeCustomMoment(moment)}
            />
          ))}

          {/* Créer un temps fort supplémentaire */}
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newMoment.trim();
              if (!name || moments.includes(name) || customMoments.includes(name)) return;
              setCustomMoments((current) => [...current, name]);
              setActiveMoment(name);
              setNewMoment("");
            }}
          >
            <Input
              value={newMoment}
              onChange={(e) => setNewMoment(e.target.value)}
              placeholder="Autre temps fort ? (ex : Fontaine de champagne)"
              className="text-xs"
              maxLength={40}
            />
            <Button type="submit" size="sm" variant="outline" disabled={!newMoment.trim()}>
              + Créer
            </Button>
          </form>
        </div>
      </div>
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
      if (query.trim().length < 2) {
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

  // Stoppe la préécoute en cours (ex. quand la suggestion est ajoutée et disparaît).
  function stopPreview() {
    audioRef.current?.pause();
    audioRef.current = null;
    setPreviewing(null);
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
    stopPreview,
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
    stopPreview,
  } = useTrackSearch();

  function add(suggestion: TrackSuggestion) {
    startAdd(async () =>
      void (await addPlaylistTrack(buildAddFormData(quoteId, moment, kind, suggestion)))
    );
    stopPreview();
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

// Contenu d'un temps fort fixe : 1 à 4 musiques maximum (affiché via onglets).
function MomentSection({
  quoteId,
  moment,
  tracks,
  files,
  onRemove,
  onDelete,
}: {
  quoteId: string;
  moment: string;
  tracks: Track[];
  files: PlaylistFile[];
  onRemove: (trackId: string) => void;
  onDelete?: () => void;
}) {
  const full = tracks.length >= 4;
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground">{moment}</h4>
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {tracks.length}/4 musique{tracks.length > 1 ? "s" : ""}
          </span>
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              title="Supprimer ce temps fort"
              aria-label={`Supprimer le temps fort ${moment}`}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-red-500/40 text-xs text-red-400 transition-colors hover:bg-red-500/15"
            >
              ✕
            </button>
          ) : null}
        </span>
      </div>
      {tracks.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {tracks.map((track) => (
            <TrackRow key={track.id} track={track} onRemove={() => onRemove(track.id)} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Aucune musique pour ce temps fort.
        </p>
      )}
      {full ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Complet (4 max) — retirez un titre pour en changer.
        </p>
      ) : (
        <SectionSearch quoteId={quoteId} moment={moment} kind="souhait" />
      )}
      <MomentFiles quoteId={quoteId} moment={moment} files={files} />
    </div>
  );
}

// Section danse : 30 souhaits max + blacklist, chacune avec sa recherche.
function DanceSection({
  quoteId,
  danceTracks,
  blacklist,
  files,
  onRemove,
}: {
  quoteId: string;
  danceTracks: Track[];
  blacklist: Track[];
  files: PlaylistFile[];
  onRemove: (trackId: string) => void;
}) {
  const [danceKind, setDanceKind] = useState<"souhait" | "blacklist">("souhait");
  const full = danceTracks.length >= 30;

  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-accent">🎵 Soirée / Piste de danse</h3>
        <span className="text-xs text-muted-foreground">
          {danceTracks.length}/30 titres
        </span>
      </div>

      <div className="relative mt-3 grid grid-cols-2 gap-1 rounded-lg border border-white/10 p-1 text-xs">
        {/* Curseur qui glisse de gauche à droite */}
        <span
          aria-hidden
          className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md transition-all duration-300 ease-out ${
            danceKind === "blacklist"
              ? "translate-x-[calc(100%+0.5rem)] bg-red-500/25"
              : "translate-x-0 bg-accent/20"
          }`}
        />
        <button
          type="button"
          onClick={() => setDanceKind("souhait")}
          className={`relative z-10 rounded-md px-3 py-1.5 font-medium transition-colors duration-300 ${
            danceKind === "souhait" ? "text-accent" : "text-muted-foreground"
          }`}
        >
          ▶ À passer
        </button>
        <button
          type="button"
          onClick={() => setDanceKind("blacklist")}
          className={`relative z-10 rounded-md px-3 py-1.5 font-medium transition-colors duration-300 ${
            danceKind === "blacklist" ? "text-red-400" : "text-red-400/60"
          }`}
        >
          🚫 À ne PAS passer
        </button>
      </div>

      {danceKind === "souhait" ? (
        <>
          <SectionSearch
            quoteId={quoteId}
            moment={DANCE_MOMENT}
            kind="souhait"
            disabled={full}
            disabledLabel="Complet (30 titres max)"
          />
          {danceTracks.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {danceTracks.map((track) => (
                <TrackRow key={track.id} track={track} onRemove={() => onRemove(track.id)} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Aucun titre pour la piste de danse — ajoutez-en jusqu&apos;à 30 !
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
              Aucune musique à ne PAS passer — ajoutez celles à éviter absolument.
            </p>
          )}
        </>
      )}

      {/* Fichiers rattachés à la soirée / danse */}
      <MomentFiles
        quoteId={quoteId}
        moment={DANCE_MOMENT}
        files={files.filter((f) => f.moment === DANCE_MOMENT)}
      />
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


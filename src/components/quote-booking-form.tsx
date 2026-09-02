"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { fr } from "react-day-picker/locale";
import { toast } from "sonner";
import { estimateTravelFee, searchAddresses, submitQuoteAndBooking } from "@/app/actions";
import { FadeIn } from "@/components/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatEuros } from "@/lib/money";
import { EXTRA_HOUR_RATE_CENTS } from "@/lib/booking-rules";
import type { Formula, QuoteOption } from "@/lib/types";

type TravelState = { distanceKm: number; feeCents: number } | null;

function dateKey(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const END_TIMES = [
  "23:00", "23:30", "00:00", "00:30", "01:00", "01:30",
  "02:00", "02:30", "03:00", "03:30", "04:00", "04:30", "05:00",
];

function isMariageFormula(name: string) {
  return name.toLowerCase().includes("mariage");
}

type PackInfo = {
  name: string;
  priceCents: number;
  baseMinutes: number;
  extraRateCents: number;
  defaultStart: string;
  defaultEnd: string;
};

export function QuoteBookingForm({
  formulas,
  options,
}: {
  formulas: Formula[];
  options: QuoteOption[];
}) {
  const [formulaId, setFormulaId] = useState(formulas[0]?.id ?? "");
  const [pack, setPack] = useState<PackInfo | null>(null);
  const [notes, setNotes] = useState("");
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState(
    formulas[0] && isMariageFormula(formulas[0].name) ? "14:00" : "17:00"
  );
  const [endTime, setEndTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [suggestions, setSuggestions] = useState<{ label: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [travel, setTravel] = useState<TravelState>(null);
  const [travelPending, startTravelTransition] = useTransition();
  const [pending, startTransition] = useTransition();

  // Pré-sélection depuis la section "Nos Formules & Tarifs" (bouton d'un pack).
  useEffect(() => {
    function onSelectPack(event: Event) {
      const detail = (event as CustomEvent<Partial<PackInfo> & { pack?: string }>).detail;
      const packName = detail?.pack;
      if (!packName) return;
      const packKey = packName.toLowerCase();
      const categoryPatterns: RegExp[] = [
        /set dj|clé en main|bar|club|pro/,
        /mariage|essential|deluxe|ultime/,
        /anniversaire|standard|premium/,
      ];
      const match = formulas.find((formula) => {
        const name = formula.name.toLowerCase();
        return (
          (categoryPatterns[0].test(packKey) && categoryPatterns[0].test(name)) ||
          (categoryPatterns[1].test(packKey) && categoryPatterns[1].test(name)) ||
          (categoryPatterns[2].test(packKey) && categoryPatterns[2].test(name))
        );
      });
      if (match) {
        setFormulaId(match.id);
        setOptionIds([]);
      }
      setPack({
        name: packName,
        priceCents: detail?.priceCents ?? match?.price_cents ?? 0,
        baseMinutes: detail?.baseMinutes ?? (isMariageFormula(packName) ? 480 : 360),
        extraRateCents: detail?.extraRateCents ?? EXTRA_HOUR_RATE_CENTS,
        defaultStart: detail?.defaultStart ?? "20:00",
        defaultEnd: detail?.defaultEnd ?? (isMariageFormula(packName) ? "04:00" : "02:00"),
      });
      setStartTime(detail?.defaultStart ?? "20:00");
      setEndTime(detail?.defaultEnd ?? (isMariageFormula(packName) ? "04:00" : "02:00"));
      setNotes((current) =>
        current.includes(packName)
          ? current
          : `Pack souhaité : ${packName}${current ? `\n${current}` : ""}`
      );
    }
    window.addEventListener("propul:select-pack", onSelectPack);
    function onToggleOption(event: Event) {
      const optionName = (event as CustomEvent<{ name: string }>).detail?.name;
      if (!optionName) return;
      const match = options.find(
        (option) => option.name.toLowerCase() === optionName.toLowerCase()
      );
      if (!match) return;
      setOptionIds((current) =>
        current.includes(match.id)
          ? current.filter((id) => id !== match.id)
          : [...current, match.id]
      );
    }
    window.addEventListener("propul:toggle-option", onToggleOption);
    return () => {
      window.removeEventListener("propul:select-pack", onSelectPack);
      window.removeEventListener("propul:toggle-option", onToggleOption);
    };
  }, [formulas, options]);

  const visibleOptions = useMemo(
    () =>
      options.filter(
        (option) => option.formula_id === null || option.formula_id === formulaId
      ),
    [options, formulaId]
  );

  const formula = formulas.find((item) => item.id === formulaId);
  const selectedOptions = visibleOptions.filter((option) =>
    optionIds.includes(option.id)
  );

  // Heure de fin incluse dans le forfait : 03:00 (anniversaire) ou 04:00 (mariage).
  // Le seuil est toujours après minuit : on le ramène lui aussi après 20 h (jour suivant).
  const isMariage = formula?.name.toLowerCase().includes("mariage");
  const cutoffLabel = isMariage ? "04:00" : "03:00";
  const cutoffMinutes = toMinutes(cutoffLabel) + 24 * 60;
  // Départ dès 14 h pour les mariages, 17 h pour le reste (20 h dernier départ).
  const startTimes = useMemo(() => {
    const first = isMariage ? 14 : 17;
    return Array.from({ length: (20 - first) * 2 + 1 }, (_, i) => {
      const minutes = first * 60 + i * 30;
      return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    });
  }, [isMariage]);

  const startMinutes = toMinutes(startTime);
  const endMinutes = endTime ? toMinutes(endTime) : null;
  // Les fins après minuit (00:00–05:00) sont ramenées après 20 h pour comparer.
  const normalizedEndMinutes =
    endMinutes != null && endMinutes < 12 * 60 ? endMinutes + 24 * 60 : endMinutes;
  const invalidOrder =
    normalizedEndMinutes != null && normalizedEndMinutes <= startMinutes;

  // Le prix du pack couvre baseMinutes de prestation ; chaque heure entamée
  // au-delà est facturée au tarif horaire du pack.
  const includedMinutes = pack?.baseMinutes ?? (isMariage ? 480 : 360);
  const extraRateCents = pack?.extraRateCents ?? EXTRA_HOUR_RATE_CENTS;
  const extraHours = useMemo(() => {
    if (normalizedEndMinutes == null || invalidOrder) return 0;
    const past = normalizedEndMinutes - startMinutes - includedMinutes;
    return past > 0 ? Math.ceil(past / 60) : 0;
  }, [normalizedEndMinutes, startMinutes, includedMinutes, invalidOrder]);
  const extraFeeCents = extraHours * extraRateCents;

  const total =
    (pack?.priceCents ?? 0) +
    selectedOptions.reduce((sum, option) => sum + option.price_cents, 0) +
    extraFeeCents +
    (travel?.feeCents ?? 0);

  function toggleOption(id: string, checked: boolean) {
    setOptionIds((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id)
    );
  }

  function onDateChange(date?: Date) {
    setSelectedDate(date);
  }

  // Suggestions d'adresses via action serveur (Nominatim), avec debouncing.
  useEffect(() => {
    if (eventLocation.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const result = await searchAddresses(eventLocation);
      if (result.ok) {
        setSuggestions(result.results.map((label) => ({ label })));
        setShowSuggestions(result.results.length > 0);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [eventLocation]);

  function chooseSuggestion(label: string) {
    setEventLocation(label);
    setShowSuggestions(false);
    setSuggestions([]);
    // Estimation automatique des frais de déplacement, sans clic.
    startTravelTransition(async () => {
      const fd = new FormData();
      fd.set("event_location", label);
      const result = await estimateTravelFee(fd);
      if (result && result.ok) {
        setTravel({ distanceKm: result.estimate.distanceKm, feeCents: result.estimate.feeCents });
      } else if (result && !result.ok) {
        setTravel(null);
        toast.error(result.error);
      }
    });
  }

  function onEstimateTravel() {
    const address = eventLocation.trim();
    if (!address) {
      toast.error("Indique d'abord le lieu de l'événement.");
      return;
    }
    startTravelTransition(async () => {
      const fd = new FormData();
      fd.set("event_location", address);
      const result = await estimateTravelFee(fd);
      if (result && result.ok) {
        setTravel({ distanceKm: result.estimate.distanceKm, feeCents: result.estimate.feeCents });
        toast.success(`Distance estimée : ${result.estimate.distanceKm} km`);
      } else if (result && !result.ok) {
        setTravel(null);
        toast.error(result.error);
      }
    });
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await submitQuoteAndBooking(formData);
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <input type="hidden" name="formula_id" value={formulaId} />
      <input type="hidden" name="event_date" value={selectedDate ? dateKey(selectedDate) : ""} />
      <input type="hidden" name="start_time" value={startTime} />
      <input type="hidden" name="end_time" value={endTime} />
      <input type="hidden" name="extra_hours" value={extraHours} />
      <input type="hidden" name="pack_name" value={pack?.name ?? ""} />
      <input type="hidden" name="pack_price_cents" value={pack?.priceCents ?? ""} />
      <input type="hidden" name="pack_base_minutes" value={pack?.baseMinutes ?? ""} />
      <input type="hidden" name="pack_extra_rate_cents" value={pack?.extraRateCents ?? ""} />
      {optionIds.map((id) => (
        <input key={id} type="hidden" name="option_ids" value={id} />
      ))}
      <input type="hidden" name="travel_distance_km" value={travel?.distanceKm ?? ""} />
      <input type="hidden" name="travel_fee_cents" value={travel?.feeCents ?? ""} />

      <div className="space-y-6">
        <FadeIn>
          <h2 className="mb-3 text-xl font-medium">1. Votre pack</h2>
          {pack ? (
            <div className="glow-hover rounded-xl border border-accent/60 bg-primary/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  <span className="mr-2 text-accent">✓</span>
                  {pack.name}
                </p>
                <Badge>{formatEuros(pack.priceCents)}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {formula?.description}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {Math.round(pack.baseMinutes / 60)} h de prestation incluses —
                modifiable en cliquant sur un autre pack ci-dessus.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("formules-tarifs")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="glow-hover w-full rounded-xl border border-dashed border-accent/50 p-5 text-left transition-colors hover:border-accent"
            >
              <p className="font-medium">Aucun pack sélectionné pour l&apos;instant</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cliquez ici ou choisissez directement un pack dans la section
                « Nos Formules &amp; Tarifs » ci-dessus.
              </p>
            </button>
          )}
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="mb-3 text-xl font-medium">2. Horaires &amp; date</h2>
          <Card>
            <CardContent className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                Disponible 7 jours sur 7, week-end inclus. Départ entre 14 h et 20 h
                pour les mariages, entre 17 h et 20 h pour les autres événements.
                Le prix du pack comprend {Math.round(includedMinutes / 60)} h de
                prestation ; au-delà, chaque heure entamée est facturée{" "}
                {formatEuros(extraRateCents)}.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="start_time_select" className="text-base">
                    Heure de début
                  </Label>
                  <select
                    id="start_time_select"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-background px-3 py-3 text-lg font-medium"
                  >
                    {startTimes.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_time_select" className="text-base">
                    Heure de fin
                  </Label>
                  <select
                    id="end_time_select"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-background px-3 py-3 text-lg font-medium"
                  >
                    <option value="">Choisir…</option>
                    {END_TIMES.filter(
                      (time) =>
                        (toMinutes(time) < 12 * 60
                          ? toMinutes(time) + 24 * 60
                          : toMinutes(time)) > startMinutes
                    ).map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Calendar
                mode="single"
                locale={fr}
                selected={selectedDate}
                onSelect={onDateChange}
                disabled={[{ before: new Date() }]}
                className="w-full"
              />
              {invalidOrder ? (
                <p className="text-sm text-red-400">
                  L&apos;heure de fin doit être après l&apos;heure de début.
                </p>
              ) : extraHours > 0 ? (
                <p className="text-sm text-accent">
                  ⏱ {extraHours} heure{extraHours > 1 ? "s" : ""} supplémentaire
                  {extraHours > 1 ? "s" : ""} (au-delà des{" "}
                  {Math.round(includedMinutes / 60)} h incluses) —{" "}
                  {formatEuros(extraFeeCents)} ajoutés au devis.
                </p>
              ) : endTime ? (
                <p className="text-sm text-muted-foreground">
                  ✅ Cette heure de fin est incluse dans le forfait.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.15} className="grid gap-3 sm:grid-cols-2">
          <h2 className="sm:col-span-2 text-xl font-medium">3. Tes coordonnées</h2>
          <div className="space-y-1.5">
            <Label htmlFor="customer_name">Nom</Label>
            <Input id="customer_name" name="customer_name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer_email">E-mail</Label>
            <Input id="customer_email" name="customer_email" type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer_phone">Téléphone</Label>
            <Input id="customer_phone" name="customer_phone" />
          </div>
          <div className="sm:col-span-2 space-y-1.5 relative">
            <Label htmlFor="event_location">Lieu de réception</Label>
            <div className="flex gap-2">
              <Input
                id="event_location"
                name="event_location"
                placeholder="Adresse ou ville"
                autoComplete="off"
                value={eventLocation}
                onChange={(event) => setEventLocation(event.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={onEstimateTravel}
                disabled={travelPending}
              >
                {travelPending ? "Calcul…" : "Recalculer"}
              </Button>
            </div>
            {showSuggestions && suggestions.length > 0 ? (
              <ul className="absolute z-20 w-full overflow-hidden rounded-lg border border-white/10 bg-card shadow-xl">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.label}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent/10"
                      onClick={() => chooseSuggestion(suggestion.label)}
                    >
                      📍 {suggestion.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {travel ? (
              <p className="text-sm text-muted-foreground">
                Frais de déplacement estimés :{" "}
                {travel.feeCents === 0
                  ? "offerts (30 km gratuits)"
                  : formatEuros(travel.feeCents)}{" "}
                ({travel.distanceKm} km)
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                30 km offerts autour de Huisseau-sur-Cosson, puis 0,80 €/km. Les frais se
                calculent automatiquement dès que vous choisissez un lieu suggéré.
              </p>
            )}
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="notes">Message</Label>
            <Textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ambiance souhaitée, contraintes…"
            />
          </div>
        </FadeIn>
      </div>

      <FadeIn as="aside" delay={0.2} className="lg:sticky lg:top-6 h-fit">
        <Card className="border border-accent/20 shadow-[0_0_40px_-15px_var(--accent)]">
          <CardHeader>
            <CardTitle>Récapitulatif</CardTitle>
            <CardDescription>
              Ta demande est enregistrée et tu reçois une réponse rapide.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between gap-4">
              <span>{pack?.name ?? "Aucun pack sélectionné"}</span>
              <span>{formatEuros(pack?.priceCents ?? 0)}</span>
            </div>
            {selectedOptions.map((option) => (
              <div key={option.id} className="flex justify-between gap-4 text-muted-foreground">
                <span>{option.name}</span>
                <span>{formatEuros(option.price_cents)}</span>
              </div>
            ))}
            {extraHours > 0 ? (
              <div className="flex justify-between gap-4 text-muted-foreground">
                <span>
                  Heures supplémentaires ({extraHours} × {formatEuros(extraRateCents)})
                </span>
                <span>{formatEuros(extraFeeCents)}</span>
              </div>
            ) : null}
            {travel && travel.feeCents > 0 ? (
              <div className="flex justify-between gap-4 text-muted-foreground">
                <span>Frais de déplacement ({travel.distanceKm} km)</span>
                <span>{formatEuros(travel.feeCents)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-medium">
              <span>Total estimé</span>
              <span>{formatEuros(total)}</span>
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={pending || !formulaId || !selectedDate || !endTime || invalidOrder}
            >
              {pending ? "Enregistrement…" : "Envoyer ma demande de devis"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Tu pourras modifier formules et prix plus tard dans Supabase.
            </p>
          </CardContent>
        </Card>
      </FadeIn>
    </form>
  );
}


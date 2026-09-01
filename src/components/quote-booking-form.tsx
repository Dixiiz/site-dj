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

const START_TIMES = ["18:00", "18:30", "19:00", "19:30", "20:00"];
const END_TIMES = [
  "23:00", "23:30", "00:00", "00:30", "01:00", "01:30",
  "02:00", "02:30", "03:00", "03:30", "04:00", "04:30", "05:00",
];

export function QuoteBookingForm({
  formulas,
  options,
}: {
  formulas: Formula[];
  options: QuoteOption[];
}) {
  const [formulaId, setFormulaId] = useState(formulas[0]?.id ?? "");
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [suggestions, setSuggestions] = useState<{ label: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [travel, setTravel] = useState<TravelState>(null);
  const [travelPending, startTravelTransition] = useTransition();
  const [pending, startTransition] = useTransition();

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
  const cutoffLabel = formula?.name.toLowerCase().includes("mariage") ? "04:00" : "03:00";
  const cutoffMinutes = toMinutes(cutoffLabel) + 24 * 60;

  const startMinutes = toMinutes(startTime);
  const endMinutes = endTime ? toMinutes(endTime) : null;
  // Les fins après minuit (00:00–05:00) sont ramenées après 20 h pour comparer.
  const normalizedEndMinutes =
    endMinutes != null && endMinutes < 12 * 60 ? endMinutes + 24 * 60 : endMinutes;
  const invalidOrder =
    normalizedEndMinutes != null && normalizedEndMinutes <= startMinutes;

  const extraHours = useMemo(() => {
    if (normalizedEndMinutes == null || invalidOrder) return 0;
    const past = normalizedEndMinutes - cutoffMinutes;
    return past > 0 ? Math.ceil(past / 60) : 0;
  }, [normalizedEndMinutes, cutoffMinutes, invalidOrder]);

  const extraFeeCents = extraHours * EXTRA_HOUR_RATE_CENTS;

  const total =
    (formula?.price_cents ?? 0) +
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
      {optionIds.map((id) => (
        <input key={id} type="hidden" name="option_ids" value={id} />
      ))}
      <input type="hidden" name="travel_distance_km" value={travel?.distanceKm ?? ""} />
      <input type="hidden" name="travel_fee_cents" value={travel?.feeCents ?? ""} />

      <div className="space-y-6">
        <FadeIn>
          <h2 className="mb-3 text-xl font-medium">1. Choisis ta formule</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {formulas.map((item) => {
              const selected = item.id === formulaId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFormulaId(item.id);
                    setOptionIds([]);
                    setEndTime("");
                  }}
                  className={`glow-hover rounded-xl border p-4 text-left transition-colors ${
                    selected
                      ? "border-accent bg-primary/10"
                      : "border-white/10 hover:border-accent/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{item.name}</p>
                    <Badge variant={selected ? "default" : "outline"}>
                      {formatEuros(item.price_cents)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.duration_hours} h de prestation
                  </p>
                </button>
              );
            })}
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <h2 className="mb-3 text-xl font-medium">2. Options</h2>
          <div className="space-y-3">
            {visibleOptions.map((option) => {
              const checked = optionIds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="glow-hover flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggleOption(option.id, value === true)}
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{option.name}</span>
                      <span className="text-sm">{formatEuros(option.price_cents)}</span>
                    </span>
                    {option.description ? (
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="mb-3 text-xl font-medium">3. Date et horaires</h2>
          <Card>
            <CardContent className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                Disponible 7 jours sur 7, week-end inclus. Départ entre 18 h et 20 h
                (20 h dernier départ). Jusqu&apos;à {cutoffLabel} inclus dans la formule
                choisie — au-delà, chaque heure supplémentaire est facturée{" "}
                {formatEuros(EXTRA_HOUR_RATE_CENTS)}.
              </p>
              <Calendar
                mode="single"
                locale={fr}
                selected={selectedDate}
                onSelect={onDateChange}
                disabled={[{ before: new Date() }]}
                className="w-full"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="start_time_select">Heure de début (entre 18 h et 20 h)</Label>
                  <select
                    id="start_time_select"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-background px-3 py-2"
                  >
                    {START_TIMES.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_time_select">Heure de fin</Label>
                  <select
                    id="end_time_select"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-background px-3 py-2"
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
              {invalidOrder ? (
                <p className="text-sm text-red-400">
                  L&apos;heure de fin doit être après l&apos;heure de début.
                </p>
              ) : extraHours > 0 ? (
                <p className="text-sm text-accent">
                  ⏱ {extraHours} heure{extraHours > 1 ? "s" : ""} supplémentaire
                  {extraHours > 1 ? "s" : ""} au-delà de {cutoffLabel} — incluse
                  {extraHours > 1 ? "s" : ""} dans le devis.
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
          <h2 className="sm:col-span-2 text-xl font-medium">4. Tes coordonnées</h2>
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
          <div className="space-y-1.5">
            <Label htmlFor="event_type">Type d&apos;événement</Label>
            <Input
              id="event_type"
              name="event_type"
              placeholder="Mariage, anniversaire…"
              list="event-type-suggestions"
            />
            <datalist id="event-type-suggestions">
              <option value="Mariage" />
              <option value="Anniversaire" />
              <option value="Entreprise / Afterwork" />
              <option value="Autre" />
            </datalist>
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
                🚗 {travel.distanceKm} km depuis Huisseau-sur-Cosson —{" "}
                {travel.feeCents === 0
                  ? "déplacement offert (30 km gratuits)"
                  : `frais estimés : ${formatEuros(travel.feeCents)}`}
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
            <Textarea id="notes" name="notes" placeholder="Ambiance souhaitée, contraintes…" />
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
              <span>{formula?.name ?? "Formule"}</span>
              <span>{formatEuros(formula?.price_cents ?? 0)}</span>
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
                  Heures supplémentaires ({extraHours} × {formatEuros(EXTRA_HOUR_RATE_CENTS)})
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


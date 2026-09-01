"use client";

import { useMemo, useState, useTransition } from "react";
import { fr } from "react-day-picker/locale";
import { toast } from "sonner";
import { submitQuoteAndBooking } from "@/app/actions";
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
import type { Formula, QuoteOption, Slot } from "@/lib/types";

function dateKey(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

export function QuoteBookingForm({
  formulas,
  options,
  slots,
}: {
  formulas: Formula[];
  options: QuoteOption[];
  slots: Slot[];
}) {
  const [formulaId, setFormulaId] = useState(formulas[0]?.id ?? "");
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [slotId, setSlotId] = useState("");
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
  const total =
    (formula?.price_cents ?? 0) +
    selectedOptions.reduce((sum, option) => sum + option.price_cents, 0);

  const openDates = useMemo(() => new Set(slots.map((slot) => slot.slot_date)), [slots]);
  const slotsForDay = slots.filter(
    (slot) => selectedDate && slot.slot_date === dateKey(selectedDate)
  );

  function toggleOption(id: string, checked: boolean) {
    setOptionIds((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id)
    );
  }

  function onDateChange(date?: Date) {
    setSelectedDate(date);
    setSlotId("");
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
      <input type="hidden" name="slot_id" value={slotId} />
      {optionIds.map((id) => (
        <input key={id} type="hidden" name="option_ids" value={id} />
      ))}

      <div className="space-y-6">
        <section>
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
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-white/10 hover:border-white/25"
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
        </section>

        <section>
          <h2 className="mb-3 text-xl font-medium">2. Options</h2>
          <div className="space-y-3">
            {visibleOptions.map((option) => {
              const checked = optionIds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3"
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
        </section>

        <section>
          <h2 className="mb-3 text-xl font-medium">3. Date et créneau</h2>
          <Card>
            <CardContent className="flex flex-col gap-4 pt-1 sm:flex-row">
              <Calendar
                mode="single"
                locale={fr}
                selected={selectedDate}
                onSelect={onDateChange}
                disabled={[
                  { before: new Date() },
                  (date) => !openDates.has(dateKey(date)),
                ]}
                className="w-full"
              />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {selectedDate
                    ? "Créneaux disponibles ce jour :"
                    : "Choisis un jour en surbrillance."}
                </p>
                {slotsForDay.length === 0 && selectedDate ? (
                  <p className="text-sm">Aucun créneau ce jour-là.</p>
                ) : null}
                {slotsForDay.map((slot) => (
                  <Button
                    key={slot.id}
                    type="button"
                    variant={slotId === slot.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSlotId(slot.id)}
                  >
                    {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
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
            <Label htmlFor="event_type">Type d’événement</Label>
            <Input id="event_type" name="event_type" placeholder="Mariage, anniversaire…" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="event_location">Lieu</Label>
            <Input id="event_location" name="event_location" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="notes">Message</Label>
            <Textarea id="notes" name="notes" placeholder="Ambiance souhaitée, horaires, contraintes…" />
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 h-fit">
        <Card>
          <CardHeader>
            <CardTitle>Récapitulatif</CardTitle>
            <CardDescription>Le devis et le rendez-vous sont enregistrés ensemble.</CardDescription>
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
            <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-medium">
              <span>Total estimé</span>
              <span>{formatEuros(total)}</span>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={pending || !formulaId}>
              {pending ? "Enregistrement…" : "Envoyer le devis et réserver"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Les jours sans créneau sont grisés. Tu pourras modifier formules et prix plus tard dans Supabase.
            </p>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

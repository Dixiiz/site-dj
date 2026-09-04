"use client";

import { useState, useTransition } from "react";
import { proposeRdvAvailability } from "@/app/client-actions";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MOMENTS = ["Matin", "Après-midi", "Soirée"];

// Formulaire de disponibilités : le client coche ses jours et moments
// libres dans la semaine ; Maxime choisit ensuite la date exacte.
export function RdvAvailabilityForm({ quoteId }: { quoteId: string }) {
  const [days, setDays] = useState<string[]>([]);
  const [moments, setMoments] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (list: string[], set: (v: string[]) => void, item: string) => {
    set(list.includes(item) ? list.filter((d) => d !== item) : [...list, item]);
  };

  function onSubmit() {
    setError(null);
    if (days.length === 0 || moments.length === 0) {
      setError("Coche au moins un jour et un moment.");
      return;
    }
    const availability = `${days.join(", ")} — ${moments.join(", ")}`;
    const fd = new FormData();
    fd.set("quote_id", quoteId);
    fd.set("availability", availability);
    startTransition(async () => {
      const res = await proposeRdvAvailability(fd);
      if (res && !res.ok) setError(res.error ?? "Erreur.");
      else setDone(true);
    });
  }

  if (done) {
    return (
      <p className="mt-3 text-sm text-green-400">
        ✓ Disponibilités envoyées ! Tu recevras un e-mail dès que le créneau est confirmé.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jours possibles</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggle(days, setDays, day)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                days.includes(day)
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted-foreground hover:border-accent/50"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Moments</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MOMENTS.map((moment) => (
            <button
              key={moment}
              type="button"
              onClick={() => toggle(moments, setMoments, moment)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                moments.includes(moment)
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted-foreground hover:border-accent/50"
              }`}
            >
              {moment}
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <button
        type="button"
        onClick={onSubmit}
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Envoyer mes disponibilités"}
      </button>
    </div>
  );
}

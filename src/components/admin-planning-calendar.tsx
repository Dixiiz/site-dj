"use client";

import { useState, useTransition } from "react";
import { toggleBlockedDate } from "@/app/actions";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

function iso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildGrid(year: number, month: number) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function AdminPlanningCalendar({
  blockedDates,
  bookedDates,
}: {
  blockedDates: string[];
  bookedDates: string[];
}) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [pending, startTransition] = useTransition();
  const blocked = new Set(blockedDates);
  const booked = new Set(bookedDates);
  const years = [thisYear, thisYear + 1, thisYear + 2, thisYear + 3, thisYear + 4];
  const todayIso = new Date().toISOString().slice(0, 10);

  const toggle = (date: string) => {
    const fd = new FormData();
    fd.set("slot_date", date);
    startTransition(() => {
      void toggleBlockedDate(fd);
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setYear(y)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              y === year
                ? "border-accent bg-accent/15 font-medium text-accent"
                : "border-white/10 text-muted-foreground hover:border-accent/40"
            }`}
          >
            {y}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {pending ? "Mise à jour…" : "Cliquez sur un jour pour bloquer / débloquer la date."}
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MONTHS.map((name, m) => (
          <div key={name} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-2 text-sm font-medium">{name}</p>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
              {DAYS.map((d, i) => (
                <span key={`${d}-${i}`}>{d}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
              {buildGrid(year, m).map((day, i) => {
                if (day === null) return <span key={`empty-${m}-${i}`} />;
                const d = iso(year, m, day);
                const isPast = d < todayIso;
                const isBooked = booked.has(d);
                const isBlocked = blocked.has(d);
                const disabled = isPast || isBooked || pending;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(d)}
                    title={
                      isBooked
                        ? "Événement confirmé"
                        : isBlocked
                          ? "Bloqué — cliquer pour débloquer"
                          : "Libre — cliquer pour bloquer"
                    }
                    className={`aspect-square rounded-md transition-colors ${
                      isPast
                        ? "cursor-not-allowed text-muted-foreground/30"
                        : isBooked
                          ? "cursor-not-allowed bg-red-500/20 font-semibold text-red-400 line-through"
                          : isBlocked
                            ? "bg-orange-500/25 font-medium text-orange-300 hover:bg-orange-500/40"
                            : "hover:bg-accent/20"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded bg-red-500/40" /> Événement confirmé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded bg-orange-500/40" /> Date bloquée (invisible pour les clients)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded border border-white/20" /> Libre
        </span>
      </div>
    </div>
  );
}

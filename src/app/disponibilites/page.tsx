import { createAdminClient } from "@/lib/supabase/admin";
import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Disponibilités — Propul'Sound DJ",
  description:
    "Consultez les dates déjà réservées de Propul'Sound DJ et vérifiez la disponibilité pour votre événement.",
};

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAY_NAMES = ["L", "M", "M", "J", "V", "S", "D"];

type BookedDate = { date: string; label: string };

async function getBookedDates(): Promise<BookedDate[]> {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("quotes")
      .select("event_date, event_type")
      .eq("status", "confirme")
      .gte("event_date", now)
      .order("event_date", { ascending: true });
    if (error || !data) return [];
    return data
      .filter((r) => r.event_date)
      .map((r) => ({
        date: String(r.event_date),
        label: r.event_type || "Événement",
      }));
  } catch {
    return [];
  }
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default async function DisponibilitesPage() {
  const booked = await getBookedDates();
  const bookedMap = new Map(booked.map((b) => [b.date, b.label]));

  const today = new Date();
  const months = Array.from({ length: 9 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-5xl px-4 py-10">
        <FadeIn>
          <h1 className="text-3xl font-medium tracking-tight">
            Disponibilités
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Les dates marquées sont déjà réservées. Si votre date est libre,
            n&apos;hésitez pas :{" "}
            <Link
              href="/formules"
              className="text-accent underline underline-offset-4"
            >
              demandez votre devis
            </Link>{" "}
            et nous vous confirmons sous 48 h.
          </p>
        </FadeIn>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {months.map(({ year, month }, mi) => {
            const cells = buildMonthGrid(year, month);
            return (
              <FadeIn key={`${year}-${month}`} delay={0.04 * mi}>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-3 text-center font-medium">
                    {MONTH_NAMES[month]} {year}
                  </p>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                    {DAY_NAMES.map((d, i) => (
                      <span key={i}>{d}</span>
                    ))}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
                    {cells.map((day, i) => {
                      if (day === null) return <span key={i} />;
                      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isBooked = bookedMap.has(iso);
                      const isToday = iso === today.toISOString().slice(0, 10);
                      return (
                        <span
                          key={i}
                          title={isBooked ? "Déjà réservé" : undefined}
                          className={`flex h-8 items-center justify-center rounded-md ${
                            isBooked
                              ? "bg-accent/20 font-semibold text-accent line-through"
                              : isToday
                                ? "border border-accent/50"
                                : ""
                          }`}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>

        <FadeIn delay={0.2}>
          <p className="mt-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-md bg-accent/20" />
              Date réservée
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-md border border-accent/50" />
              Aujourd&apos;hui
            </span>
          </p>
        </FadeIn>
      </main>
    </>
  );
}

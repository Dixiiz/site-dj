// Statistiques du tableau de bord : CA URSSAF encaissé par mois (barres) et
// entonnoir de conversion des demandes. Rendu 100 % serveur, aucune dépendance.
import { formatEuros } from "@/lib/money";

type MonthBar = { label: string; cents: number };
type FunnelRow = { label: string; count: number; hint?: string };

function abrevie(cents: number) {
  if (cents >= 1_000_00) return `${(cents / 1_000_00).toFixed(1).replace(".", ",")} k€`;
  return `${Math.round(cents / 100)} €`;
}

export function AdminStats({
  year,
  months,
  funnel,
}: {
  year: number;
  months: MonthBar[];
  funnel: FunnelRow[];
}) {
  const max = Math.max(1, ...months.map((m) => m.cents));
  const totalDemandes = funnel[0]?.count ?? 0;

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {/* CA URSSAF par mois */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">CA URSSAF encaissé par mois — {year}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Même calcul que la carte « CA encaissé ce mois », sur toute l&apos;année.
        </p>
        <div className="mt-4 flex h-36 items-end gap-1.5">
          {months.map((m) => (
            <div
              key={m.label}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              title={`${m.label} ${year} : ${formatEuros(m.cents)}`}
            >
              {m.cents > 0 ? (
                <span className="text-[9px] leading-none text-muted-foreground">
                  {abrevie(m.cents)}
                </span>
              ) : null}
              <div
                className={`w-full rounded-t ${m.cents > 0 ? "bg-accent/80" : "bg-muted"}`}
                style={{ height: `${Math.max(m.cents > 0 ? 8 : 2, (m.cents / max) * 100)}%` }}
              />
              <span className="text-[10px] text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Entonnoir de conversion */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Conversion des demandes</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Depuis la mise en ligne du site.
        </p>
        <div className="mt-4 space-y-3">
          {funnel.map((row) => {
            const pct =
              totalDemandes > 0 ? Math.round((row.count / totalDemandes) * 100) : 0;
            return (
              <div key={row.label}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span>{row.label}</span>
                  <span className="text-muted-foreground">
                    {row.count}
                    {row.hint ? ` · ${row.hint}` : ""}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent/80"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

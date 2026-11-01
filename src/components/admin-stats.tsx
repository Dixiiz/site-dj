// Statistiques du tableau de bord : CA encaissé par mois (barres empilées
// DJ + Menuiserie) et entonnoir de conversion des demandes. Rendu 100 %
// serveur, aucune dépendance.
import { formatEuros } from "@/lib/money";

type MonthBar = { label: string; dj: number; menu: number };
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
  const max = Math.max(1, ...months.map((m) => m.dj + m.menu));
  const totalDemandes = funnel[0]?.count ?? 0;
  const avecMenu = months.some((m) => m.menu > 0);
  const avecDj = months.some((m) => m.dj > 0);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {/* CA par mois — barres empilées : accent = DJ, ambre = Menuiserie */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">CA encaissé par mois — {year}</h2>
          {avecDj && avecMenu ? (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-sm bg-accent/80" /> DJ (prestation de
                services)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-sm bg-amber-600/80" /> Menuiserie
                (vente de biens)
              </span>
            </div>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Même calcul que la carte « CA encaissé ce mois », sur toute l&apos;année.
        </p>
        <div className="mt-4 flex h-36 items-end gap-1.5">
          {months.map((m, i) => {
            const total = m.dj + m.menu;
            return (
              <div
                key={`${m.label}-${i}`}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                title={`${m.label} ${year} : DJ ${formatEuros(m.dj)} · Menuiserie ${formatEuros(m.menu)}`}
              >
                {total > 0 ? (
                  <span className="text-[9px] leading-none text-muted-foreground">
                    {abrevie(total)}
                  </span>
                ) : null}
                <div
                  className="flex w-full flex-col-reverse overflow-hidden rounded-t transition-opacity hover:opacity-80 animate-in fade-in slide-in-from-bottom-12 duration-700 fill-mode-both"
                  style={{
                    height: `${Math.max(total > 0 ? 8 : 2, (total / max) * 100)}%`,
                    animationDelay: `${i * 50}ms`,
                  }}
                >
                  {total === 0 ? (
                    <div className="w-full bg-muted" style={{ height: "100%" }} />
                  ) : (
                    <>
                      <div
                        className="w-full bg-accent/80"
                        style={{ height: `${(m.dj / total) * 100}%` }}
                      />
                      <div
                        className="w-full bg-amber-600/80"
                        style={{ height: `${(m.menu / total) * 100}%` }}
                      />
                    </>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Entonnoir de conversion */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Conversion des demandes</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Depuis la mise en ligne du site.
        </p>
        <div className="mt-4 space-y-3">
          {funnel.map((row, i) => {
            const pct =
              totalDemandes > 0 ? Math.round((row.count / totalDemandes) * 100) : 0;
            return (
              <div
                key={row.label}
                className="animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-both"
                style={{ animationDelay: `${i * 80}ms` }}
              >
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

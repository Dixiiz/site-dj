import { QuoteStatusSelect } from "@/components/quote-status-select";
import { AdminQuoteEdit } from "@/components/admin-quote-edit";
import { formatEuros } from "@/lib/money";
import type { SelectedOption } from "@/lib/types";

type Quote = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  event_location: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  formula_name: string;
  formula_price_cents: number | null;
  travel_distance_km: number | null;
  travel_fee_cents: number | null;
  extra_fee_cents: number | null;
  total_cents: number | null;
  created_at: string;
  status: string;
};

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="w-44 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-foreground/90">{value}</span>
    </div>
  );
}

// Le champ "notes" agrège plusieurs infos : on les extrait proprement.
function parseNotes(notes: string | null) {
  const n = notes ?? "";
  return {
    message: n.match(/Message : ([\s\S]*)$/)?.[1]?.trim() || null,
    extraHours: n.match(/Heures supplémentaires : ([^(|]+?)(?: \([\d.]+ €\))? \|/)?.[1]?.trim() || null,
    extraFee: n.match(/Heures supplémentaires : .*?\(([\d.]+) €\)/)?.[1] || null,
    co2Units: n.match(/Pistolets CO2 : (\d+) unités?/)?.[1] || null,
  };
}

export function AdminQuoteDetails({
  quote,
  options,
}: {
  quote: Quote;
  options: SelectedOption[];
}) {
  const extras = (quote.extra_fee_cents ?? 0) + (quote.travel_fee_cents ?? 0);
  const parsed = parseNotes(quote.notes);

  return (
    <div className="space-y-4 border-t border-border px-4 pb-4 pt-4 text-sm">
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Client
        </h3>
        <Row label="Nom" value={quote.customer_name} />
        <Row label="E-mail" value={quote.customer_email} />
        <Row label="Téléphone" value={quote.customer_phone} />
        <Row label="Lieu de réception" value={quote.event_location} />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Prestation
        </h3>
        <Row label="Pack" value={quote.formula_name} />
        <Row
          label="Date de l'événement"
          value={
            quote.event_date
              ? new Date(quote.event_date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : null
          }
        />
        <Row label="Heure de début" value={quote.start_time} />
        <Row label="Heure de fin" value={quote.end_time} />
        <Row
          label="Heures supplémentaires"
          value={
            parsed.extraHours
              ? `${parsed.extraHours}${parsed.extraFee ? ` (${parsed.extraFee} €)` : ""}`
              : null
          }
        />
        <Row label="Pistolets CO2" value={parsed.co2Units ? `${parsed.co2Units} unité(s)` : null} />
        <Row
          label="Déplacement"
          value={
            quote.travel_distance_km
              ? `${quote.travel_distance_km} km aller-retour`
              : null
          }
        />
      </div>

      {parsed.message ? (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Message du client
          </h3>
          <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-3 text-foreground/90">
            {parsed.message}
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Options
        </h3>
        {options.length === 0 ? (
          <p className="text-muted-foreground">Aucune option.</p>
        ) : (
          options.map((option) => (
            <div key={option.id ?? option.name} className="flex justify-between gap-2">
              <span className="text-green-400">✓ {option.name}</span>
              <span>{formatEuros(option.price_cents ?? 0)}</span>
            </div>
          ))
        )}
      </div>

      <div className="space-y-1.5 border-t border-border pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Prix détaillé
        </h3>
        <div className="flex justify-between">
          <span>Pack</span>
          <span>{formatEuros(quote.formula_price_cents ?? 0)}</span>
        </div>
        {options.map((option) => (
          <div
            key={`p-${option.id ?? option.name}`}
            className="flex justify-between text-muted-foreground"
          >
            <span>{option.name}</span>
            <span>{formatEuros(option.price_cents ?? 0)}</span>
          </div>
        ))}
        {extras > 0 ? (
          <div className="flex justify-between text-muted-foreground">
            <span>Suppléments (heures supp, déplacement…)</span>
            <span>{formatEuros(extras)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-border pt-2 font-semibold">
          <span>Total</span>
          <span className="text-accent">{formatEuros(quote.total_cents ?? 0)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">
          Devis reçu le{" "}
          {new Date(quote.created_at).toLocaleString("fr-FR", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/fiche/${quote.id}`}
            className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
          >
            🎵 Fiche soirée PDF
          </a>
          <AdminQuoteEdit quote={quote} options={options} />
          <QuoteStatusSelect id={quote.id} status={quote.status} />
        </div>
      </div>
    </div>
  );
}

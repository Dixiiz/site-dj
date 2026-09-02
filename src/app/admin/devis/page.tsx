import { AdminQuoteDetails } from "@/components/admin-quote-details";

import { QuoteStatusSelect } from "@/components/quote-status-select";
import { Badge } from "@/components/ui/badge";
import { formatEuros } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SelectedOption } from "@/lib/types";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  nouveau: { label: "Nouveau", className: "border-accent/60 text-accent" },
  contacte: { label: "Contacté", className: "border-yellow-500/60 text-yellow-400" },
  confirme: { label: "Confirmé", className: "border-green-500/60 text-green-400" },
  refuse: { label: "Refusé", className: "border-red-500/60 text-red-400" },
};

function eventKind(formulaName: string): string {
  const n = formulaName.toLowerCase();
  if (n.includes("mariage") || n.includes("essential") || n.includes("deluxe") || n.includes("ultime"))
    return "Mariage";
  if (n.includes("set dj") || n.includes("clé en main") || n.includes("club") || n.includes("afterwork"))
    return "Bar / Club";
  return "Anniversaire / Privé";
}

function detailRow(label: string, value: string | null | undefined) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="w-40 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-foreground/90">{value}</span>
    </div>
  );
}

export default async function DevisPage() {
  const supabase = createAdminClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium">Devis reçus</h1>
        <p className="text-sm text-muted-foreground">
          Cliquez sur un devis pour voir tous les détails et changer son statut.
        </p>
      </div>

      {(quotes ?? []).length === 0 ? (
        <p className="text-muted-foreground">Aucun devis pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {(quotes ?? []).map((quote) => {
            const options = (quote.selected_options ?? []) as SelectedOption[];
            const status = STATUS_STYLES[quote.status] ?? {
              label: quote.status,
              className: "border-border",
            };
            return (
              <details
                key={quote.id}
                className="rounded-xl border border-border bg-card transition-colors hover:border-accent/50 open:border-accent/70"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 p-4 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-32">
                    <div className="font-medium">
                      {quote.event_date
                        ? new Date(quote.event_date).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {eventKind(quote.formula_name ?? "")}
                    </div>
                  </div>
                  <div className="min-w-40 flex-1">
                    <div className="font-medium">{quote.customer_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {quote.event_location ?? ""}
                    </div>
                  </div>
                  <div>
                    {options.length > 0 ? (
                      <Badge className="border-green-500/60 text-green-400" variant="outline">
                        {options.length} option{options.length > 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <Badge className="border-red-500/60 text-red-400" variant="outline">
                        Sans option
                      </Badge>
                    )}
                  </div>
                  <div className="ml-auto text-right">
                    <div className="font-semibold">{formatEuros(quote.total_cents ?? 0)}</div>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </div>
                </summary>
                <AdminQuoteDetails quote={quote} options={options} />
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

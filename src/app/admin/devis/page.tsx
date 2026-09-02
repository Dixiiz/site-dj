import { AdminQuoteDetails } from "@/components/admin-quote-details";
import { updateQuoteStatus } from "@/app/actions";

import { QuoteStatusSelect } from "@/components/quote-status-select";
import { Badge } from "@/components/ui/badge";
import { formatEuros } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SelectedOption } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  nouveau: { label: "Nouveau", className: "border-accent/60 text-accent" },
  contacte: { label: "Contacté", className: "border-yellow-500/60 text-yellow-400" },
  confirme: { label: "Confirmé", className: "border-green-500/60 text-green-400" },
  refuse: { label: "Refusé", className: "border-red-500/60 text-red-400" },
  annule: { label: "Annulé", className: "border-zinc-500/60 text-zinc-400" },
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

export default async function DevisPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const supabase = createAdminClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });

  const filtered = (quotes ?? []).filter((quote) => {
    if (!query) return true;
    const haystack = [
      quote.customer_name,
      quote.customer_email,
      quote.customer_phone,
      quote.event_location,
      quote.event_date,
      quote.formula_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium">Devis reçus</h1>
        <p className="text-sm text-muted-foreground">
          Cliquez sur un devis pour voir tous les détails et changer son statut.
        </p>
      </div>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher : nom, e-mail, téléphone, lieu, date…"
          className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-lg border border-accent/60 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
        >
          Rechercher
        </button>
        {query ? (
          <a
            href="/admin/devis"
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Réinitialiser
          </a>
        ) : null}
      </form>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">Aucun devis correspondant.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((quote) => {
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
                  <div className="ml-auto flex items-center gap-3 text-right">
                    <div>
                      <div className="font-semibold">{formatEuros(quote.total_cents ?? 0)}</div>
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                </summary>
                {/* Changement de statut rapide, sans ouvrir le détail */}
                <form
                  action={updateQuoteStatus}
                  className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input type="hidden" name="id" value={quote.id} />
                  <span className="text-xs text-muted-foreground">Statut rapide :</span>
                  {[
                    ["nouveau", "Nouveau"],
                    ["contacte", "Contacté"],
                    ["confirme", "Confirmé"],
                    ["refuse", "Refusé"],
                    ["annule", "Annulé"],
                  ].map(([value, lbl]) => (
                    <button
                      key={value}
                      type="submit"
                      name="status"
                      value={value}
                      className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                        quote.status === value
                          ? "border-accent bg-accent/15 text-foreground"
                          : "border-border text-muted-foreground hover:border-accent hover:text-foreground"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </form>
                <AdminQuoteDetails quote={quote} options={options} />
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

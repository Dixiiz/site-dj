import { deleteQuote } from "@/app/actions";
import { markQuoteSeen, resolveQuoteOptions } from "@/app/client-actions";
import { QuickStatusForm } from "@/components/quick-status-form";
import { AdminQuoteConversation } from "@/components/admin-quote-conversation";
import { AdminQuoteDetails } from "@/components/admin-quote-details";
import { AdminQuoteFiles } from "@/components/admin-quote-files";
import { AdminQuotePlaylist } from "@/components/admin-quote-playlist";
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
                  {/* Pastille nouveautés client (message, musique, modification) */}
                  {quote.has_unread_updates ? (
                    <span
                      title="Nouveautés client : message, musique ou modification"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm text-background shadow-[0_0_16px_-2px_var(--accent)]"
                    >
                      🔔
                    </span>
                  ) : null}
                </summary>
<QuickStatusForm statusAction={updateQuoteStatus} deleteAction={deleteQuote} quoteId={quote.id} currentStatus={quote.status} />
                {/* Demandes client : pastille vu + validation des options */}
                {quote.has_unread_updates || quote.pending_options ? (
                  <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 pt-3 text-sm">
                    <span className="text-yellow-400">
                      {quote.pending_options
                        ? "⏳ Le client a demandé une modification d'options."
                        : "🔔 Nouveautés client (musique ou message)."}
                    </span>
                    {quote.has_unread_updates ? (
                      <form action={markQuoteSeen}>
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          ✓ Marquer comme vu
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
                {quote.pending_options ? (
                  <div className="mx-4 mb-4 mt-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
                    <p className="font-medium text-yellow-300">
                      Options demandées par le client :
                    </p>
                    <ul className="mt-2 space-y-1">
                      {((quote.pending_options ?? []) as SelectedOption[]).map((option) => (
                        <li key={option.id} className="flex justify-between gap-4">
                          <span>
                            {option.name}
                            {option.qty && option.qty > 1 ? ` × ${option.qty}` : ""}
                          </span>
                          <span className="text-muted-foreground">
                            {formatEuros(option.price_cents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form
                        action={async (formData) => {
                          "use server";
                          await resolveQuoteOptions(formData);
                        }}
                      >
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <input type="hidden" name="approve" value="true" />
                        <button
                          type="submit"
                          className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500"
                        >
                          ✓ Accepter et appliquer
                        </button>
                      </form>
                      <form
                        action={async (formData) => {
                          "use server";
                          await resolveQuoteOptions(formData);
                        }}
                      >
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <input type="hidden" name="approve" value="false" />
                        <button
                          type="submit"
                          className="rounded-lg border border-red-500/50 px-4 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          ✕ Refuser
                        </button>
                      </form>
                    </div>
                  </div>
                ) : null}
                <AdminQuoteDetails quote={quote} options={options} />
                {/* Dossier complet : conversation, musiques et fichiers du client */}
                <div className="space-y-6 border-t border-border px-4 pb-5 pt-4">
                  <AdminQuoteConversation quoteId={quote.id} />
                  <AdminQuotePlaylist quoteId={quote.id} />
                  <AdminQuoteFiles quoteId={quote.id} />
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

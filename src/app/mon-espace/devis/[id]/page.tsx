import { notFound } from "next/navigation";
import {
  getMyQuote,
  getPlaylistTracks,
  getQuoteMessages,
} from "@/app/client-actions";
import { ClientOptionsEditor } from "@/components/client-options-editor";
import { ClientPlaylistEditor } from "@/components/client-playlist-editor";
import { ClientQuoteMessages } from "@/components/client-quote-messages";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEuros } from "@/lib/money";
import type { SelectedOption } from "@/lib/types";

function optionsEditable(status: string | null) {
  return status !== "confirme" && status !== "refuse" && status !== "annule";
}

export default async function ClientQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getMyQuote(id);
  if (!quote) notFound();

  const [messages, tracks] = await Promise.all([
    getQuoteMessages(id),
    getPlaylistTracks(id),
  ]);

  const supabase = createAdminClient();
  const { data: options } = await supabase
    .from("options")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const selectedOptions = (quote.selected_options ?? []) as SelectedOption[];
  const editable = optionsEditable(quote.status);

  return (
    <main className="space-y-10">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          {quote.formula_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {quote.event_date ?? "Date à définir"} · {quote.event_location ?? "Lieu à définir"}
        </p>
      </div>

      {/* Récapitulatif */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-medium">Récapitulatif</h2>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span>Pack</span>
            <span>{formatEuros(quote.formula_price_cents)}</span>
          </div>
          {selectedOptions.map((option) => (
            <div key={option.id} className="flex justify-between gap-4 text-muted-foreground">
              <span>
                {option.name}
                {option.qty && option.qty > 1 ? ` × ${option.qty}` : ""}
              </span>
              <span>{formatEuros(option.price_cents)}</span>
            </div>
          ))}
          {quote.travel_fee_cents > 0 ? (
            <div className="flex justify-between gap-4 text-muted-foreground">
              <span>
                Déplacement ({quote.travel_distance_km ?? "?"} km aller-retour)
              </span>
              <span>{formatEuros(quote.travel_fee_cents)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-white/10 pt-3 text-base font-medium">
            <span>Total</span>
            <span>{formatEuros(quote.total_cents)}</span>
          </div>
          <p className="pt-1 text-xs text-muted-foreground">
            Statut : {quote.status}
            {quote.start_time && quote.end_time
              ? ` · ${quote.start_time} → ${quote.end_time}`
              : ""}
          </p>
        </div>
      </section>

      {/* Options modifiables */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-medium">Options</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {editable
            ? "Ajoutez ou retirez des options : le total est recalculé automatiquement."
            : "Ce devis est confirmé : contactez-nous via la messagerie pour toute modification."}
        </p>
        <ClientOptionsEditor
          quoteId={id}
          options={(options ?? []).map((o) => ({
            id: o.id,
            name: o.name,
            price_cents: o.price_cents,
          }))}
          selectedIds={selectedOptions.map((o) => o.id)}
          disabled={!editable}
        />
      </section>

      {/* Playlist */}
      <ClientPlaylistEditor quoteId={id} tracks={tracks} />

      {/* Messagerie */}
      <ClientQuoteMessages quoteId={id} messages={messages} />
    </main>
  );
}

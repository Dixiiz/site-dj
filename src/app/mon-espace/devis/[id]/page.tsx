import { notFound } from "next/navigation";
import {
  getMyQuote,
  getPlaylistTracks,
  getQuoteFiles,
  getQuoteMessages,
} from "@/app/client-actions";
import { ClientQuoteFiles as ClientFiles } from "@/components/client-files";
import { ClientOptionsEditor } from "@/components/client-options-editor";
import { ClientPlaylistEditor } from "@/components/client-playlist-editor";
import { ClientQuoteMessages } from "@/components/client-quote-messages";
import { PACK_IMAGES } from "@/components/pricing-section";
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

  const [messages, tracks, files] = await Promise.all([
    getQuoteMessages(id),
    getPlaylistTracks(id),
    getQuoteFiles(id),
  ]);

  const supabase = createAdminClient();
  const { data: allOptions } = await supabase
    .from("options")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  // Seules les vraies options FX sont modifiables par le client
  // (fumée lourde, étincelles froides, pistolet CO2).
  const options = (allOptions ?? []).filter((option) =>
    /fumée|fumee|étincelles|etincelles|co2/i.test(option.name)
  );

  const selectedOptions = (quote.selected_options ?? []) as SelectedOption[];
  const pendingOptions = (quote.pending_options ?? null) as SelectedOption[] | null;
  const editable = optionsEditable(quote.status) && !pendingOptions;
  const packImage = PACK_IMAGES[quote.formula_name] ?? null;

  return (
    <main className="space-y-10">
      <div className="flex flex-wrap items-center gap-4">
        {packImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={packImage}
            alt={`Scénographie du ${quote.formula_name}`}
            width={120}
            height={68}
            className="h-16 w-28 shrink-0 rounded-xl border border-white/10 object-cover sm:h-20 sm:w-36"
          />
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-medium tracking-tight">{quote.formula_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {quote.event_date ?? "Date à définir"} ·{" "}
            {quote.event_location ?? "Lieu à définir"}
          </p>
        </div>
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
        {pendingOptions ? (
          <div className="mt-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
            <p className="font-medium text-yellow-300">⏳ Modification en attente de validation</p>
            <p className="mt-1 text-muted-foreground">
              Vous avez demandé :{" "}
              {pendingOptions.length > 0
                ? pendingOptions.map((o) => o.name).join(", ")
                : "aucune option"}
              . Nous vous répondons dès que possible.
            </p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {editable
              ? "Ajoutez ou retirez des options : votre demande nous est envoyée pour validation."
              : "Ce devis est confirmé : contactez-nous via la messagerie pour toute modification."}
          </p>
        )}
        <ClientOptionsEditor
          quoteId={id}
          options={(options ?? []).map((o) => ({
            id: o.id,
            name: o.name,
            price_cents: o.price_cents,
          }))}
          selectedIds={selectedOptions.map((o) => o.id)}
          disabled={!editable}
          notice={pendingOptions ? "pending" : editable ? "review" : undefined}
        />
      </section>

      {/* Playlist */}
      <ClientPlaylistEditor quoteId={id} tracks={tracks} />

      {/* Fichiers */}
      <ClientFiles quoteId={id} files={files} />

      {/* Messagerie */}
      <ClientQuoteMessages quoteId={id} messages={messages} />
    </main>
  );
}

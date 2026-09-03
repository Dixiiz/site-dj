import { notFound } from "next/navigation";
import {
  getMyQuote,
  getPlaylistTracks,
  getQuoteFiles,
  getQuoteMessages,
  renameClientQuote,
  signClientDocument,
} from "@/app/client-actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { downloadQuoteFile } from "@/app/client-actions";
import { eventMoments } from "@/components/admin-quote-playlist";
import { DiversFiles, MomentFiles } from "@/components/client-files";
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
      <AutoRefresh />
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
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-medium tracking-tight">
            {quote.client_label || quote.formula_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {quote.event_date ?? "Date à définir"} ·{" "}
            {quote.event_location ?? "Lieu à définir"} · Pack : {quote.formula_name}
          </p>
          {/* Renommage du devis */}
          <form
            action={async (formData: FormData) => {
              "use server";
              await renameClientQuote(formData);
            }}
            className="mt-2 flex max-w-md items-center gap-2"
          >
            <input type="hidden" name="quote_id" value={id} />
            <input
              type="text"
              name="label"
              defaultValue={quote.client_label ?? ""}
              maxLength={60}
              placeholder="Renommer (ex : Mariage de Julien)"
              className="w-full rounded-md border border-white/10 bg-background px-2.5 py-1.5 text-xs outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md border border-accent/40 px-2.5 py-1.5 text-xs text-accent transition-colors hover:bg-accent/15"
            >
              Renommer
            </button>
          </form>
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
          co2InitialQty={
            selectedOptions.find((o) => /co2/i.test(o.name))?.qty ?? 1
          }
          disabled={!editable}
          notice={pendingOptions ? "pending" : editable ? "review" : undefined}
        />
      </section>

      {/* Playlist */}
      {/* Documents officiels envoyés par Propul'Sound DJ */}
      {files.filter((f) => f.from_admin).length > 0 ? (
        <section className="rounded-xl border border-accent/30 bg-accent/5 p-5">
          <h2 className="font-medium">📄 Documents officiels</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Contrat, devis signé et documents importants de votre événement.
          </p>
          <ul className="mt-3 space-y-2">
            {files
              .filter((f) => f.from_admin)
              .map((file) => (
                <li
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">📄 {file.name}</p>
                    {file.signed_name ? (
                      <p className="text-xs text-green-400">
                        ✓ Signé par {file.signed_name} le{" "}
                        {file.signed_at
                          ? new Date(file.signed_at).toLocaleDateString("fr-FR")
                          : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={downloadQuoteFile}>
                      <input type="hidden" name="quote_id" value={id} />
                      <input type="hidden" name="file_id" value={file.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/15"
                      >
                        Télécharger
                      </button>
                    </form>
                    {!file.signed_name ? (
                      <form
                        action={async (formData: FormData) => {
                          "use server";
                          await signClientDocument(formData);
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input type="hidden" name="quote_id" value={id} />
                        <input type="hidden" name="file_id" value={file.id} />
                        <input
                          type="text"
                          name="name"
                          required
                          placeholder="Votre nom pour signer"
                          className="w-40 rounded-md border border-white/10 bg-background px-2 py-1.5 text-xs outline-none focus:border-accent"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500"
                        >
                          ✍️ Signer
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {/* Musiques + fichiers par catégorie */}
      <ClientPlaylistEditor
        quoteId={id}
        tracks={tracks}
        files={files}
        moments={eventMoments(quote.formula_name)}
      />

      {/* Fichiers sans catégorie (anciens envois) */}
      <DiversFiles quoteId={id} files={files} />

      {/* Messagerie */}
      <ClientQuoteMessages quoteId={id} messages={messages} />
    </main>
  );
}

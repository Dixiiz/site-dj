import { notFound } from "next/navigation";
import {
  declareAcompteSent,
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
import { SignaturePad } from "@/components/signature-pad";
import { SubmitButton } from "@/components/submit-button";
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
  const confirmed = quote.status === "confirme";
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
            Statut :{" "}
            {
              {
                nouveau: "Nouveau",
                contacte: "Contacté",
                attente_signature: "En attente de signature",
                confirme: "Confirmé ✓",
                refuse: "Refusé",
                annule: "Annulé",
              }[quote.status as string] ?? quote.status
            }
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
      {/* Documents officiels simples envoyés par Propul'Sound DJ */}
      {files.filter((f) => f.from_admin && f.doc_kind !== "a_signer").length > 0 ? (
        <section className="rounded-xl border border-accent/30 bg-accent/5 p-5">
          <h2 className="font-medium">📄 Documents officiels</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Contrat, devis signé et documents importants de votre événement.
          </p>
          <ul className="mt-3 space-y-2">
            {files
              .filter((f) => f.from_admin && f.doc_kind !== "a_signer")
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
                    <a
                      href={`/api/files/${file.id}`}
                      className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/15"
                    >
                      Télécharger
                    </a>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {/* Documents à signer */}
      {files.filter((f) => f.from_admin && f.doc_kind === "a_signer").length > 0 ? (
        <section className="rounded-xl border border-orange-500/40 bg-orange-500/[0.06] p-5">
          <h2 className="font-medium text-orange-300">✍️ Documents à signer</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Signez pour valider — votre devis sera confirmé automatiquement.
          </p>
          <ul className="mt-3 space-y-3">
            {files
              .filter((f) => f.from_admin && f.doc_kind === "a_signer")
              .map((file) => (
                <li
                  key={file.id}
                  className="rounded-lg border border-white/10 px-3 py-2.5 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">📄 {file.name}</span>
                    <a
                      href={`/api/files/${file.id}`}
                      className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/15"
                    >
                      Télécharger
                    </a>
                  </div>
                  {file.signed_name ? (
                    <p className="mt-2 text-xs font-medium text-green-400">
                      ✓ Signé par {file.signed_name} le{" "}
                      {file.signed_at
                        ? new Date(file.signed_at).toLocaleDateString("fr-FR")
                        : ""}
                    </p>
                  ) : quote.status === "attente_signature" ||
                    quote.status === "attente_acompte" ||
                    confirmed ? (
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        await signClientDocument(formData);
                      }}
                      className="mt-2"
                    >
                      <input type="hidden" name="quote_id" value={id} />
                      <input type="hidden" name="file_id" value={file.id} />
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="Votre prénom et nom"
                        className="w-56 rounded-md border border-white/10 bg-background px-2 py-1.5 text-xs outline-none focus:border-accent"
                      />
                      <SignaturePad />
                      <label className="mt-2 flex max-w-md items-start gap-1.5 text-left text-[11px] text-muted-foreground">
                        <input type="checkbox" name="consent" required className="mt-0.5" />
                        <span>
                          Je reconnais avoir lu et j&apos;accepte le contenu de ce
                          document ; ma signature vaut bon pour accord et
                          signature électronique.
                        </span>
                      </label>
                      <SubmitButton
                        pendingLabel="Signature en cours…"
                        className="mt-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500"
                      >
                        ✍️ Signer le document
                      </SubmitButton>
                    </form>
                  ) : (
                    <p className="mt-2 text-xs text-orange-300">
                      ⏳ En attente de signature — disponible après confirmation du devis
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {/* Acompte par virement : visible dès que les documents sont signés */}
      {confirmed || quote.status === "attente_acompte" ? (
        (() => {
          const total = (quote.total_cents ?? 0) / 100;
          const solde = Math.floor((total * 0.8) / 10) * 10;
          const acompte = total - solde;
          const libelle = `${quote.customer_name} — ${quote.event_date ?? ""}`;
          return (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="font-medium">💳 Acompte de réservation</h2>
              {quote.acompte_paid_at ? (
                <p className="mt-2 text-sm font-medium text-green-400">
                  ✓ Acompte reçu, merci ! Votre réservation est entièrement validée.
                </p>
              ) : quote.acompte_declared_at ? (
                <p className="mt-2 text-sm text-orange-300">
                  ⏳ Acompte déclaré envoyé le{" "}
                  {new Date(quote.acompte_declared_at).toLocaleDateString("fr-FR")} — en
                  attente de réception par le prestataire.
                </p>
              ) : (
                <>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Afin de confirmer définitivement votre réservation, merci de
                    régler l&apos;acompte de{" "}
                    <span className="font-semibold text-accent">
                      {formatEuros(Math.round(acompte * 100))}
                    </span>{" "}
                    par virement avec le libellé&nbsp;:{" "}
                    <span className="font-mono text-xs text-foreground">{libelle}</span>
                  </p>
                  <div className="mt-3 space-y-0.5 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                    <p>
                      <span className="text-muted-foreground">Titulaire :</span>{" "}
                      SOULAINE Maxime
                    </p>
                    <p className="break-all">
                      <span className="text-muted-foreground">IBAN :</span>{" "}
                      <span className="font-mono text-xs">
                        FR76 1027 8374 6200 0110 8580 173
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">BIC :</span>{" "}
                      <span className="font-mono text-xs">CMCIFR2A</span>
                    </p>
                  </div>
                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      await declareAcompteSent(formData);
                    }}
                    className="mt-3"
                  >
                    <input type="hidden" name="quote_id" value={id} />
                    <SubmitButton
                      pendingLabel="Envoi de la confirmation…"
                      className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
                    >
                      ✅ J&apos;ai envoyé l&apos;acompte
                    </SubmitButton>
                  </form>
                </>
              )}
            </section>
          );
        })()
      ) : null}

      {/* Musiques + fichiers par catégorie : ouverts dès les documents signés */}
      {confirmed || quote.status === "attente_acompte" ? (
        <ClientPlaylistEditor
          quoteId={id}
          tracks={tracks}
          files={files}
          moments={eventMoments(quote.formula_name)}
        />
      ) : (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <h2 className="font-medium">🎵 Musiques &amp; fichiers</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Cette section s&apos;ouvrira dès que vos documents (devis et contrat)
            seront <span className="font-medium text-green-400">signés</span> :
            vous pourrez alors choisir vos musiques par temps fort, votre
            blacklist et joindre vos fichiers.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            En attendant, vous pouvez déjà ajuster vos options et nous écrire
            via la messagerie.
          </p>
        </section>
      )}

      {/* Fichiers sans catégorie (anciens envois) */}
      <DiversFiles quoteId={id} files={files} />

      {/* Messagerie */}
      <ClientQuoteMessages quoteId={id} messages={messages} />
    </main>
  );
}

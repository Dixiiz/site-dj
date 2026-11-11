import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin-auth";
import { SendInvoiceForm } from "@/components/send-invoice-form";
import { DeleteInvoiceButton } from "@/components/delete-invoice-button";
import { FreeInvoiceLinker, type LinkableQuote } from "@/components/free-invoice-linker";
import { ValidateFactureButton, type FacturePaiementInfo } from "@/components/facture-paiement-buttons";
import { facturesDe, facturePayeDe, factureDeclareeDe } from "@/lib/urssaf-logic";
import { formatEuros } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STORAGE_FOLDER = "admin/factures-libres";
const LINE_ROWS = 6;

export default async function AdminFacturesPage() {
  if (!(await isAdmin())) {
    return <p className="p-8 text-sm text-muted-foreground">Accès refusé.</p>;
  }

  const supabase = createAdminClient();
  const { data: stored } = await supabase.storage
    .from("client-files")
    .list(STORAGE_FOLDER, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });

  const invoices = await Promise.all(
    (stored ?? [])
      .filter((file) => file.name.endsWith(".pdf"))
      .map(async (file) => {
        const { data } = await supabase.storage
          .from("client-files")
          .createSignedUrl(`${STORAGE_FOLDER}/${file.name}`, 60 * 60 * 24 * 7);
        const number = file.name.match(/F-\d{4}-\d{3}/)?.[0] ?? "—";
        return {
          name: file.name,
          number,
          url: data?.signedUrl ?? null,
          createdAt: file.created_at ?? new Date().toISOString(),
        };
      })
  );

  // Devis disponibles pour la liaison facultative : la facture apparaît alors
  // aussi dans les documents du devis. Les « soirées » créées par facture
  // libre sont exclues (pas de vrai devis derrière).
  const { data: quotesForLink } = await supabase
    .from("quotes")
    .select(
      "id, customer_name, customer_email, customer_phone, event_date, total_cents, formula_name, notes"
    )
    .order("event_date", { ascending: false, nullsFirst: false })
    .limit(300);
  const quoteOptions: LinkableQuote[] = (quotesForLink ?? [])
    .filter((q) => !(q.notes ?? "").includes("[[facture-libre]]"))
    .map((q) => ({
      id: q.id,
      customerName: q.customer_name ?? "",
      customerEmail: q.customer_email ?? "",
      customerPhone: q.customer_phone ?? "",
      formulaName: q.formula_name ?? "",
      totalCents: q.total_cents ?? 0,
      label: [
        q.customer_name || "Sans nom",
        q.event_date
          ? new Date(`${q.event_date}T12:00:00`).toLocaleDateString("fr-FR")
          : null,
        q.total_cents ? formatEuros(q.total_cents) : null,
      ]
        .filter(Boolean)
        .join(" — "),
    }));

  // État de paiement des factures DJ, lu depuis les notes (marqueurs posés à
  // la génération, déclaration du client, validation admin). Pour les
  // factures libres créées avant le marqueur, la note « Facture F-… générée »
  // + le montant de la soirée associée servent de repli.
  const facturesInfo = new Map<string, FacturePaiementInfo & { quoteId: string }>();
  for (const q of quotesForLink ?? []) {
    const notes = String(q.notes ?? "");
    for (const f of facturesDe(notes)) {
      facturesInfo.set(f.numero, {
        quoteId: q.id,
        payeLe: facturePayeDe(notes, f.numero),
        declareeLe: factureDeclareeDe(notes, f.numero),
        montantCents: f.montantCents,
      });
    }
    const legacy = /Facture (F-\d{4}-\d{3}) générée/.exec(notes)?.[1];
    if (legacy && !facturesInfo.has(legacy)) {
      facturesInfo.set(legacy, {
        quoteId: q.id,
        payeLe: null,
        declareeLe: null,
        montantCents: q.total_cents ?? null,
      });
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <p className="text-sm text-muted-foreground">
        <Link href="/admin/devis" className="hover:text-foreground">
          ← Retour aux devis
        </Link>
      </p>

      <h1 className="text-2xl font-medium">Générateur de factures libres</h1>
      <p className="text-sm text-muted-foreground">
        Pour les soirées non répertoriées sur le site : saisis les informations,
        la facture est générée en PDF avec la numérotation habituelle
        (F-{new Date().getFullYear()}-NNN) et archivée automatiquement.
      </p>
      {/* Formulaire natif POST : le PDF est téléchargé directement. */}
      <form
        action="/api/admin/free-invoice"
        method="post"
        className="space-y-6 rounded-xl border border-border p-6"
      >
        {/* Liaison facultative à un devis + pré-remplissage du % du total. */}
        <FreeInvoiceLinker quotes={quoteOptions} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="customer_name" className="text-sm font-medium">
              Nom du client / organisateur *
            </label>
            <input
              id="customer_name"
              name="customer_name"
              required
              placeholder="Ex. Société ABC, M. Dupont…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="event_type" className="text-sm font-medium">
              Type de prestation
            </label>
            <input
              id="event_type"
              name="event_type"
              placeholder="Ex. Soirée d'entreprise"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="customer_email" className="text-sm font-medium">
              E-mail
            </label>
            <input
              id="customer_email"
              name="customer_email"
              type="email"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="customer_phone" className="text-sm font-medium">
              Téléphone
            </label>
            <input
              id="customer_phone"
              name="customer_phone"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="customer_address" className="text-sm font-medium">
              Adresse du client
            </label>
            <input
              id="customer_address"
              name="customer_address"
              placeholder="Ex. 12 rue des Lilas"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="customer_postal_code" className="text-sm font-medium">
              Code postal
            </label>
            <input
              id="customer_postal_code"
              name="customer_postal_code"
              inputMode="numeric"
              placeholder="Ex. 41350"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="customer_city" className="text-sm font-medium">
              Ville
            </label>
            <input
              id="customer_city"
              name="customer_city"
              placeholder="Ex. Vineuil"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="event_date" className="text-sm font-medium">
              Date de l&apos;événement
            </label>
            <input
              id="event_date"
              name="event_date"
              type="date"
              required
              defaultValue={new Date().toLocaleDateString("fr-CA")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="event_location" className="text-sm font-medium">
              Lieu
            </label>
            <input
              id="event_location"
              name="event_location"
              placeholder="Ex. Salle des fêtes de Vineuil"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="start_time" className="text-sm font-medium">
              Heure de début
            </label>
            <input
              id="start_time"
              name="start_time"
              type="time"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="end_time" className="text-sm font-medium">
              Heure de fin
            </label>
            <input
              id="end_time"
              name="end_time"
              type="time"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
        {/* SUITE-LIGNES */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Lignes de facturation</p>
          <div className="grid grid-cols-[1fr_70px_110px] gap-2 px-1 text-xs font-medium text-muted-foreground">
            <span>Désignation</span>
            <span>Qté</span>
            <span>Prix unitaire (€)</span>
          </div>
          {Array.from({ length: LINE_ROWS }, (_, index) => (
            <div key={index} className="grid grid-cols-[1fr_70px_110px] gap-2">
              <input
                name="line_label"
                id={index === 0 ? "line_label_0" : undefined}
                placeholder={index === 0 ? "Ex. Prestation DJ — soirée d'entreprise" : ""}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                name="line_qty"
                type="number"
                min="0.25"
                step="0.25"
                defaultValue={1}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                name="line_price"
                id={index === 0 ? "line_price_0" : undefined}
                inputMode="decimal"
                placeholder="0,00"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Les lignes vides sont ignorées. Le total est calculé automatiquement.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Générer la facture PDF
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Factures libres générées</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune facture libre pour le moment.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {invoices.map((invoice) => (
              <li key={invoice.name} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {invoice.number} ·{" "}
                    {invoice.name
                      .replace(/\.pdf$/, "")
                      .replace(/^F-\d{4}-\d{3}_/, "")
                      .replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Créée le{" "}
                    {new Date(invoice.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  {/* Envoi de la facture par e-mail (lien signé 7 jours). */}
                  <SendInvoiceForm fileName={invoice.name} />
                  {/* Paiement : déclaration du client + validation admin qui
                      compte la facture dans le CA URSSAF. */}
                  {invoice.number !== "—" && facturesInfo.has(invoice.number) ? (
                    <div className="mt-1.5">
                      <ValidateFactureButton
                        quoteId={facturesInfo.get(invoice.number)!.quoteId}
                        numero={invoice.number}
                        info={facturesInfo.get(invoice.number)!}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {invoice.url ? (
                    <a
                      href={invoice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/10"
                    >
                      Télécharger
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">Lien indisponible</span>
                  )}
                  <DeleteInvoiceButton fileName={invoice.name} invoiceNumber={invoice.number} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* SUITE-LISTE */}
    </main>
  );
}
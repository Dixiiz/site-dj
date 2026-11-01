import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin-auth";
import { SendInvoiceForm } from "@/components/send-invoice-form";
import { DeleteInvoiceButton } from "@/components/delete-invoice-button";
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
              <li key={invoice.name} className="flex items-center justify-between gap-4 px-4 py-3">
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
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
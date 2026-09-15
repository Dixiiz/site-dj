"use client";

import {
  deleteAdminDocument,
  generateContratDocument,
  generateDevisDocument,
  generateDevisEtContratDocument,
  generateFactureDocument,
  sendInvoiceDocument,
  uploadAdminDocument,
} from "@/app/client-actions";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InvoiceAdjustments } from "@/components/admin-invoice-adjustments";
import { SubmitButton } from "@/components/submit-button";

type FileRow = {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  doc_kind: string;
  from_admin: boolean;
  signed_name: string | null;
};

function sizeLabel(bytes: number | null) {
  if (!bytes) return "";
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.round(bytes / 1024)} Ko`;
}

// Documents admin : « à signer » (devis, contrat…) et documents simples.
// Alimenté par le bundle déjà chargé (plus de requêtes propres) ; les actions
// serveur sont utilisées directement comme action de formulaire.
export function AdminQuoteDocuments({
  quoteId,
  files,
  adjustments,
}: {
  quoteId: string;
  files: FileRow[];
  adjustments: { label: string; amount_cents: number }[];
}) {
  const allFiles = files ?? [];

  const adminFiles = allFiles.filter((f) => f.from_admin === true);
  const toSign = adminFiles.filter((f) => f.doc_kind === "a_signer");
  const info = adminFiles.filter((f) => f.doc_kind !== "a_signer");

  const row = (file: FileRow, showSign: boolean) => (
    <li
      key={file.id}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm sm:gap-3"
    >
      <span className="shrink-0"></span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate font-medium">{file.name}</p>
        <p className="text-[11px] text-muted-foreground">{sizeLabel(file.size_bytes)}</p>
      </div>
      {showSign ? (
        file.signed_name ? (
          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
            ✓ Signé par {file.signed_name}
          </span>
        ) : (
          <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-400">
            ⏳ En attente de signature
          </span>
        )
      ) : null}
      <a
        href={`/api/files/${file.id}`}
        download
        className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/15"
      >
        ↓
      </a>
      {/* Pour les factures : envoi manuel de l'e-mail au client (sur clic). */}
      {file.name.startsWith("Facture ") && file.name.endsWith(".pdf") ? (
        <form action={async (fd: FormData) => { await sendInvoiceDocument(fd); }}>
          <input type="hidden" name="quote_id" value={quoteId} />
          <input type="hidden" name="file_id" value={file.id} />
          <SubmitButton
            pendingLabel="Envoi…"
            confirm={`Envoyer « ${file.name} » au client par e-mail ?`}
            className="rounded-lg border border-blue-500/40 px-2.5 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/10"
          >
            ✉ Envoyer au client
          </SubmitButton>
        </form>
      ) : null}
      <form action={deleteAdminDocument}>
        <input type="hidden" name="quote_id" value={quoteId} />
        <input type="hidden" name="file_id" value={file.id} />
        <SubmitButton
          pendingLabel="Suppression…"
          confirm={`Supprimer « ${file.name} » ?`}
          className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
        >
          Supprimer
        </SubmitButton>
      </form>
    </li>
  );

  return (
    <div className="space-y-4">
      {/* Documents à signer */}
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium text-orange-400">Documents à signer</h3>
          <div className="flex flex-wrap items-start gap-2">
          <form action={async (fd: FormData) => { await generateDevisDocument(fd); }}>
            <input type="hidden" name="quote_id" value={quoteId} />
            {/* Personnalisation du devis (facultatif) */}
            <details className="mb-2 text-left">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-accent">
                ⚙️ Personnaliser le devis
              </summary>
              <div className="mt-2 space-y-2 rounded-lg border border-border p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-muted-foreground">
                    Titre
                    <Input
                      name="devis_title"
                      placeholder="DEVIS — Propul'Sound DJ"
                      className="mt-1 text-xs"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Sous-titre
                    <Input
                      name="devis_subtitle"
                      placeholder="DJ & Show Lumière — Huisseau-sur-Cosson (41350)"
                      className="mt-1 text-xs"
                    />
                  </label>
                </div>
                <label className="block text-xs text-muted-foreground">
                  Conditions (le nombre de jours de validité est remplacé
                  automatiquement)
                  <Input
                    name="devis_conditions"
                    placeholder="Devis valable 30 jours. Bon pour accord (signature) :"
                    className="mt-1 text-xs"
                  />
                </label>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-xs text-muted-foreground">
                    Validité (jours)
                    <Input
                      type="number"
                      name="devis_validity_days"
                      min={1}
                      placeholder="30"
                      className="mt-1 w-24 text-xs"
                    />
                  </label>
                </div>
                <label className="block text-xs text-muted-foreground">
                  Notes particulières (ajoutées avant le total, une ligne = une
                  ligne du PDF)
                  <textarea
                    name="devis_notes"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-accent"
                  />
                </label>
              </div>
            </details>
            <SubmitButton
              pendingLabel="Génération du devis…"
              className="rounded-lg border border-accent/50 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/15"
            >
              Générer le devis PDF
            </SubmitButton>
            {/* Génère les DEUX documents d'un coup : un seul e-mail au client */}
            <SubmitButton
              pendingLabel="Génération du devis + contrat…"
              formAction={async (fd: FormData) => { await generateDevisEtContratDocument(fd); }}
              className="rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:border-cyan-400 hover:bg-cyan-400/25 hover:text-cyan-100"
            >
              📝 Générer devis + contrat
            </SubmitButton>
          </form>
          <form action={async (fd: FormData) => { await generateContratDocument(fd); }}>
            <input type="hidden" name="quote_id" value={quoteId} />
            <SubmitButton
              pendingLabel="Génération du contrat…"
              className="rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:border-cyan-400 hover:bg-cyan-400/25 hover:text-cyan-100"
            >
              📝 Générer le contrat PDF
            </SubmitButton>
          </form>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Généré automatiquement depuis la prestation choisie — le client le
          signe dans son espace, ce qui confirme le devis.
        </p>
        {toSign.length > 0 ? (
          <ul className="mt-3 space-y-2">{toSign.map((f) => row(f, true))}</ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Aucun document à signer pour le moment.
          </p>
        )}
      </div>

      {/* Documents simples */}
      <div className="rounded-xl border border-border p-4">
        <h3 className="font-medium text-muted-foreground">📎 Documents simples</h3>
        <form action={async (fd: FormData) => { await generateFactureDocument(fd); }} className="mt-2">
          <input type="hidden" name="quote_id" value={quoteId} />
          <SubmitButton
            pendingLabel="Génération de la facture…"
            className="rounded-lg border border-green-500/50 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:border-green-400 hover:bg-green-400/25 hover:text-green-200"
          >
            Générer la facture PDF
          </SubmitButton>
        </form>
        <InvoiceAdjustments quoteId={quoteId} initial={adjustments} />
        {info.length > 0 ? (
          <ul className="mt-3 space-y-2">{info.map((f) => row(f, false))}</ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Aucun document simple.</p>
        )}
        <form action={async (fd: FormData) => { await uploadAdminDocument(fd); }} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="quote_id" value={quoteId} />
          <input type="hidden" name="doc_kind" value="info" />
          <Input
            type="file"
            name="file"
            required
            className="max-w-xs cursor-pointer text-xs file:cursor-pointer file:mr-2 file:rounded-md file:border-0 file:bg-white/10 file:px-2.5 file:py-1 file:text-xs"
          />
          <SubmitButton pendingLabel="Envoi…" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Envoyer (document simple)
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

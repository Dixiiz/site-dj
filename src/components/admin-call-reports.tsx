"use client";

import { useState } from "react";
import { createCallReport, deleteCallReport } from "@/app/client-actions";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";

export type CallReportRow = {
  id: string;
  called_at: string;
  contact: string | null;
  summary: string;
  key_points: string[] | null;
  next_steps: string[] | null;
  visible_to_client: boolean;
};

const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

// datetime-local (naïf, fuseau du navigateur) -> ISO UTC explicite.
// Même logique que les RDV : le serveur Vercel tourne en UTC.
function localInputToIso(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

const dateFr = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Côté ADMIN : historique des appels + formulaire structuré. Le « propre »
// est automatique : récit, puces « à retenir » et « à faire » sont rendues
// de façon standard dans l'espace client et sur la fiche soirée.
export function AdminCallReports({
  quoteId,
  reports,
}: {
  quoteId: string;
  reports: CallReportRow[];
}) {
  const [open, setOpen] = useState(false);
  const sorted = [...(reports ?? [])].sort(
    (a, b) => new Date(b.called_at).getTime() - new Date(a.called_at).getTime()
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Comptes rendus d&apos;appel
        </h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
        >
          {open ? "Fermer" : "＋ Nouveau compte rendu"}
        </button>
      </div>

      {open ? <CallReportForm quoteId={quoteId} onDone={() => setOpen(false)} /> : null}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun compte rendu. Note ici tes appels avec le client : le résumé
          part dans son espace client (si publié) et sur la fiche soirée.
        </p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((report) => (
            <CallReportItem key={report.id} report={report} quoteId={quoteId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CallReportItem({ report, quoteId }: { report: CallReportRow; quoteId: string }) {
  return (
    <li className="rounded-xl border border-border p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">📞 {dateFr(report.called_at)}</span>
        {report.contact ? (
          <span className="text-muted-foreground">· avec {report.contact}</span>
        ) : null}
        <Badge
          variant="outline"
          className={
            report.visible_to_client
              ? "border-green-500/60 text-green-400"
              : "border-zinc-500/60 text-zinc-400"
          }
        >
          {report.visible_to_client ? "Client : visible" : "Interne"}
        </Badge>
        <form action={deleteCallReport} className="ml-auto">
          <input type="hidden" name="report_id" value={report.id} />
          <input type="hidden" name="quote_id" value={quoteId} />
          <SubmitButton
            pendingLabel="…"
            confirm="Supprimer ce compte rendu ?"
            className="rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
          >
            Supprimer
          </SubmitButton>
        </form>
      </div>
      <p className="mt-2 whitespace-pre-wrap">{report.summary}</p>
      {(report.key_points ?? []).length > 0 ? (
        <ReportList title="À retenir" items={report.key_points ?? []} />
      ) : null}
      {(report.next_steps ?? []).length > 0 ? (
        <ReportList title="Prochaines étapes" items={report.next_steps ?? []} />
      ) : null}
    </li>
  );
}

function CallReportForm({
  quoteId,
  onDone,
}: {
  quoteId: string;
  onDone: () => void;
}) {
  return (
    <form
      action={async (fd: FormData) => {
        const v = String(fd.get("called_at") ?? "").trim();
        if (v) fd.set("called_at", localInputToIso(v));
        await createCallReport(fd);
        onDone();
      }}
      className="space-y-3 rounded-xl border border-border bg-muted/30 p-4"
    >
      <input type="hidden" name="quote_id" value={quoteId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Date et heure de l&apos;appel</label>
          <input
            type="datetime-local"
            name="called_at"
            defaultValue={toLocalInput(new Date().toISOString())}
            className={input}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Avec qui (optionnel)</label>
          <input name="contact" placeholder="Ex. la mariée, M. et Mme Dupont…" className={input} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Ce dont on a parlé</label>
        <textarea
          name="summary"
          required
          rows={4}
          placeholder="Résumé de l'échange, au fil de la discussion…"
          className={input}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Décisions / points clés (1 par ligne)
          </label>
          <textarea
            name="key_points"
            rows={3}
            placeholder={"Horaires confirmés 19h → 2h\nMicro pour le discours du témoin"}
            className={input}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Prochaines étapes (1 par ligne)</label>
          <textarea
            name="next_steps"
            rows={3}
            placeholder={"Le client envoie le plan de la salle\nVisite du lieu le 12/01"}
            className={input}
          />
        </div>
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="visible_to_client"
          defaultChecked
          className="size-4 accent-[#21619A]"
        />
        <span>
          Visible par le client
          <span className="ml-1 text-xs text-muted-foreground">
            — publié dans son espace (+ pastille nouveautés)
          </span>
        </span>
      </label>
      <div className="flex gap-2">
        <SubmitButton
          pendingLabel="Enregistrement…"
          className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          Enregistrer le compte rendu
        </SubmitButton>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

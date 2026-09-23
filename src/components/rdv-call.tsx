"use client";

import { useState, useTransition } from "react";
import {
  adminProposeRdv,
  adminRdvDecision,
  clientRdvResponse,
} from "@/app/client-actions";
import { RdvAvailabilityForm } from "@/components/rdv-form";
import { SubmitButton } from "@/components/submit-button";

type RdvRow = {
  id: string;
  proposed_at: string | null;
  availability: string | null;
  status: string;
  origin?: string | null; // « admin » : proposé par Maxime ; sinon proposé par le client
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });

// Côté CLIENT : répond aux propositions de Maxime (accepter / refuser /
// contre-proposer), envoie ses disponibilités, voit le RDV validé + calendrier.
export function RdvCallSection({
  quoteId,
  requests,
}: {
  quoteId: string;
  requests: RdvRow[];
}) {
  const validated = requests.find((r) => r.status === "valide" && r.proposed_at);
  // Propositions de l'admin en attente de réponse du client.
  const adminPending = requests.filter(
    (r) => r.origin === "admin" && r.status === "propose" && r.proposed_at
  );
  // Demandes du client en attente de confirmation par l'admin.
  const clientPending = requests.filter(
    (r) => (r.origin ?? "client") === "client" && r.status === "propose"
  );

  return (
    <div id="rdv" className="rounded-xl border border-border bg-muted/50 p-5">
      <h2 className="font-medium">Prévoir un point téléphonique</h2>
      {validated ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-medium text-green-400">
            ✓ RDV confirmé : {fmt(validated.proposed_at!)}
          </p>
          <p className="text-muted-foreground">
            Maxime t&apos;appelle à ce moment-là. Prépare tes questions !
          </p>
          <a
            href={`/api/calendar/rdv/${quoteId}`}
            className="inline-block rounded-lg border border-accent/50 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
          >
            Ajouter à mon calendrier
          </a>
        </div>
      ) : null}
      {adminPending.length > 0 ? (
        <RdvProposalReply proposals={adminPending} />
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Indique tes disponibilités dans la semaine : Maxime confirme un
            créneau et t&apos;appelle pour faire le point sur ta soirée.
          </p>
          <RdvAvailabilityForm quoteId={quoteId} />
          {clientPending.length > 0 ? (
            <div className="mt-3 space-y-1 text-sm text-orange-300">
              {clientPending.map((r) => (
                <p key={r.id}>En attente de confirmation : {r.availability ?? fmt(r.proposed_at!)}</p>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

// Réponse du client aux créneaux proposés par Maxime : accepter l'un d'eux,
// refuser tous, ou refuser en contre-proposant une autre date et heure.
function RdvProposalReply({ proposals }: { proposals: RdvRow[] }) {
  const [counterOpen, setCounterOpen] = useState(false);
  const [counter, setCounter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function respond(rdvId: string, decision: "accepte" | "refuse", withCounter = false) {
    setError(null);
    if (withCounter && !counter) {
      setError("Choisis d'abord une date et une heure.");
      return;
    }
    const fd = new FormData();
    fd.set("rdv_id", rdvId);
    fd.set("decision", decision);
    if (withCounter) fd.set("counter_datetime", counter);
    startTransition(async () => {
      const res = await clientRdvResponse(fd);
      if (res && !res.ok) setError(res.error ?? "Erreur.");
    });
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm font-medium">Maxime te propose un appel :</p>
      <ul className="space-y-2">
        {proposals.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
          >
            <span className="font-medium">{fmt(r.proposed_at!)}</span>
            <button
              type="button"
              onClick={() => respond(r.id, "accepte")}
              disabled={pending}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-60"
            >
              ✓ Accepter
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        {counterOpen ? (
          <>
            <input
              type="datetime-local"
              value={counter}
              onChange={(e) => setCounter(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => respond(proposals[0].id, "refuse", true)}
              disabled={pending}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Envoi…" : "Envoyer ma contre-proposition"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => respond(proposals[0].id, "refuse")}
              disabled={pending}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-60"
            >
              ✗ Aucun de ces créneaux
            </button>
            <button
              type="button"
              onClick={() => setCounterOpen(true)}
              disabled={pending}
              className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-60"
            >
              Proposer un autre moment
            </button>
          </>
        )}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

// Côté ADMIN : proposer des créneaux au client, suivre ses réponses et
// confirmer les demandes du client. Alimenté par le bundle (plus de requête
// propre) ; monté uniquement à l'ouverture du devis.
export function AdminRdvRequests({
  quoteId,
  requests,
}: {
  quoteId: string;
  requests: RdvRow[];
}) {
  const rows = requests ?? [];
  const adminRows = rows.filter((r) => r.origin === "admin");
  const clientRows = rows.filter((r) => (r.origin ?? "client") === "client");

  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="font-medium text-accent">RDV téléphonique</h3>
      <AdminRdvPropose quoteId={quoteId} />
      {adminRows.length > 0 ? (
        <div className="mt-4 space-y-1 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Propositions envoyées au client
          </p>
          <ul className="space-y-1">
            {adminRows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <span>{fmt(r.proposed_at!)}</span>
                {r.status === "valide" ? (
                  <span className="text-xs font-medium text-green-400">✓ accepté par le client</span>
                ) : r.status === "refuse" ? (
                  <span className="text-xs text-zinc-400">refusé</span>
                ) : (
                  <span className="text-xs text-orange-300">en attente de réponse</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {clientRows.length > 0 ? (
        <ul className="mt-4 space-y-4">
          <li className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Demandes du client
          </li>
          {clientRows.map((r) => (
            <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{r.availability ?? fmt(r.proposed_at!)}</p>
              {r.status === "valide" ? (
                <p className="mt-1 text-xs font-medium text-green-400">
                  ✓ Confirmé — {fmt(r.proposed_at!)}
                </p>
              ) : r.status === "refuse" ? (
                <p className="mt-1 text-xs text-zinc-400">Refusé</p>
              ) : (
                <form
                  action={async (fd: FormData) => {
                    await adminRdvDecision(fd);
                  }}
                  className="mt-2 flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="rdv_id" value={r.id} />
                  <input type="hidden" name="decision" value="valide" />
                  <input
                    type="datetime-local"
                    name="rdv_datetime"
                    required
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500"
                  >
                    ✓ Confirmer ce créneau
                  </button>
                  <button
                    type="submit"
                    formNoValidate
                    name="decision"
                    value="refuse"
                    className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    Refuser
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// Formulaire de proposition : 1 à 3 créneaux envoyés au client, qui reçoit
// un e-mail et répond depuis son espace (accepter / refuser / contre-proposer).
function AdminRdvPropose({ quoteId }: { quoteId: string }) {
  const input =
    "rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-accent";
  return (
    <form
      action={async (fd: FormData) => {
        await adminProposeRdv(fd);
      }}
      className="mt-3 flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="quote_id" value={quoteId} />
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Créneau(x) proposé(s) au client (jusqu&apos;à 3)
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input type="datetime-local" name="slot1" required className={input} />
          <input type="datetime-local" name="slot2" className={input} />
          <input type="datetime-local" name="slot3" className={input} />
        </div>
      </div>
      <SubmitButton
        pendingLabel="Envoi…"
        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
      >
        Proposer au client
      </SubmitButton>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { creerEcheancier, startAcompteCheckout } from "@/app/client-actions";
import { acompteCents, montantsEcheances, montantsEcheancesSolde } from "@/lib/installments";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";

export type ScheduleRow = {
  numero: number;
  total: number;
  amount_cents: number;
  due_date: string;
  status: "a_payer" | "payee";
};

function euros(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

export default function PaymentPanel({
  quoteId,
  totalCents,
  eventDate,
  initial,
  acomptePaid = false,
  acompteDeclared = false,
}: {
  quoteId: string;
  totalCents: number;
  eventDate: string | null;
  initial: ScheduleRow[];
  acomptePaid?: boolean;
  acompteDeclared?: boolean;
}) {
  const [rows, setRows] = useState<ScheduleRow[]>(initial);
  const [pending, startTransition] = useTransition();

  const dejaPaye = rows.filter((r) => r.status === "payee").length;
  const payeCents = rows.filter((r) => r.status === "payee").reduce((s, r) => s + r.amount_cents, 0);
  const total = Number.isFinite(totalCents) ? totalCents : 0;
  const acompte = acompteCents(total);
  const solde = Math.max(0, total - acompte);

  function choisir(n: number) {
    const fd = new FormData();
    fd.set("quote_id", quoteId);
    fd.set("nombre", String(n));
    startTransition(async () => {
      const res = await creerEcheancier(fd);
      if (res.ok) {
        toast.success(res.message ?? "Échéancier créé !");
        // Reconstruit l'affichage localement (la page se recharge via router.refresh du parent).
        const { first, rest } = acomptePaid
          ? montantsEcheancesSolde(solde, n)
          : montantsEcheances(total, n);
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const event = eventDate ? new Date(`${eventDate}T12:00:00`) : null;
        const daysUntil = event
          ? Math.max(10, Math.floor((event.getTime() - today.getTime()) / 86400_000) - 2)
          : 30;
        const firstDue = new Date(today.getTime() + 3 * 86400_000);
        const step = Math.floor(Math.max(7, daysUntil - 3) / Math.max(1, n - 1));
        setRows(
          Array.from({ length: n }, (_, i) => ({
            numero: i + 1,
            total: n,
            amount_cents: i === 0 ? first : rest,
            due_date: new Date(firstDue.getTime() + i * step * 86400_000)
              .toISOString()
              .slice(0, 10),
            status: "a_payer" as const,
          }))
        );
      } else {
        toast.error(res.error ?? "Erreur");
      }
    });
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/50 p-5">
        <h2 className="font-medium">Paiement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          À toi de choisir — le paiement en plusieurs fois est une{" "}
          <strong className="text-foreground">option</strong>, jamais une obligation.
        </p>

        {rows.length === 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* Option 1 : paiement classique (acompte puis solde) */}
            <div className="flex flex-col rounded-lg border border-accent/40 bg-accent/5 p-4">
              <p className="text-sm font-medium">
                Option 1 — Paiement classique{" "}
                <span className="ml-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                  Le plus simple
                </span>
              </p>
              <p className="mt-1.5 flex-1 text-xs text-muted-foreground">
                Réglez l&apos;acompte de <strong className="text-foreground">{euros(acompte)}</strong>{" "}
                pour verrouiller votre date, puis le solde ({euros(solde)}) au plus
                tard 2 jours avant la soirée.
              </p>
              {acomptePaid || acompteDeclared ? (
                <p className="mt-3 rounded-md bg-green-100 px-3 py-2 text-xs font-medium text-green-700">
                  ✓ Acompte réglé
                  {acompteDeclared && !acomptePaid ? " (virement en attente de réception)" : ""} —
                  il ne reste que le solde. Vous pouvez aussi l&apos;étaler avec
                  l&apos;option 2.
                </p>
              ) : (
                <form action={startAcompteCheckout} className="mt-3">
                  <input type="hidden" name="quote_id" value={quoteId} />
                  <SubmitButton
                    pendingLabel="Redirection…"
                    className="w-full rounded-md bg-[#21619A] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1a4d7a]"
                  >
                    💳 Payer l&apos;acompte par carte
                  </SubmitButton>
                </form>
              )}
              {!acomptePaid ? (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Ou par virement : voir l&apos;onglet « Ma soirée ».
                </p>
              ) : null}
            </div>

            {/* Option 2 : paiement en plusieurs fois (optionnel) */}
            <div className="flex flex-col rounded-lg border border-border bg-background p-4">
              <p className="text-sm font-medium">
                Option 2 — Étaler en plusieurs fois{" "}
                <span className="ml-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  Optionnel
                </span>
              </p>
              <p className="mt-1.5 flex-1 text-xs text-muted-foreground">
                De 2 à 10 fois par carte, toujours avant la soirée. Cliquez sur un
                format pour créer votre échéancier :
              </p>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                  const m = acomptePaid ? montantsEcheancesSolde(solde, n) : montantsEcheances(total, n);
                  return (
                    <button
                      key={n}
                      disabled={pending}
                      onClick={() => choisir(n)}
                      title={`Créer un échéancier en ${n} fois`}
                      className="rounded-md border border-border p-2 text-center transition-all hover:border-accent hover:shadow-sm disabled:opacity-50"
                    >
                      <span className="block text-sm font-semibold">{n}×</span>
                      <span className="block text-xs text-muted-foreground">
                        {euros(m.first)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Montants par échéance, frais de paiement en ligne inclus. Aucun
                échéancier n&apos;est créé sans votre clic — et le virement reste
                toujours possible.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {dejaPaye}/{rows.length} échéance(s) réglée(s)
              </span>
              <span className="font-medium">
                {euros(payeCents)} / {euros(rows.reduce((s, r) => s + r.amount_cents, 0))}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-[#21619A] transition-all"
                style={{ width: `${(dejaPaye / rows.length) * 100}%` }}
              />
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border bg-background">
              {rows.map((r) => (
                <li key={r.numero} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div>
                    <span className="font-medium">
                      Échéance {r.numero}/{r.total}
                    </span>
                    {r.numero === 1 ? (
                      <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                        Acompte
                      </span>
                    ) : null}
                    <span className="ml-2 text-muted-foreground">
                      avant le {new Date(`${r.due_date}T12:00:00`).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{euros(r.amount_cents)}</span>
                    {r.status === "payee" ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        ✓ Payée
                      </span>
                    ) : (
                      <a
                        href={`/paiement/${quoteId}/${r.numero}`}
                        className="rounded-md bg-[#21619A] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1a4d7a]"
                      >
                        Payer
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
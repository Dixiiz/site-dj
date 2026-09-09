"use client";

import { useState, useTransition } from "react";
import { creerEcheancier } from "@/app/client-actions";
import { toast } from "sonner";

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

// Montant par échéance avec frais Stripe intégrés (1,5 % + 0,25 €/paiement).
function montantEcheance(totalCents: number, n: number) {
  return Math.ceil((totalCents / n + 25) / 0.985);
}

export default function PaymentPanel({
  quoteId,
  totalCents,
  eventDate,
  initial,
}: {
  quoteId: string;
  totalCents: number;
  eventDate: string | null;
  initial: ScheduleRow[];
}) {
  const [rows, setRows] = useState<ScheduleRow[]>(initial);
  const [pending, startTransition] = useTransition();

  const dejaPaye = rows.filter((r) => r.status === "payee").length;
  const payeCents = rows.filter((r) => r.status === "payee").reduce((s, r) => s + r.amount_cents, 0);

  function choisir(n: number) {
    const fd = new FormData();
    fd.set("quote_id", quoteId);
    fd.set("nombre", String(n));
    startTransition(async () => {
      const res = await creerEcheancier(fd);
      if (res.ok) {
        toast.success(res.message ?? "Échéancier créé !");
        // Reconstruit l'affichage localement (la page se recharge via router.refresh du parent).
        const amount = montantEcheance(totalCents, n);
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const event = eventDate ? new Date(`${eventDate}T12:00:00`) : null;
        const daysUntil = event
          ? Math.max(10, Math.floor((event.getTime() - today.getTime()) / 86400_000) - 2)
          : 30;
        setRows(
          Array.from({ length: n }, (_, i) => ({
            numero: i + 1,
            total: n,
            amount_cents: amount,
            due_date: new Date(
              today.getTime() + Math.ceil(((i + 1) * daysUntil) / n) * 86400_000
            )
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
        <h2 className="font-medium">Paiement en plusieurs fois</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Étalez le règlement de votre soirée en 2 à 10 fois, par carte bancaire.
          Aucune échéance après la soirée.
        </p>

        {rows.length === 0 ? (
          <>
            <p className="mt-4 text-sm font-medium">Choisissez votre échéancier :</p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-9">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  disabled={pending}
                  onClick={() => choisir(n)}
                  className="rounded-lg border border-border bg-background p-3 text-center transition-all hover:border-accent hover:shadow-md disabled:opacity-50"
                >
                  <span className="block text-lg font-semibold">{n}×</span>
                  <span className="block text-xs text-muted-foreground">
                    {euros(montantEcheance(totalCents, n))}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Les frais de paiement en ligne (1,5 % + 0,25 € par échéance) sont inclus
              dans les montants affichés.
            </p>
          </>
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
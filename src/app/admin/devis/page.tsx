import { deleteQuote } from "@/app/actions";
import { markQuoteSeen, resolveQuoteOptions, resolveQuoteDetails, notifyDevisReady } from "@/app/client-actions";
import { QuickStatusForm } from "@/components/quick-status-form";
import { confirmAcompteReceived } from "@/app/client-actions";
import { SubmitButton } from "@/components/submit-button";
import { AutoRefresh } from "@/components/auto-refresh";
import { AdminQuoteDetails } from "@/components/admin-quote-details";
import { updateQuoteStatus } from "@/app/actions";
import { DevisFilterBar } from "@/components/devis-filter-bar";
import { AdminQuoteLazyFolder } from "@/components/admin-quote-lazy-folder";

import { Badge } from "@/components/ui/badge";
import { formatEuros } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendScheduledEmails } from "@/lib/email-jobs";
import type { SelectedOption } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  nouveau: { label: "Nouveau", className: "border-accent/60 text-accent" },
  contacte: { label: "Contacté", className: "border-yellow-500/60 text-yellow-400" },
  attente_signature: {
    label: "En attente de signature",
    className: "border-orange-500/60 text-orange-400",
  },
  confirme: { label: "Confirmé", className: "border-green-500/60 text-green-400" },
  attente_acompte: {
    label: "En attente de l'acompte",
    className: "border-cyan-500/60 text-cyan-400",
  },
  refuse: { label: "Refusé", className: "border-red-500/60 text-red-400" },
  annule: { label: "Annulé", className: "border-zinc-500/60 text-zinc-400" },
};

function optionShort(name: string, qty?: number): string {
  const n = name.toLowerCase();
  // Le CO2 d'abord : son nom contient « fumée » !
  if (n.includes("co2")) return qty === 2 ? "Pistolets CO2 ×2" : "Pistolet CO2";
  if (n.includes("fumée lourde") || n.includes("fumee lourde")) return "Fumée lourde";
  if (n.includes("fumée") || n.includes("fumee")) return "Fumée";
  if (n.includes("étincelles") || n.includes("etincelles")) return "Étincelles";
  if (n.includes("cérémonie")) return "Cérémonie";
  if (n.includes("light+")) return "Light+";
  return name.length > 14 ? `${name.slice(0, 12)}…` : name;
}

function eventKind(formulaName: string): string {
  const n = formulaName.toLowerCase();
  if (n.includes("mariage") || n.includes("essential") || n.includes("deluxe") || n.includes("ultime"))
    return "Mariage";
  if (n.includes("set dj") || n.includes("clé en main") || n.includes("club") || n.includes("afterwork") || n.includes("association"))
    return "Bar / Club";
  return "Anniversaire / Privé";
}

export default async function DevisPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tri?: string; focus?: string; cree?: string; revise?: string; erreur_revise?: string }>;
}) {
  // Filet de sécurité : si le Cron Vercel n'a pas tourné, on traite les
  // e-mails planifiés (relance J+10, avis post-soirée) à l'ouverture de l'admin.
  sendScheduledEmails().catch((e) => console.error("[email-jobs]", e));

  const { q, tri, focus, cree, revise, erreur_revise } = await searchParams as { q?: string; tri?: string; focus?: string; cree?: string; revise?: string; erreur_revise?: string };
  const query = (q ?? "").trim().toLowerCase();
  const supabase = createAdminClient();

  // Les 3 requêtes partent en parallèle (au lieu d'être enchaînées) : le
  // temps de chargement de la page devient celui de la plus lente des trois.
  const [quotesRes, schedulesRes, messagesRes] = await Promise.all([
    supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("payment_schedule")
      .select("quote_id, numero, total, amount_cents, due_date, status")
      .order("numero", { ascending: true }),
    supabase
      .from("quote_messages")
      .select("id, quote_id, sender, body, created_at")
      .order("created_at", { ascending: true }),
  ]);
  const quotes = quotesRes.data;

  // Échéanciers de paiement (barre de progression dans le détail de chaque devis).
  const schedulesByQuote = new Map<string, { numero: number; total: number; amount_cents: number; due_date: string; status: string }[]>();
  for (const row of schedulesRes.data ?? []) {
    const list = schedulesByQuote.get(row.quote_id) ?? [];
    list.push({ numero: row.numero, total: row.total, amount_cents: row.amount_cents, due_date: row.due_date, status: row.status });
    schedulesByQuote.set(row.quote_id, list);
  }

  // Messages regroupés par devis (conversation initiale ; ensuite rafraîchie en direct).
  const allMessages = messagesRes.data;
  const initialMessagesByQuote = new Map<string, typeof allMessages>();
  for (const message of allMessages ?? []) {
    const list = initialMessagesByQuote.get(message.quote_id) ?? [];
    list.push(message);
    initialMessagesByQuote.set(message.quote_id, list);
  }

  const todayIso = new Date().toLocaleDateString("fr-CA");
  const isPast = (quote: { event_date: string | null }) =>
    Boolean(quote.event_date && quote.event_date < todayIso);

  // Par défaut, les soirées passées sont cachées (visibles via « archives » ou
  // « tous ») — pour garder la liste de travail propre.
  const showPast = tri === "passes" || tri === "tous";

  const filtered = (quotes ?? []).filter((quote) => {
    if (tri === "passes" && !isPast(quote)) {
      return false;
    }
    if (!showPast && isPast(quote)) {
      return false;
    }
    if (!query) return true;
    const haystack = [
      quote.customer_name,
      quote.customer_email,
      quote.customer_phone,
      quote.event_location,
      quote.event_date,
      quote.formula_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  // Tri : réception (récent → ancien), date d'événement, ou prix.
  const sorters: Record<string, (a: (typeof filtered)[0], b: (typeof filtered)[0]) => number> = {
    recent: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ancien: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    date_proche: (a, b) =>
      new Date(a.event_date ?? "9999-12-31").getTime() -
      new Date(b.event_date ?? "9999-12-31").getTime(),
    date_loin: (a, b) =>
      new Date(b.event_date ?? "0000-01-01").getTime() -
      new Date(a.event_date ?? "0000-01-01").getTime(),
    cher: (a, b) => (b.total_cents ?? 0) - (a.total_cents ?? 0),
    moins_cher: (a, b) => (a.total_cents ?? 0) - (b.total_cents ?? 0),
    passes: (a, b) =>
      new Date(b.event_date ?? "0000-01-01").getTime() -
      new Date(a.event_date ?? "0000-01-01").getTime(),
  };
  filtered.sort(sorters[tri ?? "date_proche"] ?? sorters.date_proche);

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30000} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium">Devis reçus</h1>
          <p className="text-sm text-muted-foreground">
            Cliquez sur un devis pour voir tous les détails et changer son statut.
          </p>
        </div>
        <a
          href="/admin/devis/nouveau"
          className="shrink-0 rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
        >
          ➕ Nouveau devis sur mesure
        </a>
      </div>

      <DevisFilterBar q={q} tri={tri} />

      {cree ? (
        <p className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-400">
          Devis sur mesure créé ✓ Il apparaît dans la liste ci-dessous (pensez à le qualifier si besoin).
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">Aucun devis correspondant.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((quote) => {
            const options = (quote.selected_options ?? []) as SelectedOption[];
            const status = STATUS_STYLES[quote.status] ?? {
              label: quote.status,
              className: "border-border",
            };
            return (
              <details
                key={quote.id}
                open={quote.id === focus || undefined}
                className={`rounded-xl border bg-card transition-colors hover:border-accent/50 open:border-accent/70 ${
                  quote.id === focus ? "border-accent shadow-[0_0_24px_-8px_var(--accent)]" : "border-border"
                }`}
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 p-4 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-32">
                    <div className="font-medium">
                      {quote.event_date
                        ? new Date(quote.event_date).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {eventKind(quote.formula_name ?? "")}
                    </div>
                  </div>
                  <div className="min-w-44 flex-1">
                    <div className="font-medium">{quote.customer_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {quote.event_location ?? ""}
                    </div>
                    {/* Type d'événement + aperçu des options */}
                    <div className="mt-0.5 truncate text-xs">
                      <span className="text-accent">{eventKind(quote.formula_name ?? "")}</span>
                      {options.length > 0 ? (
                        <span className="text-muted-foreground">
                          {" · 🎛️ "}
                          {options.map((o) => optionShort(o.name, o.qty)).join(" · ")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    {options.length > 0 ? (
                      <Badge className="border-green-500/60 text-green-400" variant="outline">
                        {options.length} option{options.length > 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <Badge className="border-red-500/60 text-red-400" variant="outline">
                        Sans option
                      </Badge>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-3 text-right">
                    <div>
                      <div className="font-semibold">{formatEuros(quote.total_cents ?? 0)}</div>
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                      {quote.acompte_paid_at ? (
                        <Badge variant="outline" className="mt-1 border-green-500/60 text-green-400">
                          💰 Acompte réglé le {new Date(quote.acompte_paid_at).toLocaleDateString("fr-FR")}
                        </Badge>
                      ) : quote.acompte_declared_at ? (
                        <Badge variant="outline" className="mt-1 border-orange-500/60 text-orange-400">
                          ⏳ Acompte déclaré envoyé le {new Date(quote.acompte_declared_at).toLocaleDateString("fr-FR")}
                        </Badge>
                      ) : null}
                      {isPast(quote) ? (
                        <Badge variant="outline" className="mt-1 border-zinc-500/60 text-zinc-400">
                          🕰 Passée
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  {/* Pastille nouveautés client (message, musique, modification) */}
                  {quote.has_unread_updates ? (
                    <span
                      title="Nouveautés client : message, musique ou modification"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm text-background shadow-[0_0_16px_-2px_var(--accent)]"
                    >
                      
                    </span>
                  ) : null}
                </summary>
<QuickStatusForm statusAction={updateQuoteStatus} deleteAction={deleteQuote} quoteId={quote.id} currentStatus={quote.status} />
                {/* Suivi acompte : déclaration client + confirmation de réception */}
                {quote.acompte_declared_at && !quote.acompte_paid_at ? (
                  <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 pt-3 text-sm">
                    <span className="text-orange-300">
                      Acompte déclaré envoyé par le client le{" "}
                      {new Date(quote.acompte_declared_at).toLocaleDateString("fr-FR")}.
                    </span>
                    <form
                      action={async (formData: FormData) => {
 "use server";
                        await confirmAcompteReceived(formData);
                      }}
                    >
                      <input type="hidden" name="quote_id" value={quote.id} />
                      <SubmitButton
                        pendingLabel="Validation…"
                        className="rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-400 transition-colors hover:bg-cyan-400/25 hover:text-cyan-200"
                      >
                        ✓ Acompte reçu
                      </SubmitButton>
                    </form>
                  </div>
                ) : null}
                {/* Demandes client : pastille vu + validation des options */}
                {quote.has_unread_updates || quote.pending_options ? (
                  <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 pt-3 text-sm">
                    <span className="text-yellow-400">
                      {quote.pending_options
                        ? "⏳ Le client a demandé une modification d'options."
                        : quote.pending_details
                          ? "⏳ Le client a demandé une modification du devis (voir bloc dédié)."
                          : "Nouveautés client (musique ou message)."}
                    </span>
                    {quote.has_unread_updates ? (
                      <form action={markQuoteSeen}>
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <SubmitButton
                          pendingLabel="…"
                          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          ✓ Marquer comme vu
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>
                ) : null}
                {quote.pending_options ? (
                  <div className="mx-4 mb-4 mt-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
                    <p className="font-medium text-yellow-300">
                      Options demandées par le client :
                    </p>
                    <ul className="mt-2 space-y-1">
                      {((quote.pending_options ?? []) as SelectedOption[]).map((option) => (
                        <li key={option.id} className="flex justify-between gap-4">
                          <span>
                            {option.name}
                            {option.qty && option.qty > 1 ? ` × ${option.qty}` : ""}
                          </span>
                          <span className="text-muted-foreground">
                            {formatEuros(option.price_cents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form
                        action={async (formData) => {
 "use server";
                          await resolveQuoteOptions(formData);
                        }}
                      >
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <input type="hidden" name="approve" value="true" />
                        <button
                          type="submit"
                          className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500"
                        >
                          ✓ Accepter et appliquer
                        </button>
                      </form>
                      <form
                        action={async (formData) => {
 "use server";
                          await resolveQuoteOptions(formData);
                        }}
                      >
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <input type="hidden" name="approve" value="false" />
                        <button
                          type="submit"
                          className="rounded-lg border border-red-500/50 px-4 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          ✕ Refuser
                        </button>
                      </form>
                    </div>
                  </div>
                ) : null}
                {/* Demande de modification du devis (lieu, date, horaires, pack) */}
                {quote.pending_details ? (
                  <div className="space-y-2 border-t border-border px-4 pt-3 text-sm">
                    <p className="font-medium text-yellow-400">
                      ⏳ Le client demande une modification du devis :
                    </p>
                    <ul className="space-y-0.5 rounded-lg border border-border bg-muted/50 p-3 text-muted-foreground">
                      {(quote.pending_details as {
                        event_location?: string | null;
                        event_date?: string | null;
                        start_time?: string | null;
                        end_time?: string | null;
                        formula_name?: string | null;
                        message?: string | null;
                      }).event_location ? (
                        <li>Lieu : {(quote.pending_details as { event_location?: string | null }).event_location}</li>
                      ) : null}
                      {(quote.pending_details as { event_date?: string | null }).event_date ? (
                        <li>Date : {(quote.pending_details as { event_date?: string | null }).event_date}</li>
                      ) : null}
                      {(quote.pending_details as { start_time?: string | null }).start_time ||
                      (quote.pending_details as { end_time?: string | null }).end_time ? (
                        <li>
                          Horaires :{" "}
                          {(quote.pending_details as { start_time?: string | null }).start_time ?? "?"} -{" "}
                          {(quote.pending_details as { end_time?: string | null }).end_time ?? "?"}
                        </li>
                      ) : null}
                      {(quote.pending_details as { formula_name?: string | null }).formula_name ? (
                        <li>Pack : {(quote.pending_details as { formula_name?: string | null }).formula_name}</li>
                      ) : null}
                      {(quote.pending_details as { message?: string | null }).message ? (
                        <li>Message : {(quote.pending_details as { message?: string | null }).message}</li>
                      ) : null}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      <form
                        action={async (formData) => {
 "use server";
                          await resolveQuoteDetails(formData);
                        }}
                      >
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <input type="hidden" name="approve" value="true" />
                        <SubmitButton
                          pendingLabel="Application…"
                          confirm="Accepter ces modifications ? Le devis sera mis à jour, le total recalculé (si pack changé), et un nouveau devis + contrat PDF à signer seront générés automatiquement."
                          className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500"
                        >
                          ✓ Accepter et appliquer (+ nouveau devis PDF)
                        </SubmitButton>
                      </form>
                      <form
                        action={async (formData) => {
 "use server";
                          await resolveQuoteDetails(formData);
                        }}
                      >
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <input type="hidden" name="approve" value="false" />
                        <button
                          type="submit"
                          className="rounded-lg border border-red-500/50 px-4 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          ✕ Refuser
                        </button>
                      </form>
                      <form
                        action={async (formData) => {
 "use server";
                          await notifyDevisReady(formData);
                        }}
                      >
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <SubmitButton
                          pendingLabel="Envoi…"
                          confirm="Envoyer l'e-mail « documents à signer » au client maintenant ?"
                          className="rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-400/25 hover:text-cyan-100"
                        >
                          ✉ Envoyer les documents au client
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                ) : null}
                <AdminQuoteDetails
                  quote={quote}
                  options={options}
                  schedule={schedulesByQuote.get(quote.id)}
                />
                {/* Dossier complet (conversation, musiques, fichiers,
                    documents) : chargé uniquement à l'ouverture du devis. */}
                <AdminQuoteLazyFolder
                  quoteId={quote.id}
                  formulaName={quote.formula_name}
                  adjustments={
                    Array.isArray(quote.invoice_adjustments)
                      ? (quote.invoice_adjustments as { label: string; amount_cents: number }[])
                      : []
                  }
                  initialMessages={
                    (initialMessagesByQuote.get(quote.id) ?? []) as {
                      id: string;
                      sender: string;
                      body: string;
                      created_at: string;
                    }[]
                  }
                />
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

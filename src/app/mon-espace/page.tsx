import Link from "next/link";
import { getMyQuotes } from "@/app/client-actions";
import { ClientBack } from "@/components/client-back";
import { formatEuros } from "@/lib/money";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  nouveau: {
    label: "Nouveau — non lu",
    className: "bg-sky-500/10 text-sky-300 border border-sky-500/40",
  },
  contacte: {
    label: "En cours",
    className: "bg-yellow-500/10 text-yellow-300 border border-yellow-500/40",
  },
  devis_envoye: {
    label: "En cours",
    className: "bg-yellow-500/10 text-yellow-300 border border-yellow-500/40",
  },
  confirme: {
    label: "Confirmé ✓",
    className: "bg-green-500/10 text-green-400 border border-green-500/40",
  },
  refuse: {
    label: "Refusé",
    className: "bg-red-500/10 text-red-400 border border-red-500/40",
  },
  annule: {
    label: "Annulé",
    className: "bg-white/5 text-muted-foreground border border-white/20",
  },
};

export default async function MonEspacePage() {
  const quotes = await getMyQuotes();

  return (
    <main>
      <h1 className="text-2xl font-medium tracking-tight">Mes devis</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Retrouvez ici vos devis, la messagerie et vos playlists.
      </p>

      {quotes.length === 0 ? (
        <div className="mt-10 rounded-xl border border-white/10 p-8 text-center">
          <p className="text-muted-foreground">
            Aucun devis pour le moment.
            <br />
            Les devis créés avec votre adresse e-mail apparaîtront ici automatiquement.
          </p>
          <Link
            href="/formules"
            className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition hover:brightness-110"
          >
            Créer un devis
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {quotes.map((quote) => {
            const status = STATUS_LABELS[quote.status] ?? {
              label: quote.status,
              className: "text-muted-foreground",
            };
            return (
              <li key={quote.id}>
                <Link
                  href={`/mon-espace/devis/${quote.id}`}
                  className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-accent/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{quote.formula_name}</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {quote.pending_options ? (
                        <span className="rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-300 border border-yellow-500/40">
                          ⏳ Modif. en attente
                        </span>
                      ) : null}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {quote.event_date ?? "Date à définir"}
                    {quote.event_type ? ` · ${quote.event_type}` : ""} ·{" "}
                    <span className="font-medium text-foreground">{formatEuros(quote.total_cents)}</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

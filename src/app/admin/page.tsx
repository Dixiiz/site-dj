import { createAdminClient } from "@/lib/supabase/admin";
import { formatEuros } from "@/lib/money";
import Link from "next/link";
import { ValidateSoldeButton } from "@/components/validate-solde-button";

export const dynamic = "force-dynamic";

// Affiche un montant en euros à partir de centimes.
function eur(cents: unknown) {
  const n = Number(cents ?? 0);
  return formatEuros(Number.isFinite(n) ? n : 0);
}

const STATUT_LABEL: Record<string, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  attente_acompte: "Acompte attendu",
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>;
}) {
  const { vue } = await searchParams;
  const supabase = createAdminClient();
  const now = new Date();
  const year = now.getFullYear();
  const monthPrefix = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayIso = now.toLocaleDateString("fr-CA");

  // Tous les devis confirmés, triés par date d'événement.
  const { data: confirmed } = await supabase
    .from("quotes")
    .select("id, customer_name, formula_name, total_cents, event_date, event_location, status, created_at, notes")
    .eq("status", "confirme")
    .order("event_date", { ascending: true });

  const montant = (q: { total_cents: unknown }) => {
    const n = Number(q.total_cents ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const allConfirmed = confirmed ?? [];
  const upcoming = allConfirmed.filter((q) => (q.event_date ?? "") >= todayIso);

  // ---- Chiffres clés ----
  const soldeDe = (q: { total_cents: unknown; notes?: unknown }) => {
    const notes = String(q.notes ?? "");
    const total = montant(q);
    // L'acompte RÉELLEMENT réglé, stocké via [[acompte:centimes]]
    // (renseignable dans l'édition de la soirée sur /admin/import).
    const marker = /\[\[acompte:(\d+)\]\]/.exec(notes);
    if (marker) return Math.max(0, total - Number(marker[1]));
    // Sans acompte renseigné : facture libre → total dû. Devis du site →
    // règle standard du devis PDF (solde arrondi à la dizaine inférieure).
    if (notes.includes("[[facture-libre]]")) return total;
    if (notes.includes("[[import-avant-site]]")) return total;
    return Math.max(0, total - Math.floor((total * 0.8) / 10) * 10);
  };
  // Solde validé = le DJ a confirmé avoir reçu le solde après la soirée
  // (marqueur [[solde-valide:date]] posé via le bouton "Valider le solde").
  const soldeValide = (q: { notes: unknown }) =>
    (String(q.notes ?? "")).includes("[[solde-valide:");

  // CA de l'année : tous les événements confirmés qui se déroulent cette année.
  const caAnnee = allConfirmed
    .filter((q) => (q.event_date ?? "").startsWith(String(year)))
    .reduce((sum, q) => sum + montant(q), 0);

  // CA URSSAF du mois : soirées du mois TERMINÉES dont le solde a été
  // validé. Au 1er du mois, la carte repart de 0 €.
  const ceMoisJouees = allConfirmed.filter(
    (q) => (q.event_date ?? "").startsWith(monthPrefix) && (q.event_date ?? "") <= todayIso
  );
  const encaisse = ceMoisJouees.filter((q) => soldeValide(q));
  const caMois = encaisse.reduce((sum, q) => sum + montant(q), 0);
  const attenteValidation = ceMoisJouees.filter((q) => !soldeValide(q));

  // CA à venir : confirmé, pas encore joué.
  const caAVenir = upcoming.reduce((sum, q) => sum + montant(q), 0);

  // Soirées terminées (toutes périodes) dont le solde reste à valider :
  // visible dans le détail de la carte, pour ne rien oublier.
  const aValiderToutes = allConfirmed
    .filter((q) => (q.event_date ?? "") <= todayIso && !soldeValide(q));
  const soldeAValiderToutes = aValiderToutes.reduce((sum, q) => sum + soldeDe(q), 0);

  // ---- Devis ----
  const { count: devisAttente } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .in("status", ["nouveau", "contacte", "attente_acompte"]);
  const { data: devisRecents } = await supabase
    .from("quotes")
    .select("id, customer_name, formula_name, status, created_at")
    .in("status", ["nouveau", "contacte", "attente_acompte"])
    .order("created_at", { ascending: false })
    .limit(5);

  // ---- Factures libres ----
  const { data: factures } = await supabase.storage
    .from("client-files")
    .list("admin/factures-libres", { limit: 100 });
  const nbFactures = (factures ?? []).filter((f) => f.name.endsWith(".pdf")).length;

  const prochaines = upcoming.slice(0, 5);
  const aujourdhui = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  /* SUITE-RENDU */

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Tableau de bord</h1>
            <p className="mt-1 text-sm capitalize text-muted-foreground">{aujourdhui}</p>
          </div>
          <Link
            href="/admin/devis"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            + Nouveau devis reçu ? Voir les demandes
          </Link>
        </div>

      {/* BLOC 1 : les 2 chiffres qui comptent */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin?vue=ca-annee"
          className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/15 to-accent/5 p-6 transition-colors hover:border-accent"
        >
          <p className="text-xs font-medium tracking-[0.15em] text-accent uppercase">
            💰 CA signé {year} — cliquer pour le détail
          </p>
          <p className="mt-2 text-4xl font-semibold">{eur(caAnnee)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {allConfirmed.length} événement(s) confirmé(s) cette année
          </p>
        </Link>
        <Link
          href="/admin?vue=urssaf"
          className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-accent/50"
        >
          <p className="text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase">
            🧾 CA encaissé ce mois — à déclarer (URSSAF)
          </p>
          <p className="mt-2 text-4xl font-semibold">{eur(caMois)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {encaisse.length} soirée(s) validée(s) ·{" "}
            {attenteValidation.length > 0
              ? `${attenteValidation.length} solde(s) en attente de validation`
              : "tout est validé ✓"}
          </p>
        </Link>
      </div>

      {/* BLOC 2 : détails (cliquables → détail) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { vue: "solde", label: "Soldes à valider", value: eur(soldeAValiderToutes), hint: `${aValiderToutes.length} soirée(s) terminée(s) — valider pour compter dans l'URSSAF` },
          { vue: "ca-avenir", label: "CA à venir (déjà signé)", value: eur(caAVenir), hint: `${upcoming.length} soirée(s) confirmée(s) restante(s)` },
          { vue: null, label: "Devis en attente", value: String(devisAttente ?? 0), hint: "à relancer ou traiter", href: "/admin/devis" },
        ].map((card) => {
          const inner = (
            <>
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              <p className="mt-1.5 text-xl font-semibold">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </>
          );
          return card.href ? (
            <Link key={card.label} href={card.href} className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent/50">
              {inner}
            </Link>
          ) : (
            <Link key={card.label} href={`/admin?vue=${card.vue}`} className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent/50">
              {inner}
            </Link>
          );
        })}
      </div>

      {/* DÉTAIL : soirées composant le chiffre cliqué */}
      {(() => {
        const vues: Record<
          string,
          { titre: string; rows: typeof upcoming; solde?: boolean; urssaf?: boolean }
        > = {
          "ca-annee": {
            titre: `CA signé ${year} — détail des événements`,
            rows: allConfirmed.filter((q) => (q.event_date ?? "").startsWith(String(year))),
          },
          urssaf: {
            titre: `CA ${monthPrefix} (URSSAF) — soirées encaissées et validées`,
            rows: encaisse,
          },
          solde: {
            titre: "Soldes à valider — soirées terminées, solde non confirmé",
            rows: aValiderToutes,
            solde: true,
          },
          "ca-avenir": { titre: "CA à venir — soirées restantes", rows: upcoming },
        };
        const detail = vue ? vues[vue] : undefined;
        if (!detail) return null;
        const totalDetail = detail.rows.reduce((sum, q) => {
          const m = montant(q);
          return sum + (detail.solde ? soldeDe(q) : m);
        }, 0);
        return (
          <section className="rounded-xl border border-accent/40 bg-accent/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">{detail.titre}</h2>
              <Link href="/admin" className="text-xs text-muted-foreground hover:text-accent">
                ✕ Fermer
              </Link>
            </div>
            {detail.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Aucune soirée dans cette catégorie.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {detail.rows.map((quote) => {
                  const m = montant(quote);
                  const affiche = detail.solde ? soldeDe(quote) : m;
                  const valide = soldeValide(quote);
                  return (
                    <li key={quote.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {quote.customer_name}{" "}
                          {detail.solde && valide ? (
                            <span className="text-xs font-normal text-green-400">✓ validé</span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {quote.formula_name}
                          {quote.event_location ? ` · ${quote.event_location}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {quote.event_date
                              ? new Date(`${quote.event_date}T12:00:00`).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">{eur(affiche)}</p>
                        </div>
                        {detail.solde ? (
                          <ValidateSoldeButton
                            id={quote.id}
                            customerName={quote.customer_name}
                            validated={valide}
                          />
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-right text-sm font-medium">
              Total : <span className="text-accent">{eur(totalDetail)}</span>
            </p>
          </section>
        );
      })()}
      {/* SUITE-LISTES */}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Prochaines dates */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">📅 Prochaines dates</h2>
            <Link href="/admin/planning" className="text-xs text-accent hover:underline">
              Planning →
            </Link>
          </div>
          {prochaines.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune date confirmée à venir.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {prochaines.map((quote) => (
                <li key={quote.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{quote.customer_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {quote.formula_name}
                      {quote.event_location ? ` · ${quote.event_location}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium">
                      {quote.event_date
                        ? new Date(`${quote.event_date}T12:00:00`).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{eur(montant(quote))}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Devis à traiter */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">📨 Devis à traiter ({devisAttente ?? 0})</h2>
            <Link href="/admin/devis" className="text-xs text-accent hover:underline">
              Tous les devis →
            </Link>
          </div>
          {(devisRecents ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Rien en attente, tout est traité 🎉
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {(devisRecents ?? []).map((quote) => (
                <li key={quote.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{quote.customer_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{quote.formula_name}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-accent/40 px-2.5 py-1 text-xs text-accent">
                    {STATUT_LABEL[quote.status] ?? quote.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Raccourcis */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/factures", emoji: "🧾", label: "Factures libres", extra: `${nbFactures} générée(s)` },
          { href: "/admin/import", emoji: "📚", label: "Soirées d'avant le site" },
          { href: "/admin/messages", emoji: "💬", label: "Messagerie clients" },
          { href: "/admin/comptes", emoji: "👥", label: "Comptes clients" },
        ].map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="rounded-xl border border-border bg-card p-4 text-sm transition-colors hover:border-accent/50"
          >
            <span className="text-xl">{shortcut.emoji}</span>{" "}
            <span className="font-medium">{shortcut.label}</span>
            {shortcut.extra ? (
              <span className="block text-xs text-muted-foreground">{shortcut.extra}</span>
            ) : null}
          </Link>
        ))}
      </div>
    </main>
  );
}
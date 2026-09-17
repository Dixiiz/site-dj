import { createAdminClient } from "@/lib/supabase/admin";
import { formatEuros } from "@/lib/money";
import Link from "next/link";
import {
  BookOpen,
  CreditCard,
  FileText,
  Mail,
  MessageSquare,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { DashboardDetail } from "@/components/dashboard-detail";
import { ValidateEcheanceButton } from "@/components/validate-echeance-button";
import { ValidateAcompteButton } from "@/components/validate-acompte-button";
import { BackfillStripeButton } from "@/components/backfill-stripe-button";
import { AdminStats } from "@/components/admin-stats";
import { AdminPushButton } from "@/components/admin-push-button";

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
  // (Requêtes en parallèle pour un chargement rapide du tableau de bord.)
  const [confirmedRes, devisAttenteRes, devisRecentsRes, facturesRes, echeanciersRes, allQuotesRes] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, customer_name, formula_name, total_cents, event_date, event_location, status, created_at, notes, acompte_paid_at")
      .eq("status", "confirme")
      .order("event_date", { ascending: true }),
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .in("status", ["nouveau", "contacte", "attente_acompte"]),
    supabase
      .from("quotes")
      .select("id, customer_name, formula_name, status, created_at")
      .in("status", ["nouveau", "contacte", "attente_acompte"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.storage.from("client-files").list("admin/factures-libres", { limit: 100 }),
    supabase
      .from("payment_schedule")
      .select("id, numero, total, amount_cents, due_date, status, valide_urssaf, paid_at, quote_id, quotes(id, customer_name, formula_name)")
      .order("due_date", { ascending: true }),
    // Tous les devis (léger) : entonnoir de conversion des statistiques.
    supabase.from("quotes").select("id, status"),
  ]);
  const confirmed = confirmedRes.data;
  const devisAttente = devisAttenteRes.count ?? 0;
  const devisRecents = devisRecentsRes.data;
  const nbFactures = (facturesRes.data ?? []).filter((f) => f.name.endsWith(".pdf")).length;

  // Échéanciers : toutes les échéances, avec les infos client.
  const echeancesEnCours = (echeanciersRes.data ?? []).map((row) => {
    const q = (Array.isArray(row.quotes) ? row.quotes[0] : row.quotes) as
      | { customer_name: string | null; formula_name: string | null }
      | null;
    return {
      id: row.id,
      quoteId: row.quote_id,
      client: q?.customer_name ?? "Client",
      numero: row.numero,
      totalEcheances: row.total,
      amountCents: row.amount_cents,
      dueDate: row.due_date,
      status: row.status,
      valideUrssaf: Boolean(row.valide_urssaf),
      paidAt: row.paid_at,
    };
  });
  // Carte "Échéances en cours" : impayées du MOIS ACTUEL seulement (ce que
  // tu es censé recevoir ce mois-ci).
  const echeancesDuMois = echeancesEnCours.filter((e) => e.dueDate.startsWith(monthPrefix));
  // Reçues mais pas encore confirmées URSSAF (toutes périodes).
  const echeancesAConfirmer = echeancesEnCours.filter((e) => e.status === "payee" && !e.valideUrssaf);
  // Confirmées URSSAF (attribuées au mois de la date limite de l'échéance).
  const echeancesValidees = echeancesEnCours.filter((e) => e.status === "payee" && e.valideUrssaf);
  // CA URSSAF du mois inclut aussi les échéances d'échéancier confirmées
  // (attribuées au mois de leur date limite) — en NET de frais Stripe.
  const urssafEcheances = echeancesValidees
    .filter((e) => e.dueDate.startsWith(monthPrefix))
    .reduce((sum, e) => sum + netEcheance(e.quoteId, e.numero, e.amountCents), 0);
  // Devis avec échéancier : leur argent est suivi échéance par échéance
  // (ils sont exclus du calcul de solde par devis pour éviter les doubles comptes).
  const echeancierQuoteIds = new Set(echeancesEnCours.map((e) => e.quoteId));

  // Progression d'échéancier par devis : nombre d'échéances réglées / total et
  // montants payés / dus — alimente la barre de progression sous chaque ligne.
  const progressionParDevis = new Map<
    string,
    { payees: number; total: number; payeCents: number; totalCents: number }
  >();
  for (const e of echeancesEnCours) {
    const p = progressionParDevis.get(e.quoteId) ?? {
      payees: 0,
      total: 0,
      payeCents: 0,
      totalCents: 0,
    };
    p.total = Math.max(p.total, e.totalEcheances);
    p.totalCents += e.amountCents;
    if (e.status === "payee") {
      p.payees += 1;
      p.payeCents += e.amountCents;
    }
    progressionParDevis.set(e.quoteId, p);
  }

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

  // Acompte reçu pour un devis SANS échéancier : marqueur [[acompte:centimes]]
  // (posé par le webhook Stripe avec le montant réel, ou renseigné à la main
  // dans /admin/import), sinon acompte standard du devis (règle du PDF :
  // 20 %, solde arrondi au multiple de 10 inférieur).
  const acompteDe = (q: { total_cents: unknown; notes?: unknown }) => {
    const marker = /\[\[acompte:(\d+)\]\]/.exec(String(q.notes ?? ""));
    if (marker) return Number(marker[1]);
    return montant(q) - Math.floor((montant(q) * 0.8) / 10) * 10;
  };
  // Base URSSAF = NET réellement encaissé : frais Stripe déduits via le
  // marqueur [[acompte-net:centimes]] (posé par le webhook). Sans marqueur
  // (virement, espèces, paiement sur place) : le montant complet compte.
  const acompteNetDe = (q: { total_cents: unknown; notes?: unknown }) => {
    const net = /\[\[acompte-net:(\d+)\]\]/.exec(String(q.notes ?? ""));
    if (net) return Number(net[1]);
    return acompteDe(q);
  };
  // Échéanciers : net de chaque échéance mémorisé par le webhook via
  // [[echeance-net:numero:centimes]] ; sinon (virement, sur place) le brut.
  const notesParDevis = new Map(
    allConfirmed.map((q) => [q.id, String(q.notes ?? "")])
  );
  const netEcheance = (quoteId: string, numero: number, brut: number) => {
    const m = new RegExp(`\\[\\[echeance-net:${numero}:(\\d+)\\]\\]`).exec(
      notesParDevis.get(quoteId) ?? ""
    );
    return m ? Number(m[1]) : brut;
  };
  const acompteRecu = (q: { acompte_paid_at?: unknown; notes?: unknown }) =>
    Boolean(q.acompte_paid_at) || /\[\[acompte:\d+\]\]/.test(String(q.notes ?? ""));
  const acompteValide = (q: { notes?: unknown }) =>
    String(q.notes ?? "").includes("[[acompte-valide:");

  // Acomptes reçus (hors échéancier) non encore validés pour l'URSSAF :
  // à confirmer pour les compter dans le CA du mois de leur réception.
  const acomptesAValider = allConfirmed.filter(
    (q) => acompteRecu(q) && !acompteValide(q) && !echeancierQuoteIds.has(q.id)
  );
  // Acomptes validés : comptés dans le CA URSSAF du mois de réception
  // (acompte_paid_at). Le solde de la même soirée sera compté séparément
  // après l'événement — aucun double comptage.
  const acomptesValides = allConfirmed.filter(
    (q) => acompteRecu(q) && acompteValide(q) && !echeancierQuoteIds.has(q.id)
  );
  const urssafAcomptes = acomptesValides
    .filter((q) => String(q.acompte_paid_at ?? "").startsWith(monthPrefix))
    .reduce((sum, q) => sum + acompteNetDe(q), 0);

  // CA de l'année : tous les événements confirmés qui se déroulent cette année.
  const caAnnee = allConfirmed
    .filter((q) => (q.event_date ?? "").startsWith(String(year)))
    .reduce((sum, q) => sum + montant(q), 0);

  // CA URSSAF du mois : soirées du mois TERMINÉES dont le solde a été
  // validé. Au 1er du mois, la carte repart de 0 €.
  // Seul le SOLDE compte : l'acompte a déjà été déclaré le mois où il a
  // été reçu (il ne doit pas être déclaré deux fois).
  const ceMoisJouees = allConfirmed.filter(
    (q) => (q.event_date ?? "").startsWith(monthPrefix) && (q.event_date ?? "") <= todayIso
  );
  const encaisse = ceMoisJouees.filter((q) => soldeValide(q));
  const caMoisQuotes = encaisse.reduce((sum, q) => sum + soldeDe(q), 0);
  const attenteValidation = ceMoisJouees.filter((q) => !soldeValide(q));
  // Le CA URSSAF du mois inclut aussi les échéances d'échéancier confirmées
  // (attribuées au mois de leur date limite).
  const caMois = caMoisQuotes + urssafEcheances + urssafAcomptes;

  // CA à venir : confirmé, pas encore joué.
  const caAVenir = upcoming.reduce((sum, q) => sum + montant(q), 0);

  // Soirées terminées (toutes périodes) dont le solde reste à valider :
  // visible dans le détail de la carte, pour ne rien oublier.
  // Les devis avec échéancier en sont exclus : leur argent est suivi
  // échéance par échéance (voir « Soldes à valider » / échéanciers).
  const aValiderToutes = allConfirmed
    .filter(
      (q) =>
        (q.event_date ?? "") <= todayIso &&
        !soldeValide(q) &&
        !echeancierQuoteIds.has(q.id)
    );
  const soldeAValiderToutes = aValiderToutes.reduce((sum, q) => sum + soldeDe(q), 0);

  const prochaines = upcoming.slice(0, 5);
  const aujourdhui = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  /* SUITE-RENDU */

  // ---- Statistiques : CA URSSAF par mois + entonnoir de conversion ----
  const totalPct = (part: number, total: number) =>
    total > 0 ? Math.round((part / total) * 100) : null;

  // ---- Statistiques : CA URSSAF par mois + entonnoir de conversion ----
  const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const monthly = Array.from({ length: 12 }, (_, m) => {
    const prefix = `${year}-${String(m + 1).padStart(2, "0")}`;
    const soldes = allConfirmed
      .filter((q) => (q.event_date ?? "").startsWith(prefix) && soldeValide(q) && !echeancierQuoteIds.has(q.id))
      .reduce((sum, q) => sum + soldeDe(q), 0);
    const echeances = echeancesValidees
      .filter((e) => e.dueDate.startsWith(prefix))
      .reduce((sum, e) => sum + e.amountCents, 0);
    return { label: MONTH_LABELS[m], cents: soldes + echeances };
  });
  const allQuotes = allQuotesRes.data ?? [];
  const countStatus = (...statuses: string[]) =>
    allQuotes.filter((q) => statuses.includes(q.status ?? "")).length;
  const funnel = [
    { label: "Demandes reçues", count: allQuotes.length, hint: "devis + sur mesure" },
    {
      label: "En cours de discussion",
      count: countStatus("nouveau", "contacte", "attente_signature", "attente_acompte"),
    },
    {
      label: "Confirmées",
      count: countStatus("confirme"),
      hint:
        totalPct(countStatus("confirme"), allQuotes.length) === null
          ? undefined
          : `${totalPct(countStatus("confirme"), allQuotes.length)} % du total`,
    },
    {
      label: "Refusées / annulées",
      count: countStatus("refuse", "annule"),
    },
  ];

  // Données des cartes et panneaux de détail (rendu instantané côté client).
  const mapDetailRow = (q: (typeof upcoming)[number]) => ({
    id: q.id,
    customerName: q.customer_name,
    formulaName: q.formula_name,
    eventLocation: q.event_location ?? "",
    eventDate: q.event_date ?? "",
    totalCents: montant(q),
    notes: String(q.notes ?? ""),
    status: q.status ?? "",
  });
  const details = {
    "ca-annee": {
      titre: `CA signé ${year} — détail des événements`,
      rows: allConfirmed
        .filter((q) => (q.event_date ?? "").startsWith(String(year)))
        .map(mapDetailRow),
    },
    urssaf: {
      titre: `CA ${monthPrefix} (URSSAF) — soldes encaissés et validés`,
      rows: encaisse.map(mapDetailRow),
      solde: true,
    },
    solde: {
      titre: "Soldes à valider — soirées terminées, solde non confirmé",
      rows: aValiderToutes.map(mapDetailRow),
      solde: true,
    },
    "ca-avenir": {
      titre: "CA à venir — soirées restantes",
      rows: upcoming.map(mapDetailRow),
    },
  };

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
          <AdminPushButton vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? ""} />
        </div>

      <DashboardDetail
        initialVue={vue}
        cards1={[
          {
            vue: "ca-annee",
            label: `CA signé ${year} — cliquer pour le détail`,
            value: eur(caAnnee),
            hint: `${allConfirmed.length} événement(s) confirmé(s) cette année`,
            hero: true,
            accentLabel: true,
            icon: <TrendingUp className="size-4" aria-hidden />,
          },
          {
            vue: "urssaf",
            label: "CA encaissé ce mois — à déclarer (URSSAF)",
            value: eur(caMois),
            hint: `${encaisse.length} soirée(s) validée(s) · ${
              urssafEcheances > 0
                ? `${echeancesValidees.filter((e) => e.dueDate.startsWith(monthPrefix)).length} échéance(s) d'échéancier · `
                : ""
            }${
              attenteValidation.length > 0
                ? `${attenteValidation.length} solde(s) en attente de validation`
                : "tout est validé ✓"
            }`,
            hero: true,
            icon: <Receipt className="size-4" aria-hidden />,
          },
        ]}
        cards2={[
          { vue: "echeanciers", label: "Échéances en cours", value: String(echeancesDuMois.length), hint: "échéance(s) à recevoir ce mois-ci — clic pour le détail" },
          { vue: "solde", label: "Soldes à valider", value: eur(soldeAValiderToutes + echeancesAConfirmer.reduce((s, e) => s + netEcheance(e.quoteId, e.numero, e.amountCents), 0) + acomptesAValider.reduce((s, q) => s + acompteNetDe(q), 0)), hint: `${aValiderToutes.length} solde(s) + ${echeancesAConfirmer.length} échéance(s) + ${acomptesAValider.length} acompte(s) — valider pour compter dans l'URSSAF` },
          { vue: "ca-avenir", label: "CA à venir (déjà signé)", value: eur(caAVenir), hint: `${upcoming.length} soirée(s) confirmée(s) restante(s)` },
          { vue: "devis", href: "/admin/devis", label: "Devis en attente", value: String(devisAttente ?? 0), hint: "à relancer ou traiter" },
        ]}
        details={details}
        echeanciersPanel={
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-3 rounded-xl border border-border bg-card p-5 duration-300">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-medium">
                <CreditCard className="size-4 text-accent" aria-hidden />
                Échéances en cours — à recevoir ce mois-ci
              </h2>
              <span className="text-xs text-muted-foreground">Cliquez à nouveau sur la carte pour fermer</span>
            </div>
            {echeancesDuMois.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune échéance impayée ce mois-ci ✓
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {echeancesDuMois.map((e) => {
                  const prog = progressionParDevis.get(e.quoteId);
                  const pct =
                    prog && prog.total > 0
                      ? Math.round((prog.payees / prog.total) * 100)
                      : 0;
                  return (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/devis?focus=${e.quoteId}`}
                          className="font-medium transition-colors hover:text-accent hover:underline"
                          title="Ouvrir ce devis dans la liste"
                        >
                          {e.client}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Échéance {e.numero}/{e.totalEcheances} — avant le{" "}
                          {new Date(`${e.dueDate}T12:00:00`).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <span className="font-medium">{eur(e.amountCents)}</span>
                      {prog && prog.total > 0 && (
                        <div className="w-full">
                          <div
                            className="h-1.5 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Échéancier de ${e.client} : ${prog.payees} échéances réglées sur ${prog.total}`}
                          >
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-accent"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {prog.payees}/{prog.total} échéance{prog.total > 1 ? "s" : ""} réglée
                            {prog.payees > 1 ? "s" : ""} · {eur(prog.payeCents)} sur {eur(prog.totalCents)}
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        }
        soldeRecusPanel={
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-3 rounded-xl border border-border bg-card p-5 duration-300">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-medium">
                <Receipt className="size-4 text-accent" aria-hidden />
                Paiements reçus à confirmer
              </h2>
              <div className="flex items-center gap-3">
                <BackfillStripeButton />
                <span className="text-xs text-muted-foreground">Cliquez à nouveau sur la carte pour fermer</span>
              </div>
            </div>

            {/* Acomptes reçus (hors échéancier) : valider pour compter dans
                le CA URSSAF du mois de leur réception. */}
            {acomptesAValider.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Acomptes reçus — devis sans échéancier
                </p>
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {acomptesAValider.map((q) => (
                    <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/devis?focus=${q.id}`}
                          className="font-medium transition-colors hover:text-accent hover:underline"
                          title="Ouvrir ce devis dans la liste"
                        >
                          {q.customer_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Acompte reçu le{" "}
                          {q.acompte_paid_at
                            ? new Date(q.acompte_paid_at).toLocaleDateString("fr-FR")
                            : "à la main"}{" "}
                          · soirée le {q.event_date ? new Date(`${q.event_date}T12:00:00`).toLocaleDateString("fr-FR") : "?"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{eur(acompteNetDe(q))}</span>
                        <ValidateAcompteButton id={q.id} customerName={q.customer_name ?? ""} validated={false} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Acomptes déjà validés : possibilité de retrait en cas d'erreur. */}
            {acomptesValides
              .filter((q) => String(q.acompte_paid_at ?? "").startsWith(monthPrefix))
              .length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Acomptes déjà comptés ce mois
                </p>
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {acomptesValides
                    .filter((q) => String(q.acompte_paid_at ?? "").startsWith(monthPrefix))
                    .map((q) => (
                      <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                        <div className="min-w-0">
                          <Link
                            href={`/admin/devis?focus=${q.id}`}
                            className="font-medium transition-colors hover:text-accent hover:underline"
                          >
                            {q.customer_name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Reçu le{" "}
                            {q.acompte_paid_at
                              ? new Date(q.acompte_paid_at).toLocaleDateString("fr-FR")
                              : "?"}{" "}
                            — dans le CA URSSAF ✓
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{eur(acompteNetDe(q))}</span>
                          <ValidateAcompteButton id={q.id} customerName={q.customer_name ?? ""} validated={true} />
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Échéanciers — paiements reçus
              </p>
            </div>
            {echeancesAConfirmer.length === 0 && acomptesAValider.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun paiement en attente de confirmation ✓
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {echeancesAConfirmer.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/devis?focus=${e.quoteId}`}
                        className="font-medium transition-colors hover:text-accent hover:underline"
                        title="Ouvrir ce devis dans la liste"
                      >
                        {e.client}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Échéance {e.numero}/{e.totalEcheances} — reçue le{" "}
                        {e.paidAt
                          ? new Date(e.paidAt).toLocaleDateString("fr-FR")
                          : new Date(`${e.dueDate}T12:00:00`).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{eur(e.amountCents)}</span>
                      <ValidateEcheanceButton id={e.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        }
      />

      {/* SUITE-LISTES */}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Prochaines dates */}
        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-5">
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
                    <Link
                      href={`/admin/devis?focus=${quote.id}`}
                      className="block truncate text-sm font-medium transition-colors hover:text-accent hover:underline"
                      title="Ouvrir ce devis"
                    >
                      {quote.customer_name}
                    </Link>
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
        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-medium">
              <Mail className="size-4 text-accent" aria-hidden />
              Devis à traiter ({devisAttente ?? 0})
            </h2>
            <Link href="/admin/devis" className="text-xs text-accent hover:underline">
              Tous les devis →
            </Link>
          </div>
          {(devisRecents ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Rien en attente, tout est traité ✓
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {(devisRecents ?? []).map((quote) => (
                <li key={quote.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/devis?focus=${quote.id}`}
                      className="block truncate text-sm font-medium transition-colors hover:text-accent hover:underline"
                      title="Ouvrir ce devis"
                    >
                      {quote.customer_name}
                    </Link>
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

      {/* Statistiques : CA mensuel + conversion */}
      <AdminStats year={year} months={monthly} funnel={funnel} />

      {/* Raccourcis */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/factures", icon: FileText, label: "Factures libres", extra: `${nbFactures} générée(s)` },
          { href: `/api/admin/export-ca?annee=${year}`, icon: Receipt, label: "Export comptable (CSV)", extra: `encaissements ${year}` },
          { href: "/admin/import", icon: BookOpen, label: "Soirées d'avant le site" },
          { href: "/admin/messages", icon: MessageSquare, label: "Messagerie clients" },
          { href: "/admin/comptes", icon: Users, label: "Comptes clients" },
        ].map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="rounded-xl border border-border bg-card p-4 text-sm transition-colors hover:border-accent/50"
          >
            <span className="flex items-center gap-2">
              <shortcut.icon className="size-4 text-accent" aria-hidden />
              <span className="font-medium">{shortcut.label}</span>
            </span>
            {shortcut.extra ? (
              <span className="mt-1 block text-xs text-muted-foreground">{shortcut.extra}</span>
            ) : null}
          </Link>
        ))}
      </div>
    </main>
  );
}
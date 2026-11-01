import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Export comptable : toutes les entrées d'argent tracées pour une année,
// une ligne par encaissement (échéances d'échéancier payées, acomptes,
// soldes validés), triées par date. Téléchargement direct en CSV.
export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return new Response("Non autorisé", { status: 401 });
  }

  const year = new URL(request.url).searchParams.get("annee") ?? String(new Date().getFullYear());
  if (!/^\d{4}$/.test(year)) {
    return new Response("Année invalide", { status: 400 });
  }

  const supabase = createAdminClient();
  const [echeancesRes, quotesRes] = await Promise.all([
    supabase
      .from("payment_schedule")
      .select("numero, total, amount_cents, paid_at, due_date, valide_urssaf, quote_id, quotes(customer_name, formula_name, notes)")
      .eq("status", "payee")
      .like("paid_at", `${year}%`)
      .order("paid_at", { ascending: true }),
    // Toutes les soirées confirmées (volumes faibles) : le filtrage année
    // (acompte payé / solde validé) est fait en JS ci-dessous.
    supabase
      .from("quotes")
      .select("id, customer_name, formula_name, total_cents, notes, acompte_paid_at, acompte_required")
      .eq("status", "confirme"),
  ]);

  type Row = { date: string; client: string; libelle: string; montant: number; source: string };
  const rows: Row[] = [];

  // Échéances d'échéancier payées (dates d'encaissement fiables).
  for (const e of echeancesRes.data ?? []) {
    const q = (Array.isArray(e.quotes) ? e.quotes[0] : e.quotes) as
      | { customer_name: string | null; formula_name: string | null; notes: string | null }
      | null;
    if (!e.paid_at) continue;
    rows.push({
      date: e.paid_at.slice(0, 10),
      client: q?.customer_name ?? "—",
      libelle: `Échéance ${e.numero}/${e.total}${q?.formula_name ? ` — ${q.formula_name}` : ""}`,
      montant: e.amount_cents,
      source: "Échéancier",
    });
  }

  // Devis sans échéancier : acompte (date de paiement Stripe) + solde validé.
  const echeancierQuoteIds = new Set((echeancesRes.data ?? []).map((e) => e.quote_id));
  for (const q of quotesRes.data ?? []) {
    if (echeancierQuoteIds.has(q.id)) continue;
    const notes = String(q.notes ?? "");
    const formula = q.formula_name ?? "Prestation";
    const soldeMarker = /\[\[solde-valide:(\d{4}-\d{2}-\d{2})\]\]/.exec(notes);
    const acompteDeCetteAnnee = Boolean(q.acompte_paid_at?.startsWith(year));
    const soldeDeCetteAnnee = Boolean(soldeMarker?.[1]?.startsWith(year));
    // Solde réglé EN LIGNE (carte Stripe ou virement confirmé) : compté à la
    // date de réception, net de frais Stripe.
    const soldeEnLigneMarker = /\[\[solde-en-ligne:(\d{4}-\d{2}-\d{2})\]\]/.exec(notes);
    const soldeEnLigneDeCetteAnnee = Boolean(soldeEnLigneMarker?.[1]?.startsWith(year));
    if (!acompteDeCetteAnnee && !soldeDeCetteAnnee && !soldeEnLigneDeCetteAnnee) continue;

    // Acompte : marqueur [[acompte:centimes]] sinon règle standard (20 %,
    // solde arrondi à la dizaine inférieure — même calcul que le devis PDF).
    if (acompteDeCetteAnnee && q.acompte_paid_at) {
      const acompteMarker = /\[\[acompte:(\d+)\]\]/.exec(notes);
      const acompte = acompteMarker
        ? Number(acompteMarker[1])
        : q.acompte_required === false
          ? 0
          : Math.max(0, (q.total_cents ?? 0) - Math.floor(((q.total_cents ?? 0) * 0.8) / 10) * 10);
      if (acompte > 0) {
        rows.push({
          date: q.acompte_paid_at.slice(0, 10),
          client: q.customer_name ?? "—",
          libelle: `Acompte de réservation — ${formula}`,
          montant: acompte,
          source: "Acompte",
        });
      }
    }

    // Solde réglé en ligne : montants exacts (net de frais Stripe) à la date
    // de réception — une seule ligne, jamais cumulée avec « solde validé ».
    if (soldeEnLigneMarker && soldeEnLigneDeCetteAnnee) {
      const netMarker = /\[\[solde-en-ligne-net:(\d+)\]\]/.exec(notes);
      const totalEl = Number(q.total_cents ?? 0);
      const acompteMarkerEl = /\[\[acompte:(\d+)\]\]/.exec(notes);
      const soldeFixeEl = /\[\[solde-montant:(\d+)\]\]/.exec(notes);
      const solde = netMarker
        ? Number(netMarker[1])
        : soldeFixeEl
          ? Number(soldeFixeEl[1])
          : Math.max(0, totalEl - (acompteMarkerEl ? Number(acompteMarkerEl[1]) : 0));
      if (solde > 0) {
        rows.push({
          date: soldeEnLigneMarker[1],
          client: q.customer_name ?? "—",
          libelle: `Solde (réglé en ligne) — ${formula}`,
          montant: solde,
          source: "Solde",
        });
      }
    }

    // Solde validé (marqueur [[solde-valide:AAAA-MM-JJ]] posé via le bouton
    // « Valider le solde ») : même calcul de solde que le tableau de bord.
    // Jamais cumulé avec un solde déjà réglé en ligne (pas de double compte).
    if (soldeMarker && soldeDeCetteAnnee && !soldeEnLigneMarker) {
      const total = Number(q.total_cents ?? 0);
      // Solde figé : [[solde-montant:centimes]] prioritaire (acompte supprimé
      // car jamais encaissé — le solde validé garde son montant d'origine).
      const soldeFixe = /\[\[solde-montant:(\d+)\]\]/.exec(notes);
      const acompteMarker = /\[\[acompte:(\d+)\]\]/.exec(notes);
      const acompte = acompteMarker
        ? Number(acompteMarker[1])
        : notes.includes("[[facture-libre]]") ||
            notes.includes("[[import-avant-site]]") ||
            q.acompte_required === false
          ? 0
          : Math.floor((total * 0.8) / 10) * 10;
      const solde = soldeFixe ? Number(soldeFixe[1]) : Math.max(0, total - acompte);
      if (solde > 0) {
        rows.push({
          date: soldeMarker[1],
          client: q.customer_name ?? "—",
          libelle: `Solde${notes.includes("[[import-avant-site]]") ? " (soirée importée)" : ""} — ${formula}`,
          montant: solde,
          source: "Solde",
        });
      }
    }
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  const totalCents = rows.reduce((sum, r) => sum + r.montant, 0);

  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    "Date;Libellé;Client;Montant TTC;Catégorie",
    ...rows.map((r) =>
      [r.date, esc(r.libelle), esc(r.client), (r.montant / 100).toFixed(2).replace(".", ","), r.source].join(";")
    ),
    `;;;TOTAL;${(totalCents / 100).toFixed(2).replace(".", ",")}`,
  ];
  // BOM UTF-8 pour que Excel ouvre les accents correctement.
  const csv = "\uFEFF" + lines.join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="encaissements-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// ============================================================
// CA URSSAF — unification des encaissements (DJ + Menuiserie)
// ============================================================
// GET  : liste détaillée de tous les encaissements avec date de
//        prestation, date réelle d'encaissement, type de paiement,
//        montant net et mois de rattachement URSSAF.
// PATCH: modification manuelle du mois de rattachement URSSAF
//        (menuiserie : colonne urssaf_mois ; DJ : marqueur
//        [[urssaf-mois:<id>:<AAAA-MM>]] dans les notes du devis).
//
// Règles de rattachement (mois URSSAF par défaut) :
//  - DJ échéancier : mois de paid_at (date réelle d'encaissement).
//  - DJ acompte    : mois de acompte_paid_at.
//  - DJ solde      : mois de la date du marqueur (en ligne ou validé).
//  - Menuiserie    : mois de urssaf_mois si déclaré, sinon mois de
//                    date_edition des factures payées.
// Chaque ligne est une entrée d'argent individuelle, sans doublon.

export type UrssafReceipt = {
  /** Clé unique de l'encaissement (ex: "dj-ech-<id>" | "menu-<id>"). */
  id: string;
  /** Identifiant brut de la source (payment_schedule.id ou menuiserie_docs.id). */
  sourceId: string;
  /** Activité : prestation DJ ou vente de biens (menuiserie). */
  activite: "dj" | "menuiserie";
  /** Client ou événement. */
  client: string;
  /** Libellé commercial (formule DJ / facture menuiserie). */
  libelle: string;
  /** Type de paiement : acompte, solde, échéance ou facture. */
  typePaiement: "acompte" | "solde" | "echeance" | "facture";
  /** Date de la soirée DJ (menuiserie : null). */
  datePrestation: string | null;
  /** Date réelle d'encaissement (AAAA-MM-JJ). */
  dateEncaissement: string;
  /** Montant net encaissé (centimes, frais Stripe déduits). */
  montantCents: number;
  /** Mois de rattachement URSSAF par défaut (AAAA-MM), calculé automatiquement. */
  moisUrssafAuto: string;
  /** Mois de rattachement URSSAF actuel (AAAA-MM), après override manuel éventuel. */
  moisUrssaf: string;
  /** true si le mois a été rattaché manuellement (≠ calcul automatique). */
  rattachementManuel: boolean;
  /** true si l'encaissement a déjà été marqué déclaré (menuiserie uniquement). */
  declareUrssaf?: boolean;
};

/** Mois AAAA-MM d'une date ISO AAAA-MM-JJ. */
function moisDe(dateIso: string): string {
  return dateIso.slice(0, 7);
}

/** Marqueur [[urssaf-mois:<id>:<AAAA-MM>]] : override manuel DJ. */
function urssafOverride(notes: string, id: string): string | null {
  const m = new RegExp(`\\[\\[urssaf-mois:${id}:(\\d{4}-\\d{2})\\]\\]`).exec(notes);
  return m ? m[1] : null;
}

/** Écrit (ou retire si mois = "") le marqueur d'override dans les notes. */
function ecrireOverride(notes: string, id: string, mois: string): string {
  const motif = new RegExp(`\\n?\\[\\[urssaf-mois:${id}:\\d{4}-\\d{2}\\]\\]`, "g");
  const nettoye = notes.replace(motif, "").trimEnd();
  return mois ? `${nettoye}\n[[urssaf-mois:${id}:${mois}]]` : nettoye;
}

// ============================================================
// GET — Liste complète des encaissements (DJ + Menuiserie)
// ============================================================
export async function GET() {
  if (!(await isAdmin())) {
    return new Response("Non autorisé", { status: 401 });
  }

  const supabase = createAdminClient();
  const [echeancesRes, quotesRes, menuRes] = await Promise.all([
    supabase
      .from("payment_schedule")
      .select(
        "id, quote_id, numero, total, amount_cents, status, paid_at, due_date, valide_urssaf, quotes(id, customer_name, formula_name, event_date, notes)",
      )
      .eq("status", "payee")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false }),
    // Tous les devis confirmés (volumes faibles) : acomptes + soldes.
    supabase
      .from("quotes")
      .select(
        "id, customer_name, formula_name, total_cents, event_date, notes, acompte_paid_at, acompte_required",
      )
      .eq("status", "confirme"),
    // Factures menuiserie payées (encaissements réels).
    supabase
      .from("menuiserie_docs")
      .select("id, numero, client_nom, type, total_cents, statut, date_edition, urssaf_declare, urssaf_mois")
      .eq("type", "facture")
      .eq("statut", "paye")
      .order("date_edition", { ascending: false }),
  ]);

  if (echeancesRes.error || quotesRes.error || menuRes.error) {
    const msg =
      echeancesRes.error?.message ?? quotesRes.error?.message ?? menuRes.error?.message ?? "Erreur de lecture";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  type QuoteJoint = {
    id: string;
    customer_name: string | null;
    formula_name: string | null;
    event_date: string | null;
    notes: string | null;
  };
  type Echeance = {
    id: string;
    quote_id: string;
    numero: number;
    total: number | null;
    amount_cents: number;
    paid_at: string | null;
    valide_urssaf: boolean | null;
    quotes: QuoteJoint | QuoteJoint[];
  };
  type Quote = {
    id: string;
    customer_name: string | null;
    formula_name: string | null;
    total_cents: number | null;
    event_date: string | null;
    notes: string | null;
    acompte_paid_at: string | null;
    acompte_required: boolean | null;
  };
  type MenuiserieDoc = {
    id: string;
    numero: string;
    client_nom: string;
    type: string;
    total_cents: number;
    statut: string;
    date_edition: string | null;
    urssaf_declare: boolean | null;
    urssaf_mois: string | null;
  };

  const receipts: UrssafReceipt[] = [];
  const echeances = (echeancesRes.data ?? []) as Echeance[];
  const echeancierQuoteIds = new Set(echeances.map((e) => e.quote_id));

  // ---------- 1. DJ : échéances d'échéancier payées ----------
  for (const e of echeances) {
    if (!e.paid_at) continue;
    const q = (Array.isArray(e.quotes) ? e.quotes[0] : e.quotes) as QuoteJoint | undefined;
    if (!q) continue;
    const notes = String(q.notes ?? "");
    const dateEnc = e.paid_at.slice(0, 10);
    const moisAuto = moisDe(dateEnc);
    const override = urssafOverride(notes, e.id);
    // Montant net (frais Stripe déduits via [[echeance-net:num:centimes]]).
    const netM = new RegExp(`\\[\\[echeance-net:${e.numero}:(\\d+)\\]\\]`).exec(notes);
    const montant = netM ? Number(netM[1]) : e.amount_cents;
    if (montant <= 0) continue;
    receipts.push({
      id: `dj-ech-${e.id}`,
      sourceId: e.id,
      activite: "dj",
      client: q.customer_name ?? "—",
      libelle: `Échéance ${e.numero}/${e.total}${q.formula_name ? ` — ${q.formula_name}` : ""}`,
      typePaiement: "echeance",
      datePrestation: q.event_date ?? null,
      dateEncaissement: dateEnc,
      montantCents: montant,
      moisUrssafAuto: moisAuto,
      moisUrssaf: override ?? moisAuto,
      rattachementManuel: override !== null && override !== moisAuto,
      declareUrssaf: Boolean(e.valide_urssaf),
    });
  }

  // ---------- 2. DJ : devis sans échéancier (acompte + soldes) ----------
  const quotes = (quotesRes.data ?? []) as Quote[];
  for (const q of quotes) {
    if (echeancierQuoteIds.has(q.id)) continue;
    const notes = String(q.notes ?? "");
    const formula = q.formula_name ?? "Prestation";
    const estImport = notes.includes("[[import-avant-site]]");

    // --- Acompte (date réelle d'encaissement : acompte_paid_at) ---
    if (q.acompte_paid_at) {
      const acompteM = /\[\[acompte:(\d+)\]\]/.exec(notes);
      const acompte = acompteM
        ? Number(acompteM[1])
        : q.acompte_required === false
          ? 0
          : Math.max(0, (q.total_cents ?? 0) - Math.floor(((q.total_cents ?? 0) * 0.8) / 10) * 10);
      if (acompte > 0) {
        const dateEnc = q.acompte_paid_at.slice(0, 10);
        const moisAuto = moisDe(dateEnc);
        const override = urssafOverride(notes, `acompte-${q.id}`);
        receipts.push({
          id: `dj-acompte-${q.id}`,
          sourceId: q.id,
          activite: "dj",
          client: q.customer_name ?? "—",
          libelle: `Acompte de réservation — ${formula}${estImport ? " (import)" : ""}`,
          typePaiement: "acompte",
          datePrestation: q.event_date ?? null,
          dateEncaissement: dateEnc,
          montantCents: acompte,
          moisUrssafAuto: moisAuto,
          moisUrssaf: override ?? moisAuto,
          rattachementManuel: override !== null && override !== moisAuto,
        });
      }
    }

    // --- Solde réglé EN LIGNE (carte/virement confirmé, montants nets) ---
    const soldeEnLigneM = /\[\[solde-en-ligne:(\d{4}-\d{2}-\d{2})\]\]/.exec(notes);
    if (soldeEnLigneM) {
      const netM = /\[\[solde-en-ligne-net:(\d+)\]\]/.exec(notes);
      const soldeFixeM = /\[\[solde-montant:(\d+)\]\]/.exec(notes);
      const acompteM = /\[\[acompte:(\d+)\]\]/.exec(notes);
      const solde = netM
        ? Number(netM[1])
        : soldeFixeM
          ? Number(soldeFixeM[1])
          : Math.max(0, (q.total_cents ?? 0) - (acompteM ? Number(acompteM[1]) : 0));
      if (solde > 0) {
        const dateEnc = soldeEnLigneM[1];
        const moisAuto = moisDe(dateEnc);
        const override = urssafOverride(notes, `solde-enligne-${q.id}`);
        receipts.push({
          id: `dj-solde-enligne-${q.id}`,
          sourceId: q.id,
          activite: "dj",
          client: q.customer_name ?? "—",
          libelle: `Solde (réglé en ligne) — ${formula}`,
          typePaiement: "solde",
          datePrestation: q.event_date ?? null,
          dateEncaissement: dateEnc,
          montantCents: solde,
          moisUrssafAuto: moisAuto,
          moisUrssaf: override ?? moisAuto,
          rattachementManuel: override !== null && override !== moisAuto,
        });
      }
    }
    // --- Solde validé manuellement (jamais cumulé avec « en ligne ») ---
    const soldeValideM = /\[\[solde-valide:(\d{4}-\d{2}-\d{2})\]\]/.exec(notes);
    if (soldeValideM && !soldeEnLigneM) {
      const total = q.total_cents ?? 0;
      const soldeFixeM = /\[\[solde-montant:(\d+)\]\]/.exec(notes);
      const acompteM = /\[\[acompte:(\d+)\]\]/.exec(notes);
      const acompte =
        acompteM
          ? Number(acompteM[1])
          : notes.includes("[[facture-libre]]") || estImport || q.acompte_required === false
            ? 0
            : Math.floor((total * 0.8) / 10) * 10;
      const solde = soldeFixeM ? Number(soldeFixeM[1]) : Math.max(0, total - acompte);
      if (solde > 0) {
        const dateEnc = soldeValideM[1];
        const moisAuto = moisDe(dateEnc);
        const override = urssafOverride(notes, `solde-valide-${q.id}`);
        receipts.push({
          id: `dj-solde-valide-${q.id}`,
          sourceId: q.id,
          activite: "dj",
          client: q.customer_name ?? "—",
          libelle: `Solde${estImport ? " (soirée importée)" : ""} — ${formula}`,
          typePaiement: "solde",
          datePrestation: q.event_date ?? null,
          dateEncaissement: dateEnc,
          montantCents: solde,
          moisUrssafAuto: moisAuto,
          moisUrssaf: override ?? moisAuto,
          rattachementManuel: override !== null && override !== moisAuto,
        });
      }
    }
  }

  // ---------- 3. Menuiserie : factures payées (encaissements réels) ----------
  const menuDocs = (menuRes.data ?? []) as MenuiserieDoc[];
  for (const f of menuDocs) {
    const dateEdition = f.date_edition ?? "";
    const dateEnc = dateEdition.slice(0, 10);
    if (!dateEnc) continue;
    const moisAuto = moisDe(dateEnc);
    const override = f.urssaf_mois && f.urssaf_mois !== moisAuto ? f.urssaf_mois : null;
    receipts.push({
      id: `menu-${f.id}`,
      sourceId: f.id,
      activite: "menuiserie",
      client: f.client_nom || "—",
      libelle: `Facture ${f.numero}`,
      typePaiement: "facture",
      datePrestation: null,
      dateEncaissement: dateEnc,
      montantCents: f.total_cents,
      moisUrssafAuto: moisAuto,
      moisUrssaf: f.urssaf_mois ?? moisAuto,
      rattachementManuel: override !== null,
      declareUrssaf: Boolean(f.urssaf_declare),
    });
  }

  // Tri : mois URSSAF décroissant puis date d'encaissement décroissante.
  receipts.sort((a, b) =>
    a.moisUrssaf === b.moisUrssaf
      ? b.dateEncaissement.localeCompare(a.dateEncaissement)
      : b.moisUrssaf.localeCompare(a.moisUrssaf),
  );

  return NextResponse.json({ receipts });
}

// ============================================================
// PATCH — Modification manuelle du mois de rattachement URSSAF
// ============================================================
// Body : { id: string, mois: "AAAA-MM" | "" }
//  - menu-<id>       : met à jour urssaf_mois (et urssaf_declare=true).
//  - dj-ech-<id>     : marqueur [[urssaf-mois:<payment_schedule.id>:mois]].
//  - dj-acompte-<id> : marqueur [[urssaf-mois:acompte-<quote_id>:mois]].
//  - dj-solde-<...>  : marqueur [[urssaf-mois:solde-<variante>-<quote_id>:mois]].
// mois vide = retour au rattachement automatique (supprime l'override).
export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { id?: string; mois?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  const mois = String(body.mois ?? "").trim();
  if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
  if (mois && !/^\d{4}-(0[1-9]|1[0-2])$/.test(mois)) {
    return NextResponse.json({ error: "Mois invalide (format AAAA-MM attendu)" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // --- Menuiserie : colonne urssaf_mois ---
  if (id.startsWith("menu-")) {
    const docId = id.slice("menu-".length);
    const { error } = await supabase
      .from("menuiserie_docs")
      .update({ urssaf_declare: Boolean(mois), urssaf_mois: mois || null })
      .eq("id", docId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // --- DJ : marqueur dans les notes du devis ---
  let quoteId: string | null = null;
  if (id.startsWith("dj-ech-")) {
    const echId = id.slice("dj-ech-".length);
    const { data } = await supabase.from("payment_schedule").select("quote_id").eq("id", echId).maybeSingle();
    quoteId = data?.quote_id ?? null;
    if (!quoteId) return NextResponse.json({ error: "Échéance introuvable" }, { status: 404 });
  } else if (id.startsWith("dj-acompte-") || id.startsWith("dj-solde-")) {
    const reste = id.slice("dj-".length);
    quoteId = reste.replace(/^acompte-/, "").replace(/^solde-(?:enligne|valide)-/, "");
  } else {
    return NextResponse.json({ error: "Type d'encaissement inconnu" }, { status: 400 });
  }

  const { data: q, error: eq } = await supabase.from("quotes").select("id, notes").eq("id", quoteId).maybeSingle();
  if (eq || !q) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const notes = ecrireOverride(String(q.notes ?? ""), id, mois);
  const { error: upd } = await supabase.from("quotes").update({ notes }).eq("id", q.id);
  if (upd) return NextResponse.json({ error: upd.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

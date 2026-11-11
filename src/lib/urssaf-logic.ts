// ============================================================
// Logique URSSAF partagée — SOURCE UNIQUE DE VÉRITÉ
// ============================================================
// Utilisée par /admin (accueil) ET /admin/urssaf (dashboard détaillé)
// pour que les deux vues soient TOUJOURS synchronisées.
//
// Règles de rattachement (identiques partout) :
//   - Chaque encaissement est compté à sa DATE RÉELLE d'encaissement :
//       * échéance       -> paid_at (paiement en ligne) sinon due_date
//       * acompte        -> acompte_paid_at (encaissement réel/déclaré)
//       * solde en ligne -> date du marqueur [[solde-en-ligne:date]]
//       * solde validé   -> date du marqueur [[solde-valide:date]]
//       * facture menuiserie -> date d'édition (statut « paye »)
//   - Montant = NET réellement encaissé : frais Stripe déduits via les
//     marqueurs nets ([[acompte-net]], [[solde-en-ligne-net]],
//     [[echeance-net:numero]]) posés par le webhook.
//   - Rattachement manuel possible : marqueur [[urssaf-mois:<id>:AAAA-MM]]
//     dans les notes du devis (DJ) ou colonne urssaf_mois (Menuiserie),
//     posés depuis le dashboard /admin/urssaf.
// ============================================================

export type Activite = "dj" | "menuiserie";

export type UrssafReceipt = {
  id: string; // menu-<id> | dj-ech-<id> | dj-acompte-<quoteId> | dj-solde-enligne-<quoteId> | dj-solde-valide-<quoteId>
  sourceId: string;
  activite: Activite;
  client: string;
  libelle: string;
  typePaiement: "acompte" | "solde" | "echeance" | "facture";
  datePrestation: string | null;
  dateEncaissement: string;
  montantCents: number;
  moisUrssafAuto: string; // AAAA-MM déduit de la date d'encaissement
  moisUrssaf: string; // override manuel ou moisAuto
  rattachementManuel: boolean;
  declareUrssaf: boolean;
  quoteId: string | null;
  formulaName: string | null;
};

export type QuoteLike = {
  id: string;
  customer_name?: string | null;
  formula_name?: string | null;
  total_cents?: number | null;
  event_date?: string | null;
  notes?: string | null;
  acompte_paid_at?: string | null;
  acompte_required?: boolean | null;
};

export type EcheanceLike = {
  id: string;
  quote_id: string;
  numero: number;
  total?: number | null;
  amount_cents: number;
  due_date: string;
  status?: string | null;
  paid_at?: string | null;
  valide_urssaf?: boolean | null;
};

export type MenuiserieDocLike = {
  id: string;
  numero: string;
  client_nom: string | null;
  type: string;
  total_cents: number;
  statut: string;
  date_edition: string | null;
  urssaf_declare?: boolean | null;
  urssaf_mois?: string | null;
};

export const moisDe = (date: string) => date.slice(0, 7);

export function montantDe(q: { total_cents?: number | null }): number {
  const n = Number(q.total_cents ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// Mois de rattachement manuel : marqueur [[urssaf-mois:<id>:AAAA-MM]]
// dans les notes du devis (posé via le dashboard CA URSSAF).
export function urssafOverride(notes: string, id: string): string | null {
  const m = new RegExp(`\\[\\[urssaf-mois:${id}:(\\d{4}-\\d{2})\\]\\]`).exec(notes);
  return m ? m[1] : null;
}

// ---- Montants canoniques (règles identiques accueil / dashboard) ----

// Solde attendu d'un devis : [[solde-montant]] figé, sinon total - acompte
// (marqueur [[acompte]] ou règle standard du devis PDF : acompte 20 %,
// solde arrondi à la dizaine inférieure). Facture libre / import / sans
// acompte -> total dû.
export function soldeDe(q: QuoteLike): number {
  const notes = String(q.notes ?? "");
  const total = montantDe(q);
  const soldeFixe = /\[\[solde-montant:(\d+)\]\]/.exec(notes);
  if (soldeFixe) return Number(soldeFixe[1]);
  const marker = /\[\[acompte:(\d+)\]\]/.exec(notes);
  if (marker) return Math.max(0, total - Number(marker[1]));
  if (notes.includes("[[facture-libre]]")) return total;
  if (notes.includes("[[import-avant-site]]")) return total;
  if (q.acompte_required === false) return total;
  return Math.max(0, total - Math.floor((total * 0.8) / 10) * 10);
}

// Acompte attendu : marqueur [[acompte:centimes]], sinon règle standard.
export function acompteDe(q: QuoteLike): number {
  const marker = /\[\[acompte:(\d+)\]\]/.exec(String(q.notes ?? ""));
  if (marker) return Number(marker[1]);
  if (q.acompte_required === false) return 0;
  return montantDe(q) - Math.floor((montantDe(q) * 0.8) / 10) * 10;
}

// Acompte NET réellement encaissé : frais Stripe déduits via
// [[acompte-net:centimes]] (webhook) ; sans marqueur, le montant complet.
export function acompteNetDe(q: QuoteLike): number {
  const net = /\[\[acompte-net:(\d+)\]\]/.exec(String(q.notes ?? ""));
  return net ? Number(net[1]) : acompteDe(q);
}

// Date de réglage en ligne du solde : [[solde-en-ligne:date]] (Stripe
// checkout ou virement confirmé, automatiquement compté dans l'URSSAF).
export function soldeEnLigneDe(q: { notes?: string | null }): string | null {
  return /\[\[solde-en-ligne:(\d{4}-\d{2}-\d{2})\]\]/.exec(String(q.notes ?? ""))?.[1] ?? null;
}

// Solde en ligne NET : frais Stripe déduits via [[solde-en-ligne-net:]].
export function soldeEnLigneNetDe(q: QuoteLike): number {
  const net = /\[\[solde-en-ligne-net:(\d+)\]\]/.exec(String(q.notes ?? ""));
  return net ? Number(net[1]) : soldeDe(q);
}

// Échéanciers : net de chaque échéance mémorisé via
// [[echeance-net:numero:centimes]] (webhook) ; sinon le brut.
export function netEcheance(notes: string, numero: number, brut: number): number {
  const m = new RegExp(`\\[\\[echeance-net:${numero}:(\\d+)\\]\\]`).exec(notes);
  return m ? Number(m[1]) : brut;
}

// ---- Factures DJ (acomptes/soldes facturés, factures libres…) ----
// Marqueurs posés à la génération du PDF : [[facture:F-2026-012:53200]]
// (numéro + montant en centimes). Le paiement est confirmé en deux temps,
// comme l'acompte : déclaration du client [[facture-declaree:F-…:date]] puis
// validation admin [[facture-paye:F-…:date]] → compté dans le CA URSSAF.
export type FactureInfo = { numero: string; montantCents: number };

export function facturesDe(notes: string): FactureInfo[] {
  const out: FactureInfo[] = [];
  const re = /\[\[facture:(F-\d{4}-\d{3}):(\d+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(notes))) {
    out.push({ numero: m[1], montantCents: Number(m[2]) });
  }
  return out;
}

export function facturePayeDe(notes: string, numero: string): string | null {
  return new RegExp(`\\[\\[facture-paye:${numero}:(\\d{4}-\\d{2}-\\d{2})\\]\\]`).exec(notes)?.[1] ?? null;
}

export function factureDeclareeDe(notes: string, numero: string): string | null {
  return new RegExp(`\\[\\[facture-declaree:${numero}:(\\d{4}-\\d{2}-\\d{2})\\]\\]`).exec(notes)?.[1] ?? null;
}

// ============================================================
// Calcul de TOUS les encaissements URSSAF (fonction principale)
// ============================================================
export function calculerEncaissementsUrssaf(input: {
  quotes: QuoteLike[];
  echeances: EcheanceLike[];
  menuiserieDocs: MenuiserieDocLike[];
}): UrssafReceipt[] {
  const receipts: UrssafReceipt[] = [];
  const notesParQuote = new Map(input.quotes.map((q) => [q.id, String(q.notes ?? "")]));
  const echeancierQuoteIds = new Set(input.echeances.map((e) => e.quote_id));

  // ---------- DJ : échéances d'échéancier payées ----------
  // Date d'encaissement réelle = paid_at (webhook/client) sinon due_date.
  for (const e of input.echeances) {
    const payee = e.status === "payee";
    const dateEnc = (e.paid_at ?? (payee ? e.due_date : "")).slice(0, 10);
    if (!payee || !dateEnc) continue;
    const q = input.quotes.find((qq) => qq.id === e.quote_id);
    if (!q) continue;
    const notes = notesParQuote.get(q.id) ?? "";
    const override = urssafOverride(notes, `dj-ech-${e.id}`);
    const montant = netEcheance(notes, e.numero, e.amount_cents);
    if (montant <= 0) continue;
    const moisAuto = moisDe(dateEnc);
    receipts.push({
      id: `dj-ech-${e.id}`,
      sourceId: e.id,
      activite: "dj",
      client: q.customer_name ?? "—",
      libelle: `Échéance ${e.numero}/${e.total ?? "?"}${q.formula_name ? ` — ${q.formula_name}` : ""}`,
      typePaiement: "echeance",
      datePrestation: q.event_date ?? null,
      dateEncaissement: dateEnc,
      montantCents: montant,
      moisUrssafAuto: moisAuto,
      moisUrssaf: override ?? moisAuto,
      rattachementManuel: override !== null && override !== moisAuto,
      declareUrssaf: Boolean(e.valide_urssaf),
      quoteId: q.id,
      formulaName: q.formula_name ?? null,
    });
  }

  // ---------- DJ : devis sans échéancier (acompte + soldes) ----------
  for (const q of input.quotes) {
    const notesToutes = notesParQuote.get(q.id) ?? "";

    // --- Factures DJ payées (validées par l'admin, comme l'acompte) ---
    // Chaque facture générée (acompte/solde facturé, facture libre liée ou
    // non) inscrit [[facture:numéro:montant]] ; dès la validation du
    // paiement [[facture-paye:numéro:date]], elle compte dans le CA URSSAF
    // du mois de cette date — même mécanique que les factures menuiserie.
    for (const f of facturesDe(notesToutes)) {
      const payeLe = facturePayeDe(notesToutes, f.numero);
      if (!payeLe || f.montantCents <= 0) continue;
      const moisAutoF = moisDe(payeLe);
      const overrideF = urssafOverride(notesToutes, `dj-facture-${f.numero}`);
      receipts.push({
        id: `dj-facture-${f.numero}`,
        sourceId: f.numero,
        activite: "dj",
        client: q.customer_name ?? "—",
        libelle: `Facture ${f.numero}`,
        typePaiement: "facture",
        datePrestation: q.event_date ?? null,
        dateEncaissement: payeLe,
        montantCents: f.montantCents,
        moisUrssafAuto: moisAutoF,
        moisUrssaf: overrideF ?? moisAutoF,
        rattachementManuel: overrideF !== null && overrideF !== moisAutoF,
        declareUrssaf: true,
        quoteId: q.id,
        formulaName: q.formula_name ?? null,
      });
    }

    if (echeancierQuoteIds.has(q.id)) continue;
    const notes = notesParQuote.get(q.id) ?? "";
    const formula = q.formula_name ?? "Prestation";
    const estImport = notes.includes("[[import-avant-site]]");

    // --- Acompte (date réelle d'encaissement : acompte_paid_at) ---
    if (q.acompte_paid_at) {
      const acompte = acompteNetDe(q);
      if (acompte > 0) {
        const dateEnc = q.acompte_paid_at.slice(0, 10);
        const moisAuto = moisDe(dateEnc);
        const override = urssafOverride(notes, `dj-acompte-${q.id}`);
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
          declareUrssaf: notes.includes("[[acompte-valide:"),
          quoteId: q.id,
          formulaName: q.formula_name ?? null,
        });
      }
    }

    // --- Solde réglé EN LIGNE (carte/virement confirmé, montants nets) ---
    const soldeEnLigneDate = soldeEnLigneDe(q);
    if (soldeEnLigneDate) {
      const solde = soldeEnLigneNetDe(q);
      if (solde > 0) {
        const moisAuto = moisDe(soldeEnLigneDate);
        const override = urssafOverride(notes, `dj-solde-enligne-${q.id}`);
        receipts.push({
          id: `dj-solde-enligne-${q.id}`,
          sourceId: q.id,
          activite: "dj",
          client: q.customer_name ?? "—",
          libelle: `Solde (réglé en ligne) — ${formula}`,
          typePaiement: "solde",
          datePrestation: q.event_date ?? null,
          dateEncaissement: soldeEnLigneDate,
          montantCents: solde,
          moisUrssafAuto: moisAuto,
          moisUrssaf: override ?? moisAuto,
          rattachementManuel: override !== null && override !== moisAuto,
          declareUrssaf: true,
          quoteId: q.id,
          formulaName: q.formula_name ?? null,
        });
      }
    }

    // --- Solde validé manuellement (jamais cumulé avec « en ligne ») ---
    const soldeValideM = /\[\[solde-valide:(\d{4}-\d{2}-\d{2})\]\]/.exec(notes);
    if (soldeValideM && !soldeEnLigneDate) {
      const solde = soldeDe(q);
      if (solde > 0) {
        const dateEnc = soldeValideM[1];
        const moisAuto = moisDe(dateEnc);
        const override = urssafOverride(notes, `dj-solde-valide-${q.id}`);
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
          declareUrssaf: true,
          quoteId: q.id,
          formulaName: q.formula_name ?? null,
        });
      }
    }
  }

  // ---------- Menuiserie : factures payées (encaissements réels) ----------
  for (const f of input.menuiserieDocs) {
    if (f.type !== "facture" || f.statut !== "paye") continue;
    const dateEnc = (f.date_edition ?? "").slice(0, 10);
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
      quoteId: null,
      formulaName: null,
    });
  }

  // Tri : mois URSSAF décroissant puis date d'encaissement décroissante.
  receipts.sort((a, b) =>
    a.moisUrssaf === b.moisUrssaf
      ? b.dateEncaissement.localeCompare(a.dateEncaissement)
      : b.moisUrssaf.localeCompare(a.moisUrssaf),
  );

  return receipts;
}

// Ecriture du rattachement manuel dans les notes du devis.
// mois vide = retour au rattachement automatique (supprime l'override).
export function ecrireOverride(notes: string, id: string, mois: string): string {
  const motif = new RegExp(`\\n?\\[\\[urssaf-mois:${id}:\\d{4}-\\d{2}\\]\\]`, "g");
  const nettoye = notes.replace(motif, "").trimEnd();
  return mois ? `${nettoye}\n[[urssaf-mois:${id}:${mois}]]` : nettoye;
}
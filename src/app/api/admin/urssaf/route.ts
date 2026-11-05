import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculerEncaissementsUrssaf,
  ecrireOverride,
} from "@/lib/urssaf-logic";

export const runtime = "nodejs";

// ============================================================
// CA URSSAF — encaissements normalisés (DJ + Menuiserie)
// ============================================================
// GET  : liste détaillée de chaque encaissement avec date de
//        prestation, date réelle d'encaissement, type de paiement,
//        montant net et mois de rattachement URSSAF (override manuel
//        appliqué). La logique de calcul vit dans src/lib/urssaf-logic.ts
//        et est partagée avec l'accueil /admin : les deux vues sont
//        toujours synchronisées.
// PATCH: modification manuelle du mois de rattachement (menuiserie :
//        colonne urssaf_mois ; DJ : marqueur [[urssaf-mois:<id>]]
//        dans les notes du devis).

// Réexport du type pour les composants qui l'importaient depuis la route.
export type { UrssafReceipt } from "@/lib/urssaf-logic";

// ============================================================
// GET — Liste complète des encaissements (DJ + Menuiserie)
// ============================================================
export async function GET() {
  if (!(await isAdmin())) {
    return new Response("Non autorisé", { status: 401 });
  }

  const supabase = createAdminClient();
  const [echeancesRes, quotesRes, menuRes] = await Promise.all([
    // Toutes les échéances : le module partagé filtre les payées et
    // rattache chaque encaissement à sa date réelle (paid_at sinon due_date).
    supabase
      .from("payment_schedule")
      .select(
        "id, quote_id, numero, total, amount_cents, due_date, status, paid_at, valide_urssaf",
      )
      .order("due_date", { ascending: true }),
    // Tous les devis confirmés (volumes faibles) : acomptes + soldes.
    supabase
      .from("quotes")
      .select(
        "id, customer_name, formula_name, total_cents, event_date, notes, acompte_paid_at, acompte_required",
      )
      .eq("status", "confirme"),
    // Toutes les factures menuiserie : le module filtre les payées et
    // applique l'override manuel urssaf_mois.
    supabase
      .from("menuiserie_docs")
      .select(
        "id, numero, client_nom, type, total_cents, statut, date_edition, urssaf_declare, urssaf_mois",
      )
      .order("date_edition", { ascending: false }),
  ]);

  if (echeancesRes.error || quotesRes.error || menuRes.error) {
    const msg =
      echeancesRes.error?.message ??
      quotesRes.error?.message ??
      menuRes.error?.message ??
      "Erreur de lecture";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Calcul unifié (mêmes règles que l'accueil /admin) :
  //  - chaque paiement compté individuellement, sans doublon ;
  //  - rattachement à la date réelle d'encaissement ;
  //  - montants nets de frais Stripe (marqueurs nets du webhook) ;
  //  - overrides manuels [[urssaf-mois:<id>]] / urssaf_mois appliqués.
  const receipts = calculerEncaissementsUrssaf({
    quotes: quotesRes.data ?? [],
    echeances: echeancesRes.data ?? [],
    menuiserieDocs: menuRes.data ?? [],
  });

  return NextResponse.json({ receipts });
}

// ============================================================
// PATCH — Modification manuelle du mois de rattachement URSSAF
// ============================================================
// Body : { id: string, mois: "AAAA-MM" | "" }
//  - menu-<id>       : met à jour urssaf_mois (et urssaf_declare=true).
//  - dj-ech-<id>     : marqueur [[urssaf-mois:dj-ech-<id>]] dans le devis.
//  - dj-acompte-<id> : marqueur [[urssaf-mois:dj-acompte-<id>]].
//  - dj-solde-<...>  : marqueurs dj-solde-enligne / dj-solde-valide.
// mois vide = retour au rattachement automatique (supprime l'override).
export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    mois?: string;
  } | null;
  const id = String(body?.id ?? "").trim();
  const mois = String(body?.mois ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
  }
  if (mois && !/^\d{4}-\d{2}$/.test(mois)) {
    return NextResponse.json({ error: "Format de mois invalide (AAAA-MM attendu)" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // --- Menuiserie : colonne urssaf_mois directe ---
  if (id.startsWith("menu-")) {
    const docId = id.slice("menu-".length);
    const { error } = await supabase
      .from("menuiserie_docs")
      .update({ urssaf_mois: mois || null, urssaf_declare: true })
      .eq("id", docId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // --- DJ : retrouver le devis concerné ---
  let quoteId: string | null;
  if (id.startsWith("dj-ech-")) {
    const echId = id.slice("dj-ech-".length);
    const { data } = await supabase.from("payment_schedule").select("quote_id").eq("id", echId).maybeSingle();
    quoteId = data?.quote_id ?? null;
    if (!quoteId) return NextResponse.json({ error: "Échéance introuvable" }, { status: 404 });
  } else if (id.startsWith("dj-acompte-") || id.startsWith("dj-solde-enligne-") || id.startsWith("dj-solde-valide-")) {
    quoteId = id
      .slice("dj-".length)
      .replace(/^acompte-/, "")
      .replace(/^solde-(?:enligne|valide)-/, "");
  } else {
    return NextResponse.json({ error: "Type d'encaissement inconnu" }, { status: 400 });
  }

  const { data: q, error } = await supabase.from("quotes").select("notes").eq("id", quoteId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!q) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  // Écriture du marqueur d'override dans les notes du devis.
  const notes = ecrireOverride(String(q.notes ?? ""), id, mois);
  const upd = await supabase.from("quotes").update({ notes }).eq("id", quoteId);
  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
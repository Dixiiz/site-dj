import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MenuiserieLine } from "@/lib/menuiserie-pdf";

// CRUD des documents (devis/factures) du domaine menuiserie
// (table menuiserie_docs). Réservé à l'admin.

type LigneInput = { designation?: unknown; quantite?: unknown; prixUnitaireCents?: unknown };

function parseLignes(raw: unknown): { lignes: MenuiserieLine[]; totalCents: number } | null {
  if (!Array.isArray(raw)) return null;
  const lignes: MenuiserieLine[] = [];
  let total = 0;
  for (const l of raw as LigneInput[]) {
    const designation = String(l.designation ?? "").trim();
    const quantite = Number(l.quantite);
    const pu = Number(l.prixUnitaireCents);
    if (!designation || !Number.isFinite(quantite) || quantite <= 0) continue;
    if (!Number.isFinite(pu) || pu <= 0) continue;
    lignes.push({ designation, quantite, prixUnitaireCents: Math.round(pu) });
    total += Math.round(quantite * Math.round(pu));
  }
  return lignes.length > 0 ? { lignes, totalCents: total } : null;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("menuiserie_docs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ docs: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const type = body?.type === "facture" ? "facture" : body?.type === "devis" ? "devis" : null;
  if (!type) return NextResponse.json({ error: "Type invalide." }, { status: 400 });

  const parsed = parseLignes(body?.lignes);
  if (!parsed) {
    return NextResponse.json(
      { error: "Ajoute au moins une ligne avec une désignation et un prix." },
      { status: 400 },
    );
  }
  const clientNom = String(body?.client_nom ?? "").trim();
  const clientAdresse = String(body?.client_adresse ?? "").trim();
  const clientCp = String(body?.client_cp ?? "").trim();
  const clientVille = String(body?.client_ville ?? "").trim();
  if (!clientNom || !clientAdresse || !clientCp || !clientVille) {
    return NextResponse.json(
      { error: "Nom, adresse, code postal et ville du client sont obligatoires." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  // Numérotation indépendante : DEV-2026-001 / FAC-2026-001…
  const prefix = type === "facture" ? "FAC" : "DEV";
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("menuiserie_docs")
    .select("id", { count: "exact", head: true })
    .like("numero", `${prefix}-${year}-%`);
  const numero = `${prefix}-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data, error } = await supabase
    .from("menuiserie_docs")
    .insert({
      type,
      numero,
      client_nom: clientNom,
      client_adresse: clientAdresse,
      client_cp: clientCp,
      client_ville: clientVille,
      client_email: String(body?.client_email ?? "").trim(),
      client_telephone: String(body?.client_telephone ?? "").trim(),
      date_edition: String(body?.date_edition ?? "").trim() || new Date().toISOString().slice(0, 10),
      date_validite:
        type === "devis"
          ? String(body?.date_validite ?? "").trim() || null
          : null,
      lignes: parsed.lignes,
      total_cents: parsed.totalCents,
      devis_source: body?.devis_source ? String(body.devis_source) : null,
      statut: "brouillon",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Conversion devis → facture : mémorise le lien inverse sur le devis.
  if (body?.devis_source) {
    await supabase
      .from("menuiserie_docs")
      .update({ facture_lien: data.id })
      .eq("id", String(body.devis_source));
  }

  revalidatePath("/admin/menuiserie");
  return NextResponse.json({ doc: data });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = String(body?.id ?? "");
  const statut = String(body?.statut ?? "");
  const urssaf = body?.urssaf;
  const autorises = ["brouillon", "envoye", "accepte", "refuse", "paye"];

  // Bascule URSSAF : coche « déclaré » (+ mois de déclaration AAAA-MM).
  if (id && urssaf !== undefined) {
    const declare = Boolean(urssaf);
    const mois = String(body?.urssaf_mois ?? "").trim();
    if (declare && !/^\d{4}-\d{2}$/.test(mois)) {
      return NextResponse.json(
        { error: "Mois de déclaration invalide (format attendu AAAA-MM)." },
        { status: 400 },
      );
    }
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("menuiserie_docs")
      .update({ urssaf_declare: declare, urssaf_mois: declare ? mois : null })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/admin/menuiserie");
    return NextResponse.json({ ok: true });
  }

  if (!id || !autorises.includes(statut)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("menuiserie_docs").update({ statut }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/admin/menuiserie");
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Document introuvable." }, { status: 400 });
  const supabase = createAdminClient();
  // Supprime aussi le PDF archivé dans le storage, s'il existe.
  const { data: doc } = await supabase
    .from("menuiserie_docs")
    .select("numero, client_nom")
    .eq("id", id)
    .maybeSingle();
  if (doc) {
    const safeName = doc.client_nom.replace(/[^a-z0-9]+/gi, "_");
    await supabase.storage
      .from("client-files")
      .remove([`admin/menuiserie/${doc.numero}_${safeName}.pdf`]);
  }
  const { error } = await supabase.from("menuiserie_docs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/admin/menuiserie");
  return NextResponse.json({ ok: true });
}


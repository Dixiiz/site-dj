import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMenuiseriePdf, type MenuiserieDocData } from "@/lib/menuiserie-pdf";

// Génère (ou régénère) le PDF d'un document menuiserie, l'archive dans le
// storage et renvoie une URL signée (7 jours) pour le télécharger.

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "Document introuvable." }, { status: 400 });

  const supabase = createAdminClient();
  const { data: doc, error } = await supabase
    .from("menuiserie_docs")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !doc) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  const payload: MenuiserieDocData = {
    type: doc.type === "facture" ? "facture" : "devis",
    numero: doc.numero,
    dateEdition: doc.date_edition,
    dateValidite: doc.date_validite,
    clientNom: doc.client_nom,
    clientAdresse: doc.client_adresse,
    clientCp: doc.client_cp,
    clientVille: doc.client_ville,
    clientEmail: doc.client_email,
    clientTelephone: doc.client_telephone,
    lignes: Array.isArray(doc.lignes) ? doc.lignes : [],
    acompteInclus: doc.acompte_inclus !== false,
  };

  try {
    const bytes = await buildMenuiseriePdf(payload);
    const safeName = doc.client_nom.replace(/[^a-z0-9]+/gi, "_");
    const storagePath = `admin/menuiserie/${doc.numero}_${safeName}.pdf`;
    await supabase.storage
      .from("client-files")
      .upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });
    const { data: signed } = await supabase.storage
      .from("client-files")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    return NextResponse.json({
      url: signed?.signedUrl ?? null,
      numero: doc.numero,
      fileName: `${doc.type === "facture" ? "Facture" : "Devis"} ${doc.numero}.pdf`,
    });
  } catch (e) {
    console.error("Erreur génération PDF menuiserie", e);
    return NextResponse.json({ error: "Échec de la génération du PDF." }, { status: 500 });
  }
}

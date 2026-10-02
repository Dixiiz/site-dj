import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMenuiseriePdf, type MenuiserieDocData } from "@/lib/menuiserie-pdf";
import { EMAIL_FROM } from "@/lib/emails";

// Envoie par e-mail (Resend) un devis/facture menuiserie : le PDF est joint
// au message ET un lien signé (7 jours) est fourni en secours.

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { id?: unknown; email?: unknown } | null;
  const id = String(body?.id ?? "");
  const to = String(body?.email ?? "").trim();
  if (!id) return NextResponse.json({ error: "Document introuvable." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Envoi d'e-mail non configuré." }, { status: 500 });
  }

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
  };
  const typeLabel = doc.type === "facture" ? "Facture" : "Devis";

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
    const downloadUrl = signed?.signedUrl;

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `${typeLabel} ${doc.numero} — Soulaine Menuiserie`,
      html: `<div style="font-family:Arial,sans-serif;color:#1a1a1f;max-width:560px;margin:0 auto;padding:24px;">
        <p>Bonjour,</p>
        <p>Veuillez trouver ci-joint votre ${typeLabel.toLowerCase()} <strong>${doc.numero}</strong>.</p>
        ${downloadUrl ? `<p style="margin:28px 0;">
          <a href="${downloadUrl}" style="background:#5a3117;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Télécharger le ${typeLabel.toLowerCase()} PDF</a>
        </p>` : ""}
        <p style="color:#737373;font-size:13px;">Ce lien est valable 7 jours. Si besoin, demandez-nous un nouveau lien.</p>
        <p style="color:#737373;font-size:13px;">À très bientôt,<br/>Maxime — Soulaine Menuiserie</p>
      </div>`,
      text: `Bonjour,\n\nVotre ${typeLabel.toLowerCase()} ${doc.numero} est disponible ici (lien valable 7 jours) :\n${downloadUrl ?? "(voir pièce jointe)"}\n\nÀ très bientôt,\nMaxime — Soulaine Menuiserie`,
      attachments: [
        {
          filename: `${typeLabel} ${doc.numero}.pdf`,
          content: Buffer.from(bytes).toString("base64"),
        },
      ],
    });

    // Passage automatique au statut « envoyé » si le document était un brouillon.
    if (doc.statut === "brouillon") {
      await supabase.from("menuiserie_docs").update({ statut: "envoye" }).eq("id", id);
    }
    revalidatePath("/admin/menuiserie");
    return NextResponse.json({ ok: true, message: `${typeLabel} envoyé à ${to} ✓` });
  } catch (e) {
    console.error("Envoi menuiserie impossible", e);
    return NextResponse.json({ error: "Échec de l'envoi de l'e-mail." }, { status: 500 });
  }
}

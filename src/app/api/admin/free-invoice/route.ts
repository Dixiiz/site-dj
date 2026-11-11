import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const STORAGE_FOLDER = "admin/factures-libres";

function parseEuros(value: string): number {
  const n = parseFloat(value.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return new NextResponse("Accès refusé.", { status: 403 });
  }

  const formData = await request.formData();
  const str = (key: string) => String(formData.get(key) ?? "").trim();

  const customer_name = str("customer_name");
  if (!customer_name) {
    return new NextResponse("Le nom du client est obligatoire.", { status: 400 });
  }

  // Lignes de facturation : désignation + quantité (décimales acceptées pour
  // les heures : 3,5 / 3,25…) + prix unitaire (€).
  const parseQty = (value: string) => {
    const n = parseFloat(value.replace(",", ".").replace(/\s/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 1;
  };
  const labels = formData.getAll("line_label").map((v) => String(v).trim());
  const qtys = formData.getAll("line_qty").map((v) => parseQty(String(v)));
  const prices = formData.getAll("line_price").map((v) => parseEuros(String(v)));
  const lines = labels
    .map((label, index) => ({
      label,
      qty: qtys[index] ?? 1,
      price_cents: prices[index] ?? 0,
      // Total de la ligne arrondi au centime (qty décimale possible).
      line_total_cents: Math.round((qtys[index] ?? 1) * (prices[index] ?? 0)),
    }))
    .filter((line) => line.label.length > 0 && line.price_cents > 0);
  if (lines.length === 0) {
    return new NextResponse("Ajoute au moins une ligne avec un montant.", { status: 400 });
  }
  const total_cents = lines.reduce((sum, line) => sum + line.line_total_cents, 0);

  const supabase = createAdminClient();

  // Liaison facultative à un devis existant : la facture apparaît alors aussi
  // dans les documents du devis (et aucune soirée dupliquée n'est créée).
  const linkedQuoteId = str("linked_quote_id");
  if (linkedQuoteId) {
    const { data: linkedQuote } = await supabase
      .from("quotes")
      .select("id")
      .eq("id", linkedQuoteId)
      .single();
    if (!linkedQuote) {
      return new NextResponse("Devis lié introuvable.", { status: 400 });
    }
  }

  const year = new Date().getFullYear();

  // Numérotation partagée avec les factures de devis (F-2026-001, F-2026-002…).
  const { data: stored } = await supabase.storage
    .from("client-files")
    .list(STORAGE_FOLDER, { limit: 1000 });
  const storageCount = (stored ?? []).filter((f) => f.name.startsWith(`F-${year}-`)).length;
  const { count: quoteCount } = await supabase
    .from("quote_files")
    .select("id", { count: "exact", head: true })
    .like("name", `Facture F-${year}-%.pdf`);
  const sequence = Math.max(storageCount, quoteCount ?? 0) + 1;
  const invoiceNumber = `F-${year}-${String(sequence).padStart(3, "0")}`;

  // Structure attendue par buildFacturePdf : toutes les lignes en
  // "options" pour préserver quantité (décimale) × taux de chaque ligne.
  const fakeQuote = {
    customer_name,
    customer_email: str("customer_email") || null,
    customer_phone: str("customer_phone") || null,
    customer_address: str("customer_address") || null,
    customer_postal_code: str("customer_postal_code") || null,
    customer_city: str("customer_city") || null,
    event_type: str("event_type") || null,
    event_date: str("event_date") || null,
    event_location: str("event_location") || null,
    start_time: str("start_time") || null,
    end_time: str("end_time") || null,
    formula_name: null,
    formula_price_cents: null,
    selected_options: lines.map((line) => ({
      name: line.label,
      price_cents: line.price_cents,
      qty: line.qty,
    })),
    travel_fee_cents: 0,
    travel_distance_km: null,
    extra_fee_cents: 0,
    extra_hours: null,
    total_cents,
  };

  try {
    const { buildFacturePdf } = await import("@/lib/facture-pdf");
    const bytes = await buildFacturePdf(fakeQuote as never, {
      invoiceNumber,
      hideAcompte: true,
      plainLines: true,
    });

    // Archivage dans le storage (historique + numérotation persistante).
    const safeName = customer_name.replace(/[^a-z0-9]+/gi, "_");
    const storagePath = `${STORAGE_FOLDER}/${invoiceNumber}_${safeName}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("client-files")
      .upload(storagePath, bytes, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      console.error("Upload facture libre impossible", uploadError);
      if (linkedQuoteId) {
        // Une facture liée DOIT exister dans le storage : la ligne quote_files
        // du devis pointe vers ce chemin.
        return new NextResponse("Échec de l'archivage de la facture.", { status: 500 });
      }
    }

    if (linkedQuoteId) {
      // Facture libre LIÉE à un devis : référencée dans quote_files, elle
      // apparaît à la fois ici et dans les documents du devis (admin + espace
      // client). Pas de soirée dupliquée : le devis lié alimente déjà le CA,
      // le planning et les stats du tableau de bord.
      let ownerUserId: string | null = null;
      for (const table of ["quote_files", "quote_messages", "playlist_tracks"] as const) {
        const { data } = await supabase
          .from(table)
          .select("user_id")
          .eq("quote_id", linkedQuoteId)
          .not("user_id", "is", null)
          .limit(1)
          .maybeSingle();
        if (data?.user_id) {
          ownerUserId = String(data.user_id);
          break;
        }
      }
      const { error: fileError } = await supabase.from("quote_files").insert({
        quote_id: linkedQuoteId,
        user_id: ownerUserId,
        name: `Facture ${invoiceNumber}.pdf`,
        storage_path: storagePath,
        mime_type: "application/pdf",
        size_bytes: bytes.length,
        from_admin: true,
        doc_kind: "info",
      });
      if (fileError) {
        console.error("Liaison facture libre au devis impossible", fileError);
      }

      // Marqueur de facturation sur le devis lié (montant = total des lignes) :
      // il alimente la confirmation de paiement et le CA URSSAF.
      const { data: curNotes } = await supabase
        .from("quotes")
        .select("notes")
        .eq("id", linkedQuoteId)
        .single();
      const notesBase = String(curNotes?.notes ?? "");
      if (total_cents > 0 && !notesBase.includes(`[[facture:${invoiceNumber}:`)) {
        await supabase
          .from("quotes")
          .update({
            notes: `${notesBase}${notesBase ? "\n" : ""}[[facture:${invoiceNumber}:${total_cents}]]`,
          })
          .eq("id", linkedQuoteId);
      }

      revalidatePath("/admin/devis");
      revalidatePath(`/mon-espace/devis/${linkedQuoteId}`);
    } else {
      // La facture devient aussi une soirée confirmée : elle alimente le CA,
      // le planning et les stats du tableau de bord.
      const { error: quoteError } = await supabase.from("quotes").insert({
        customer_name,
        customer_email: str("customer_email") || "non.renseigne@facture.local",
        customer_phone: str("customer_phone") || null,
        event_type: str("event_type") || null,
        event_date: str("event_date") || new Date().toISOString().slice(0, 10),
        event_location: str("event_location") || null,
        start_time: str("start_time") || null,
        end_time: str("end_time") || null,
        formula_name: str("event_type") || "Facture libre",
        formula_price_cents: total_cents,
        total_cents,
        status: "confirme",
        notes: `[[facture-libre]] Facture ${invoiceNumber} générée depuis l'admin.
[[facture:${invoiceNumber}:${total_cents}]]`,
      });
      if (quoteError) {
        console.error("Création soirée facture libre impossible", quoteError);
      }
      revalidatePath("/admin");
    }

    revalidatePath("/admin/factures");

    // Le PDF est renvoyé directement en téléchargement.
    const fileName = `Facture ${invoiceNumber}.pdf`;
    return new NextResponse(Buffer.from(bytes) as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "X-Invoice-Number": invoiceNumber,
      },
    });
  } catch (e) {
    console.error("Erreur génération facture libre", e);
    return new NextResponse("Échec de la génération de la facture.", { status: 500 });
  }
}
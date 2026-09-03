import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";

// Téléchargement sécurisé d'un fichier : lien signé de courte durée,
// réservé au propriétaire du devis ou à l'admin.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: file } = await supabase
    .from("quote_files")
    .select("quote_id, storage_path, name")
    .eq("id", id)
    .single();
  if (!file) return new NextResponse("Introuvable", { status: 404 });

  // Accès réservé à l'admin ou au client propriétaire du devis.
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  const { isAdmin } = await import("@/lib/admin-auth");
  const admin = await isAdmin();

  if (!admin) {
    if (!user?.email) return new NextResponse("Non autorisé", { status: 401 });
    const { data: quote } = await supabase
      .from("quotes")
      .select("customer_email")
      .eq("id", file.quote_id)
      .single();
    if (
      !quote ||
      quote.customer_email?.toLowerCase() !== user.email.toLowerCase()
    ) {
      return new NextResponse("Non autorisé", { status: 403 });
    }
  }

  const { data: signed } = await supabase.storage
    .from("client-files")
    .createSignedUrl(file.storage_path, 300, { download: file.name });
  if (!signed) return new NextResponse("Erreur", { status: 500 });

  // Pas de cache : le PDF peut être remplacé (ex. version signée).
  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}

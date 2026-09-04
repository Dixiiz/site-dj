import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";

// Téléchargement sécurisé d'un fichier : réservé au propriétaire du devis
// ou à l'admin. Le fichier est servi directement (pas de redirection vers
// une URL signée, qui pouvait échouer et renvoyer vers la page d'accueil).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: file } = await supabase
    .from("quote_files")
    .select("quote_id, storage_path, name, mime_type")
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

  // Téléchargement du fichier côté serveur, puis réponse directe :
  // forcer le téléchargement avec le nom d'origine, sans redirection.
  const { data: blob, error } = await supabase.storage
    .from("client-files")
    .download(file.storage_path);
  if (error || !blob) {
    console.error("[files] Téléchargement storage échoué:", error?.message);
    return new NextResponse("Fichier indisponible", { status: 500 });
  }

  // Nom de fichier ASCII sûr + version UTF-8 pour les noms accentués.
  const asciiName =
    file.name.replace(/[^\w.\- ]+/g, "_").trim() || "document.pdf";
  const utf8Name = encodeURIComponent(file.name);

  return new NextResponse(blob, {
    headers: {
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      "Cache-Control": "no-store",
    },
  });
}


import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin-auth";
import { buildIcs } from "@/lib/ics";

// Fichier .ics « Ajouter la soirée à mon calendrier » — réservé au client
// propriétaire ou à l'admin. Format universel : Apple, Google, Outlook.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_name, customer_email, event_date, start_time, end_time, event_location, formula_name, status")
    .eq("id", id)
    .single();
  if (!quote?.event_date) return new NextResponse("Pas de date d'événement", { status: 404 });

  // Accès : admin ou client propriétaire.
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  const admin = await isAdmin();
  if (!admin) {
    if (!user?.email || quote.customer_email?.toLowerCase() !== user.email.toLowerCase()) {
      return new NextResponse("Non autorisé", { status: 403 });
    }
  }

  const dateFr = new Date(quote.event_date).toLocaleDateString("fr-FR");
  const ics = buildIcs({
    uid: `soiree-${id}`,
    title: `🎵 Soirée Propul'Sound DJ — ${quote.formula_name ?? "prestation"}`,
    description: `Prestation DJ avec Maxime (Propul'Sound DJ).\nUne urgence ? 06 74 85 07 69`,
    location: quote.event_location,
    date: quote.event_date,
    startTime: quote.start_time ?? "20:00",
    endTime: quote.end_time ?? "02:00",
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="soiree-propulsound-${dateFr}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}

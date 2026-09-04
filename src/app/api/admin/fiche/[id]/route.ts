import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildFicheSoireePdf } from "@/lib/fiche-soiree-pdf";

// Fiche soirée (récapitulatif PDF interne) : réservée à l'admin.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return new NextResponse("Non autorisé", { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: quote }, { data: tracks }, { data: messages }] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", id).single(),
    supabase
      .from("playlist_tracks")
      .select("moment, title, artist, kind")
      .eq("quote_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("quote_messages")
      .select("sender, body, created_at")
      .eq("quote_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!quote) return new NextResponse("Devis introuvable", { status: 404 });

  const bytes = await buildFicheSoireePdf({
    customer_name: quote.customer_name,
    customer_email: quote.customer_email,
    customer_phone: quote.customer_phone,
    event_type: quote.event_type,
    event_date: quote.event_date,
    start_time: quote.start_time,
    end_time: quote.end_time,
    event_location: quote.event_location,
    formula_name: quote.formula_name,
    total_cents: quote.total_cents,
    travel_distance_km: quote.travel_distance_km,
    travel_fee_cents: quote.travel_fee_cents,
    extra_fee_cents: quote.extra_fee_cents,
    notes: quote.notes,
    options: (quote.selected_options ?? []) as {
      name: string; qty?: number | null; price_cents: number;
    }[],
    tracks: (tracks ?? []) as { moment: string; title: string; artist: string | null; kind: string }[],
    messages: (messages ?? []) as { sender: string; body: string; created_at: string }[],
  });

  const datePart = quote.event_date
    ? new Date(quote.event_date).toLocaleDateString("fr-CA") // AAAA-MM-JJ
    : new Date().toLocaleDateString("fr-CA");
  const name = `Fiche soiree - ${quote.customer_name ?? "client"} - ${datePart}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
 "Content-Type": "application/pdf",
 "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
 "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin-auth";
import { buildIcs } from "@/lib/ics";

// Fichier .ics du RDV téléphonique validé — réservé au client ou à l'admin.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: rdv } = await supabase
    .from("rdv_requests")
    .select("id, quote_id, proposed_at")
    .eq("quote_id", id)
    .eq("status", "valide")
    .order("proposed_at", { ascending: false })
    .limit(1);
  const slot = rdv?.[0];
  if (!slot) return new NextResponse("Aucun RDV validé", { status: 404 });

  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  const admin = await isAdmin();
  if (!admin) {
    if (!user?.email) return new NextResponse("Non autorisé", { status: 401 });
    const { data: quote } = await supabase
      .from("quotes")
      .select("customer_email")
      .eq("id", id)
      .single();
    if (!quote || quote.customer_email?.toLowerCase() !== user.email.toLowerCase()) {
      return new NextResponse("Non autorisé", { status: 403 });
    }
  }

  const start = new Date(slot.proposed_at);
  const end = new Date(start.getTime() + 30 * 60_000);
  const fmt = (d: Date) =>
    `${d.toLocaleDateString("fr-CA")}T${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

  const ics = buildIcs({
    uid: `rdv-${slot.id}`,
    title: "RDV téléphonique — Propul'Sound DJ",
    description: "Point téléphonique avec Maxime pour préparer ta soirée.\nUne question urgente ? 06 74 85 07 69",
    location: "Appel téléphonique",
    date: start.toLocaleDateString("fr-CA"),
    startTime: fmt(start).split("T")[1],
    endTime: fmt(end).split("T")[1],
  });

  return new NextResponse(ics, {
    headers: {
 "Content-Type": "text/calendar; charset=utf-8",
 "Content-Disposition": 'attachment; filename="rdv-propulsound.ics"',
 "Cache-Control": "no-store",
    },
  });
}

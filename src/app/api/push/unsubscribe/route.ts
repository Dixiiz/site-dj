import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Désabonnement d'un appareil admin (bouton « Désactiver les notifications »).
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  let sub: { endpoint?: string };
  try {
    sub = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  if (!sub.endpoint) {
    return NextResponse.json({ error: "Endpoint manquant" }, { status: 400 });
  }
  const supabase = createAdminClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  return NextResponse.json({ ok: true });
}

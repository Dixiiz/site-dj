import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// CRUD des clients du domaine menuiserie (table menuiserie_clients).
// Réservé à l'admin.

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("menuiserie_clients")
    .select("*")
    .order("nom", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const nom = String(body?.nom ?? "").trim();
  const adresse = String(body?.adresse ?? "").trim();
  const codePostal = String(body?.code_postal ?? "").trim();
  const ville = String(body?.ville ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const telephone = String(body?.telephone ?? "").trim();
  if (!nom || !adresse || !codePostal || !ville) {
    return NextResponse.json(
      { error: "Nom, adresse, code postal et ville sont obligatoires." },
      { status: 400 },
    );
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("menuiserie_clients")
    .insert({ nom, adresse, code_postal: codePostal, ville, email, telephone })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/admin/menuiserie");
  return NextResponse.json({ client: data });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Client introuvable." }, { status: 400 });
  const supabase = createAdminClient();
  const { error } = await supabase.from("menuiserie_clients").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/admin/menuiserie");
  return NextResponse.json({ ok: true });
}

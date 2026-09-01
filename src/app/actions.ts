"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession, isAdmin, setAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SelectedOption } from "@/lib/types";

export async function submitQuoteAndBooking(formData: FormData) {
  const customer_name = String(formData.get("customer_name") ?? "").trim();
  const customer_email = String(formData.get("customer_email") ?? "").trim();
  const customer_phone = String(formData.get("customer_phone") ?? "").trim();
  const event_type = String(formData.get("event_type") ?? "").trim();
  const event_location = String(formData.get("event_location") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const formula_id = String(formData.get("formula_id") ?? "");
  const slot_id = String(formData.get("slot_id") ?? "");
  const optionIds = formData.getAll("option_ids").map(String);

  if (!customer_name || !customer_email || !formula_id || !slot_id) {
    return { ok: false as const, error: "Merci de remplir le nom, l’e-mail, une formule et un créneau." };
  }

  const supabase = createAdminClient();

  const { data: formula, error: formulaError } = await supabase
    .from("formulas")
    .select("*")
    .eq("id", formula_id)
    .eq("is_active", true)
    .single();

  if (formulaError || !formula) {
    return { ok: false as const, error: "Cette formule n’est plus disponible." };
  }

  const { data: allOptions } = await supabase
    .from("options")
    .select("*")
    .eq("is_active", true);

  const selected: SelectedOption[] = (allOptions ?? [])
    .filter(
      (option) =>
        optionIds.includes(option.id) &&
        (option.formula_id === null || option.formula_id === formula_id)
    )
    .map((option) => ({
      id: option.id,
      name: option.name,
      price_cents: option.price_cents,
    }));

  const total_cents =
    formula.price_cents + selected.reduce((sum, option) => sum + option.price_cents, 0);

  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("*")
    .eq("id", slot_id)
    .eq("is_open", true)
    .single();

  if (slotError || !slot) {
    return { ok: false as const, error: "Ce créneau n’est plus disponible. Choisis-en un autre." };
  }

  const { data: existing } = await supabase
    .from("bookings")
    .select("id")
    .eq("slot_id", slot_id)
    .neq("status", "annule")
    .maybeSingle();

  if (existing) {
    return { ok: false as const, error: "Ce créneau vient d’être réservé. Choisis-en un autre." };
  }

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      customer_name,
      customer_email,
      customer_phone: customer_phone || null,
      event_type: event_type || null,
      event_location: event_location || null,
      notes: notes || null,
      formula_id: formula.id,
      formula_name: formula.name,
      formula_price_cents: formula.price_cents,
      selected_options: selected,
      total_cents,
      status: "nouveau",
    })
    .select("id")
    .single();

  if (quoteError || !quote) {
    return { ok: false as const, error: "Impossible d’enregistrer le devis. Réessaie dans un instant." };
  }

  const { error: bookingError } = await supabase.from("bookings").insert({
    quote_id: quote.id,
    slot_id,
    customer_name,
    customer_email,
    customer_phone: customer_phone || null,
    status: "reserve",
  });

  if (bookingError) {
    await supabase.from("quotes").delete().eq("id", quote.id);
    return { ok: false as const, error: "Ce créneau n’est plus libre. Choisis-en un autre." };
  }

  await supabase.from("slots").update({ is_open: false }).eq("id", slot_id);

  redirect(`/merci?nom=${encodeURIComponent(customer_name)}`);
}

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD) {
    return { ok: false as const, error: "Mot de passe admin non configuré." };
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return { ok: false as const, error: "Mot de passe incorrect." };
  }
  await setAdminSession();
  redirect("/admin/devis");
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/admin");
}

export async function updateQuoteStatus(formData: FormData) {
  if (!(await isAdmin())) return { ok: false as const, error: "Non autorisé." };
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const allowed = ["nouveau", "contacte", "confirme", "refuse"];
  if (!id || !allowed.includes(status)) {
    return { ok: false as const, error: "Statut invalide." };
  }
  const supabase = createAdminClient();
  await supabase.from("quotes").update({ status }).eq("id", id);
  revalidatePath("/admin/devis");
  return { ok: true as const };
}

export async function createSlot(formData: FormData) {
  if (!(await isAdmin())) return { ok: false as const, error: "Non autorisé." };
  const slot_date = String(formData.get("slot_date") ?? "");
  const start_time = String(formData.get("start_time") ?? "");
  const end_time = String(formData.get("end_time") ?? "");
  if (!slot_date || !start_time || !end_time) {
    return { ok: false as const, error: "Date et horaires requis." };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("slots").insert({
    slot_date,
    start_time,
    end_time,
    is_open: true,
  });
  if (error) {
    return { ok: false as const, error: "Ce créneau existe déjà, ou la date est invalide." };
  }
  revalidatePath("/admin/creneaux");
  return { ok: true as const };
}

export async function toggleSlot(formData: FormData) {
  if (!(await isAdmin())) return { ok: false as const, error: "Non autorisé." };
  const id = String(formData.get("id") ?? "");
  const is_open = String(formData.get("is_open") ?? "") === "true";
  const supabase = createAdminClient();
  await supabase.from("slots").update({ is_open: !is_open }).eq("id", id);
  revalidatePath("/admin/creneaux");
  return { ok: true as const };
}

export async function deleteSlot(formData: FormData) {
  if (!(await isAdmin())) return { ok: false as const, error: "Non autorisé." };
  const id = String(formData.get("id") ?? "");
  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("slot_id", id)
    .neq("status", "annule")
    .maybeSingle();
  if (booking) {
    return { ok: false as const, error: "Impossible de supprimer : une réservation est liée à ce créneau." };
  }
  const { error } = await supabase.from("slots").delete().eq("id", id);
  if (error) {
    return { ok: false as const, error: "Suppression impossible." };
  }
  revalidatePath("/admin/creneaux");
  return { ok: true as const };
}

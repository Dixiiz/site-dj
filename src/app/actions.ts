"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession, isAdmin, setAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateTravelFromAddress } from "@/lib/travel";
import { EXTRA_HOUR_RATE_CENTS } from "@/lib/booking-rules";
import { formatEuros } from "@/lib/money";

function formatPrice(cents: number) {
  return formatEuros(cents);
}

import type { SelectedOption } from "@/lib/types";

export async function estimateTravelFee(formData: FormData) {
  const address = String(formData.get("event_location") ?? "").trim();
  return estimateTravelFromAddress(address);
}

// Suggestions d'adresses pour le formulaire : Google Places (New) en priorité,
// avec repli sur OpenStreetMap Nominatim si Google indisponible.
export async function searchAddresses(query: string) {
  const q = query.trim();
  if (q.length < 3) return { ok: true as const, results: [] as string[] };

  // 1) Google Places (New) — Text Search, trouve aussi les domaines/lieux (pas que les adresses).
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (key) {
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress",
        },
        body: JSON.stringify({
          textQuery: q,
          languageCode: "fr",
          regionCode: "FR",
        }),
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          places?: { displayName?: { text?: string }; formattedAddress?: string }[];
        };
        const results = (data.places ?? [])
          .map((p) => p.formattedAddress ?? p.displayName?.text ?? "")
          .filter((label) => label.length > 0)
          .slice(0, 5);
        if (results.length > 0) return { ok: true as const, results };
      }
    } catch {
      // Repli ci-dessous.
    }
  }

  // 2) Repli : OpenStreetMap Nominatim.
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=fr&addressdetails=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "propulsounddj-site/1.0 (contact@propulsounddj.fr)",
        "Accept-Language": "fr",
      },
      cache: "no-store",
    });
    if (!res.ok) return { ok: true as const, results: [] as string[] };
    const data = (await res.json()) as { display_name?: string }[];
    return {
      ok: true as const,
      results: data
        .map((item) => item.display_name ?? "")
        .filter((label) => label.length > 0)
        .slice(0, 5),
    };
  } catch {
    return { ok: true as const, results: [] as string[] };
  }
}

export async function submitQuoteAndBooking(formData: FormData) {
  const customer_name = String(formData.get("customer_name") ?? "").trim();
  const customer_email = String(formData.get("customer_email") ?? "").trim();
  const customer_phone = String(formData.get("customer_phone") ?? "").trim();
  const event_type = String(formData.get("event_type") ?? "").trim();
  const event_location = String(formData.get("event_location") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const formula_id = String(formData.get("formula_id") ?? "");
  const pack_name = String(formData.get("pack_name") ?? "").trim();
  const pack_price_cents = Number(formData.get("pack_price_cents") ?? 0) || 0;
  const pack_base_minutes = Number(formData.get("pack_base_minutes") ?? 0) || 0;
  const pack_extra_rate_cents = Number(formData.get("pack_extra_rate_cents") ?? 0) || 0;
  const optionIds = formData.getAll("option_ids").map(String);
  const co2_qty = Number(formData.get("co2_qty") ?? 1) || 1;
  const event_date = String(formData.get("event_date") ?? "").trim();
  const start_time = String(formData.get("start_time") ?? "").trim();
  const end_time = String(formData.get("end_time") ?? "").trim();
  const travel_distance_km = formData.get("travel_distance_km")
    ? Number(formData.get("travel_distance_km"))
    : null;
  const travel_fee_cents = formData.get("travel_fee_cents")
    ? Number(formData.get("travel_fee_cents"))
    : 0;

  if (!customer_name || !customer_email || !formula_id || !event_location || !event_date || !start_time || !end_time) {
    return {
      ok: false as const,
      error: "Merci de remplir le nom, l'e-mail, le lieu, une formule, la date et les horaires.",
    };
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
    .map((option) => {
      // Pistolet CO2 vendu à l'unité : quantité 1 ou 2 choisie par le client.
      const isCo2 = /co2/i.test(option.name);
      const qty = isCo2 ? Math.min(2, Math.max(1, co2_qty)) : 1;
      return {
        id: option.id,
        name: option.name,
        price_cents: option.price_cents * qty,
        qty,
      };
    });

  const travelResult = await estimateTravelFromAddress(event_location);
  const confirmedTravelFeeCents = travelResult.ok ? travelResult.estimate.feeCents : travel_fee_cents || 0;
  const confirmedTravelDistanceKm = travelResult.ok
    ? travelResult.estimate.distanceKm
    : travel_distance_km;

  // Prix : le pack choisi prime sur le prix de la formule de base.
  const packPriceCents = pack_price_cents > 0 ? pack_price_cents : formula.price_cents;

  // Recalcul serveur des heures supplémentaires : durée réelle (fin après minuit
  // ramenée au lendemain) moins les minutes incluses dans le pack.
  function toMin(value: string) {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  }
  const startMin = toMin(start_time);
  const endMinRaw = toMin(end_time);
  const endMin = endMinRaw < 12 * 60 ? endMinRaw + 24 * 60 : endMinRaw;
  const baseMinutes =
    pack_base_minutes > 0
      ? pack_base_minutes
      : formula.name.toLowerCase().includes("mariage")
        ? 480
        : 360;
  const extraRateCents =
    pack_extra_rate_cents > 0 ? pack_extra_rate_cents : EXTRA_HOUR_RATE_CENTS;
  const pastBase = endMin - startMin - baseMinutes;
  const extra_hours = pastBase > 0 ? Math.ceil(pastBase / 60) : 0;
  const extra_fee_cents = extra_hours * extraRateCents;

  const total_cents =
    packPriceCents +
    selected.reduce((sum, option) => sum + option.price_cents, 0) +
    confirmedTravelFeeCents +
    extra_fee_cents;

  const scheduleNotes = [
    `Pack : ${pack_name || formula.name} (${formatPrice(packPriceCents)})`,
    `Date : ${event_date}`,
    `Début : ${start_time}`,
    `Fin : ${end_time}`,
    extra_hours > 0 ? `Heures supplémentaires : ${extra_hours} (${(extra_fee_cents / 100).toFixed(2)} €)` : null,
    co2_qty > 1 ? `Pistolets CO2 : ${co2_qty} unités` : null,
    notes ? `Message : ${notes}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      customer_name,
      customer_email,
      customer_phone: customer_phone || null,
      event_type: event_type || null,
      event_location: event_location || null,
      notes: scheduleNotes || null,
      formula_id: formula.id,
      formula_name: pack_name || formula.name,
      formula_price_cents: packPriceCents,
      selected_options: selected,
      travel_distance_km: confirmedTravelDistanceKm,
      travel_fee_cents: confirmedTravelFeeCents,
      total_cents,
      status: "nouveau",
    })
    .select("id")
    .single();

  if (quoteError || !quote) {
    return { ok: false as const, error: "Impossible d’enregistrer le devis. Réessaie dans un instant." };
  }

  redirect(`/merci?nom=${encodeURIComponent(customer_name)}`);
}

export async function submitCustomRequest(formData: FormData) {
  const customer_name = String(formData.get("customer_name") ?? "").trim();
  const customer_email = String(formData.get("customer_email") ?? "").trim();
  const customer_phone = String(formData.get("customer_phone") ?? "").trim();
  const event_date = String(formData.get("event_date") ?? "").trim();
  const event_location = String(formData.get("event_location") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!customer_name || !customer_email || !event_location) {
    return {
      ok: false as const,
      error: "Merci de remplir le nom, l’e-mail et le lieu de l’événement.",
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("custom_requests").insert({
    customer_name,
    customer_email,
    customer_phone: customer_phone || null,
    event_date: event_date || null,
    event_location,
    notes: notes || null,
    status: "nouveau",
  });

  if (error) {
    return { ok: false as const, error: "Impossible d’enregistrer la demande. Réessaie dans un instant." };
  }

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

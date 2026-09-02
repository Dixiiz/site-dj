"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";
import type { SelectedOption } from "@/lib/types";

// ---------- Session ----------

async function getCurrentUser() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getClientUser() {
  return getCurrentUser();
}

export async function signUpClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 6) {
    return {
      ok: false as const,
      error: "Nom, e-mail et mot de passe (6 caractères minimum) requis.",
    };
  }

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  // Si la confirmation par e-mail est activée, pas de session immédiate.
  if (!data.session) {
    return {
      ok: true as const,
      needsConfirmation: true as const,
      message:
        "Compte créé ! Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.",
    };
  }

  redirect("/mon-espace");
}

export async function loginClient(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false as const, error: "E-mail et mot de passe requis." };
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false as const, error: "E-mail ou mot de passe incorrect." };
  }

  redirect("/mon-espace");
}

export async function logoutClient() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ---------- Devis du client ----------

async function getOwnedQuote(quoteId: string) {
  const user = await getCurrentUser();
  if (!user?.email) return { user: null, quote: null };
  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("customer_email", user.email)
    .single();
  return { user, quote };
}

export async function getMyQuotes() {
  const user = await getCurrentUser();
  if (!user?.email) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("quotes")
    .select("id, event_date, event_type, formula_name, total_cents, status, created_at")
    .eq("customer_email", user.email)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getMyQuote(quoteId: string) {
  const { user, quote } = await getOwnedQuote(quoteId);
  if (!user || !quote) return null;
  return quote;
}

// ---------- Messagerie ----------

export async function getQuoteMessages(quoteId: string) {
  const { user } = await getOwnedQuote(quoteId);
  if (!user) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("quote_messages")
    .select("id, sender, body, created_at")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function sendQuoteMessage(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!quoteId || !body) return;

  const { user } = await getOwnedQuote(quoteId);
  if (!user) return;

  const supabase = createAdminClient();
  await supabase.from("quote_messages").insert({
    quote_id: quoteId,
    user_id: user.id,
    sender: "client",
    body,
  });

  revalidatePath(`/mon-espace/devis/${quoteId}`);
}

// ---------- Playlist : souhaits par temps fort + blacklist ----------

export async function getPlaylistTracks(quoteId: string) {
  const { user } = await getOwnedQuote(quoteId);
  if (!user) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("playlist_tracks")
    .select("id, moment, title, artist, kind")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function addPlaylistTrack(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const moment = String(formData.get("moment") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const artist = String(formData.get("artist") ?? "").trim();
  const kind =
    String(formData.get("kind") ?? "souhait") === "blacklist" ? "blacklist" : "souhait";

  if (!quoteId || !moment || !title) return;

  const { user } = await getOwnedQuote(quoteId);
  if (!user) return;

  const supabase = createAdminClient();
  await supabase.from("playlist_tracks").insert({
    quote_id: quoteId,
    user_id: user.id,
    moment,
    title,
    artist: artist || null,
    kind,
  });

  revalidatePath(`/mon-espace/devis/${quoteId}`);
}

export async function removePlaylistTrack(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const trackId = String(formData.get("track_id") ?? "");
  if (!quoteId || !trackId) return;

  const { user } = await getOwnedQuote(quoteId);
  if (!user) return;

  const supabase = createAdminClient();
  await supabase
    .from("playlist_tracks")
    .delete()
    .eq("id", trackId)
    .eq("quote_id", quoteId)
    .eq("user_id", user.id);

  revalidatePath(`/mon-espace/devis/${quoteId}`);
}

// ---------- Modification des options ----------

function optionsEditable(status: string | null) {
  return status !== "confirme" && status !== "refuse" && status !== "annule";
}

export async function updateQuoteOptions(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const optionIds = formData.getAll("option_ids").map(String);
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const { quote } = await getOwnedQuote(quoteId);
  if (!quote) return { ok: false as const, error: "Devis introuvable." };
  if (!optionsEditable(quote.status)) {
    return {
      ok: false as const,
      error: "Ce devis est confirmé : contactez-nous pour toute modification.",
    };
  }

  const supabase = createAdminClient();
  const { data: allOptions } = await supabase
    .from("options")
    .select("*")
    .eq("is_active", true);

  const oldOptions = (quote.selected_options ?? []) as SelectedOption[];
  const oldSum = oldOptions.reduce((sum, o) => sum + (o.price_cents ?? 0), 0);

  const selected: SelectedOption[] = (allOptions ?? [])
    .filter((option) => optionIds.includes(option.id))
    .map((option) => {
      // Quantité CO2 conservée si l'option était déjà dans le devis.
      const previous = oldOptions.find((o) => o.id === option.id);
      const qty = previous?.qty ?? 1;
      return {
        id: option.id,
        name: option.name,
        price_cents: option.price_cents * qty,
        qty,
      };
    });
  const newSum = selected.reduce((sum, o) => sum + o.price_cents, 0);

  const { error } = await supabase
    .from("quotes")
    .update({ selected_options: selected, total_cents: quote.total_cents - oldSum + newSum })
    .eq("id", quoteId);

  if (error) {
    return { ok: false as const, error: "Impossible de mettre à jour les options." };
  }

  revalidatePath(`/mon-espace/devis/${quoteId}`);
  return { ok: true as const };
}


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
    .select(
      "id, event_date, event_type, formula_name, total_cents, status, created_at, pending_options"
    )
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

// Récupère les messages d'un devis pour l'admin (rafraîchissement).
export async function getQuoteMessagesAdmin(quoteId: string) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return [];
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

  const { user, quote } = await getOwnedQuote(quoteId);
  if (!user || !quote) return;

  const supabase = createAdminClient();
  await supabase.from("quote_messages").insert({
    quote_id: quoteId,
    user_id: user.id,
    sender: "client",
    body,
  });

  // Pastille nouveautés côté admin.
  await supabase.from("quotes").update({ has_unread_updates: true }).eq("id", quoteId);

  // Notification e-mail à l'admin (best effort).
  try {
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.NOTIF_EMAIL;
    if (apiKey && to) {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: "Propul'Sound DJ <contact@propulsounddj.fr>",
        replyTo: user.email ?? undefined,
        to,
        subject: `💬 Nouveau message client — ${quote.formula_name}`,
        text: `Message de ${quote.customer_name} (${quote.event_date ?? "date à définir"}) :\n\n${body}\n\nRépondre : /admin/messages`,
      });
    }
  } catch (err) {
    console.error("[notif] Echec envoi e-mail message client:", err);
  }

  revalidatePath(`/mon-espace/devis/${quoteId}`);
}

// ---------- Côté admin ----------

export async function getAdminThreads() {
  const supabase = createAdminClient();
  const { data: messages } = await supabase
    .from("quote_messages")
    .select("id, quote_id, sender, body, created_at")
    .order("created_at", { ascending: true });

  if (!messages || messages.length === 0) return [];

  const quoteIds = [...new Set(messages.map((m) => m.quote_id))];
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, customer_name, formula_name, event_date, customer_email")
    .in("id", quoteIds);

  const quoteMap = new Map((quotes ?? []).map((q) => [q.id, q]));
  return messages.map((m) => ({ ...m, quote: quoteMap.get(m.quote_id) ?? null }));
}

export async function sendAdminMessage(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!quoteId || !body) return;

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_email")
    .eq("id", quoteId)
    .single();

  // Le user_id de référence : le propriétaire du devis (client).
  const { data: firstMessage } = await supabase
    .from("quote_messages")
    .select("user_id")
    .eq("quote_id", quoteId)
    .limit(1)
    .single();

  if (!quote?.customer_email || !firstMessage?.user_id) return;

  await supabase.from("quote_messages").insert({
    quote_id: quoteId,
    user_id: firstMessage.user_id,
    sender: "admin",
    body,
  });

  revalidatePath("/admin/messages");
  revalidatePath(`/mon-espace/devis/${quoteId}`);
}


// ---------- Playlist : souhaits par temps fort + blacklist ----------

export async function getPlaylistTracks(quoteId: string) {
  const { user } = await getOwnedQuote(quoteId);
  if (!user) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("playlist_tracks")
    .select("id, moment, title, artist, kind, preview_url, artwork_url")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

// Playlist partagée : visible aussi côté admin.
export async function getAdminPlaylist() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("playlist_tracks")
    .select("id, quote_id, moment, title, artist, kind, preview_url, artwork_url")
    .order("created_at", { ascending: true });
  return data ?? [];
}

// ---------- Recherche de titres (suggestions iTunes) ----------

export type TrackSuggestion = {
  key: string;
  title: string;
  artist: string;
  previewUrl: string | null;
  artworkUrl: string | null;
};

export async function searchTrackSuggestions(
  term: string
): Promise<TrackSuggestion[]> {
  const query = term.trim();
  if (query.length < 3) return [];
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=6`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      results?: {
        trackName?: string;
        artistName?: string;
        previewUrl?: string;
        artworkUrl100?: string;
      }[];
    };
    return (json.results ?? [])
      .filter((r) => r.trackName)
      .map((r, i) => ({
        key: `${r.trackName}-${i}`,
        title: r.trackName ?? "",
        artist: r.artistName ?? "",
        previewUrl: r.previewUrl ?? null,
        artworkUrl: r.artworkUrl100 ?? null,
      }));
  } catch {
    return [];
  }
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

  // Extrait + pochette : fournis par la suggestion sélectionnée, sinon
  // recherche via l'API iTunes (gratuite, sans clé).
  let previewUrl = String(formData.get("preview_url") ?? "") || null;
  let artworkUrl = String(formData.get("artwork_url") ?? "") || null;
  if (!previewUrl) {
    try {
      const term = [title, artist].filter(Boolean).join(" ");
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=1`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          results?: { previewUrl?: string; artworkUrl100?: string }[];
        };
        previewUrl = json.results?.[0]?.previewUrl ?? null;
        artworkUrl = json.results?.[0]?.artworkUrl100 ?? null;
      }
    } catch {
      // Pas d'extrait trouvé : la musique est quand même enregistrée.
    }
  }

  const supabase = createAdminClient();
  await supabase.from("playlist_tracks").insert({
    quote_id: quoteId,
    user_id: user.id,
    moment,
    title,
    artist: artist || null,
    kind,
    preview_url: previewUrl,
    artwork_url: artworkUrl,
  });

  // Pastille nouveautés côté admin.
  await supabase.from("quotes").update({ has_unread_updates: true }).eq("id", quoteId);

  revalidatePath(`/mon-espace/devis/${quoteId}`);
  revalidatePath("/admin/messages");
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

// Le client propose une modification : elle part en attente de validation admin.
export async function updateQuoteOptions(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const optionIds = formData.getAll("option_ids").map(String);
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const { quote } = await getOwnedQuote(quoteId);
  if (!quote) return { ok: false as const, error: "Devis introuvable." };
  if (!optionsEditable(quote.status)) {
    return {
      ok: false as const,
      error: "Ce devis est confirmé : contactez-nous via la messagerie.",
    };
  }
  if (quote.pending_options) {
    return {
      ok: false as const,
      error: "Une modification est déjà en attente de validation.",
    };
  }

  const supabase = createAdminClient();
  const { data: allOptions } = await supabase
    .from("options")
    .select("*")
    .eq("is_active", true);

  const oldOptions = (quote.selected_options ?? []) as SelectedOption[];

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

  // Mise en attente : rien n'est appliqué avant la validation de l'admin.
  const { error } = await supabase
    .from("quotes")
    .update({ pending_options: selected, has_unread_updates: true })
    .eq("id", quoteId);

  if (error) {
    return { ok: false as const, error: "Impossible d'enregistrer la demande." };
  }

  revalidatePath(`/mon-espace/devis/${quoteId}`);
  return {
    ok: true as const,
    message: "Demande envoyée ! Nous vous confirmons dès que possible.",
  };
}

// ---------- Validation admin des options demandées ----------

export async function resolveQuoteOptions(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  const approve = String(formData.get("approve") ?? "") === "true";
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("selected_options, total_cents, pending_options")
    .eq("id", quoteId)
    .single();
  if (!quote?.pending_options) return { ok: false as const, error: "Rien à valider." };

  if (approve) {
    const pending = quote.pending_options as SelectedOption[];
    const oldOptions = (quote.selected_options ?? []) as SelectedOption[];
    const oldSum = oldOptions.reduce((sum, o) => sum + (o.price_cents ?? 0), 0);
    const newSum = pending.reduce((sum, o) => sum + (o.price_cents ?? 0), 0);
    const { error } = await supabase
      .from("quotes")
      .update({
        selected_options: pending,
        total_cents: (quote.total_cents ?? 0) - oldSum + newSum,
        pending_options: null,
        has_unread_updates: false,
      })
      .eq("id", quoteId);
    if (error) return { ok: false as const, error: "Erreur lors de l'application." };
  } else {
    await supabase
      .from("quotes")
      .update({ pending_options: null, has_unread_updates: false })
      .eq("id", quoteId);
  }

  revalidatePath("/admin/devis");
  revalidatePath(`/mon-espace/devis/${quoteId}`);
  return { ok: true as const };
}

// L'admin a pris connaissance des nouveautés du devis.
export async function markQuoteSeen(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return;
  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return;
  const supabase = createAdminClient();
  await supabase.from("quotes").update({ has_unread_updates: false }).eq("id", quoteId);
  revalidatePath("/admin/devis");
}

// ---------- Fichiers clients (MP3, MP4, documents…) ----------

const FILES_BUCKET = "client-files";
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 Mo par fichier

// Crée le bucket privé s'il n'existe pas encore (idempotent).
async function ensureBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === FILES_BUCKET)) return;
  await supabase.storage.createBucket(FILES_BUCKET, { public: false });
}

export async function uploadClientFile(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const moment = String(formData.get("moment") ?? "").trim() || null;
  const file = formData.get("file");
  if (!quoteId || !(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Aucun fichier sélectionné." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false as const, error: "Fichier trop volumineux (50 Mo max)." };
  }

  const { user, quote } = await getOwnedQuote(quoteId);
  if (!user || !quote) return { ok: false as const, error: "Devis introuvable." };

  const supabase = createAdminClient();
  await ensureBucket(supabase);

  const safeName = file.name.replace(/[^\w.\-()À-ÿ ]+/g, "_");
  const storagePath = `${quoteId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    console.error("[upload] Erreur:", uploadError);
    return { ok: false as const, error: "Échec de l'envoi. Réessayez dans un instant." };
  }

  await supabase.from("quote_files").insert({
    quote_id: quoteId,
    user_id: user.id,
    name: file.name,
    storage_path: storagePath,
    mime_type: file.type || null,
    size_bytes: file.size,
    moment,
  });

  // Pastille nouveautés côté admin.
  await supabase.from("quotes").update({ has_unread_updates: true }).eq("id", quoteId);

  revalidatePath(`/mon-espace/devis/${quoteId}`);
  revalidatePath("/admin/devis");
  return { ok: true as const, message: "Fichier envoyé ✓" };
}

export async function getQuoteFiles(quoteId: string) {
  const { user } = await getOwnedQuote(quoteId);
  if (!user) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("quote_files")
    .select("id, name, storage_path, mime_type, size_bytes, created_at, moment")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

// Variante admin (accès à n'importe quel devis).
export async function getQuoteFilesAdmin(quoteId: string) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("quote_files")
    .select("id, name, storage_path, mime_type, size_bytes, created_at, moment")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

// Téléchargement : génère une URL signée courte et y redirige.
export async function downloadQuoteFile(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const fileId = String(formData.get("file_id") ?? "");
  if (!quoteId || !fileId) return;

  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) {
    const { user } = await getOwnedQuote(quoteId);
    if (!user) return;
  }

  const supabase = createAdminClient();
  const { data: file } = await supabase
    .from("quote_files")
    .select("storage_path, name")
    .eq("id", fileId)
    .eq("quote_id", quoteId)
    .single();
  if (!file) return;

  const { data: signed } = await supabase.storage
    .from(FILES_BUCKET)
    .createSignedUrl(file.storage_path, 600, {
      download: file.name,
    });
  if (signed?.signedUrl) redirect(signed.signedUrl);
}

export async function deleteQuoteFile(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const fileId = String(formData.get("file_id") ?? "");
  if (!quoteId || !fileId) return;

  const { user } = await getOwnedQuote(quoteId);
  if (!user) return;

  const supabase = createAdminClient();
  const { data: file } = await supabase
    .from("quote_files")
    .select("storage_path")
    .eq("id", fileId)
    .eq("quote_id", quoteId)
    .eq("user_id", user.id)
    .single();
  if (!file) return;

  await supabase.storage.from(FILES_BUCKET).remove([file.storage_path]);
  await supabase.from("quote_files").delete().eq("id", fileId);

  revalidatePath(`/mon-espace/devis/${quoteId}`);
}


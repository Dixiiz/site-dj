"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";
import type { SelectedOption } from "@/lib/types";
import { SITE_URL } from "@/lib/site-url";
import { EMAIL_FROM, buildEmailHtml, buildEmailText } from "@/lib/emails";

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

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false as const, error: "E-mail requis." };

  const supabase = await createAuthClient();
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${proto}://${host}/connexion/reinitialiser`,
  });
  if (error) return { ok: false as const, error: error.message };
  return {
    ok: true as const,
    message:
 "E-mail envoyé ! Vérifiez votre boîte mail (et vos spams) pour définir un nouveau mot de passe.",
  };
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 6) {
    return { ok: false as const, error: "Mot de passe : 6 caractères minimum." };
  }
  if (password !== confirm) {
    return { ok: false as const, error: "Les deux mots de passe ne correspondent pas." };
  }
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error || !data.user) {
    return {
      ok: false as const,
      error: "Lien invalide ou expiré. Refaites une demande de réinitialisation.",
    };
  }
  redirect("/mon-espace");
}

export async function loginClient(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  // Destination optionnelle (ex : bouton d'un e-mail vers la section acompte).
  const next = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    return { ok: false as const, error: "E-mail et mot de passe requis." };
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false as const, error: "E-mail ou mot de passe incorrect." };
  }

  // Uniquement des chemins internes (pas de redirection externe).
  redirect(next.startsWith("/mon-espace") ? next : "/mon-espace");
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
 "id, event_date, event_type, formula_name, total_cents, status, created_at, pending_options, client_label"
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

// Progression automatique des statuts (jamais de régression) :
// nouveau → contacté → attente de signature → confirmé
const STATUS_RANK: Record<string, number> = {
  nouveau: 0,
  contacte: 1,
  attente_signature: 2,
  attente_acompte: 3,
  confirme: 4,
};

export async function advanceQuoteStatus(
  supabase: ReturnType<typeof createAdminClient>,
  quoteId: string,
  target: string
) {
  const { data: quote } = await supabase
    .from("quotes")
    .select("status")
    .eq("id", quoteId)
    .single();
  const current = quote?.status ?? "nouveau";
  if ((STATUS_RANK[current] ?? 9) < (STATUS_RANK[target] ?? 9)) {
    await supabase.from("quotes").update({ status: target }).eq("id", quoteId);
  }
}

// Le client renomme son devis (ex : « Mariage de Julien »).
export async function renameClientQuote(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, 60);
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const { user } = await getOwnedQuote(quoteId);
  if (!user) return { ok: false as const, error: "Devis introuvable." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("quotes")
    .update({ client_label: label || null })
    .eq("id", quoteId);

  if (error) return { ok: false as const, error: "Impossible de renommer." };

  revalidatePath("/mon-espace");
  revalidatePath(`/mon-espace/devis/${quoteId}`);
  return { ok: true as const, message: "Devis renommé ✓" };
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
      const excerpt = body.length > 400 ? `${body.slice(0, 400)}…` : body;
      const emailData = {
        title: "Nouveau message client",
        emoji: "",
        intro: `<strong>${quote.customer_name ?? user.email}</strong> t'a envoyé un message${quote.event_date ? ` (soirée du ${new Date(quote.event_date).toLocaleDateString("fr-FR")})` : ""} :`,
        sections: [
          {
            lines: [
              `<em style="color:#333;">« ${excerpt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")} »</em>`,
            ],
          },
        ],
        button: { label: "Répondre dans l'admin", href: `${SITE_URL}/admin/messages` },
        footer: "Répondre directement à cet e-mail contactera aussi le client.",
      };
      await resend.emails.send({
        from: EMAIL_FROM,
        replyTo: user.email ?? undefined,
        to,
        subject: `Nouveau message client — ${quote.formula_name}`,
        html: buildEmailHtml(emailData),
        text: buildEmailText(emailData),
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
    .select("customer_email, formula_name, client_label, has_unread_updates")
    .eq("id", quoteId)
    .single();

  if (!quote?.customer_email) return;

  // user_id du client s'il a un compte (sinon null : la conversation reste
  // rattachée au devis et le client la verra dès la création de son compte).
  const customerEmail = quote.customer_email;
  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const ownerUser = users?.users?.find(
    (u) => u.email?.toLowerCase() === customerEmail.toLowerCase()
  );

  await supabase.from("quote_messages").insert({
    quote_id: quoteId,
    user_id: ownerUser?.id ?? null,
    sender: "admin",
    body,
  });

  // Notification e-mail au client, SANS spam : uniquement s'il n'a pas déjà
  // de contenu non lu (sinon il a déjà une raison de revenir voir, et le
  // tchat ne doit pas générer 50 e-mails). Les messages suivants seront
  // inclus dans la même visite, sans nouveau mail.
  if (!quote.has_unread_updates) {
    try {
      const { Resend } = await import("resend");
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const excerpt = body.length > 160 ? `${body.slice(0, 160)}…` : body;
        const emailData = {
          title: "Vous avez reçu un message",
          emoji: "",
          intro: `Bonjour,<br/><br/>Maxime vous a envoyé un message concernant <strong>${quote.client_label || quote.formula_name || "votre événement"}</strong> :`,
          sections: [
            {
              lines: [
                `<em style="color:#555;">« ${excerpt.replace(/</g, "&lt;").replace(/\n/g, "<br/>")} »</em>`,
              ],
            },
          ],
          button: {
            label: "Lire le message et répondre",
            href: `${SITE_URL}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${quoteId}#messagerie`)}`,
          },
        };
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: EMAIL_FROM,
          replyTo: process.env.NOTIF_EMAIL,
          to: customerEmail,
          subject: "Un nouveau message vous attend — Propul'Sound DJ",
          html: buildEmailHtml(emailData),
          text: buildEmailText(emailData),
        });
      }
    } catch (err) {
      console.error("[messagerie] Echec e-mail client:", err);
    }
  }

  // Marque le contenu comme non lu (le client verra le message à sa
  // prochaine visite — c'est aussi ce qui évite les e-mails en rafale).
  await supabase.from("quotes").update({ has_unread_updates: true }).eq("id", quoteId);

  // Contacter le client fait passer le devis en « contacté ».
  await advanceQuoteStatus(supabase, quoteId, "contacte");

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
  if (query.length < 2) return [];

  // Recherche tolérante : on tente la requête complète, puis des versions
  // raccourcies (utile en cas de faute de frappe ou saisie partielle).
  const attempts = [query];
  const words = query.split(/\s+/).filter(Boolean);
  if (words.length > 1) attempts.push(words.slice(0, -1).join(" "));
  if (words.length > 1) attempts.push(words[0]);

  const seen = new Set<string>();
  const results: TrackSuggestion[] = [];
  for (const attempt of attempts) {
    const found = await searchItunes(attempt);
    for (const track of found) {
      const dedupeKey = `${track.title.toLowerCase()}|${track.artist.toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      results.push(track);
      if (results.length >= 6) return results;
    }
    if (results.length > 0) break; // assez de résultats, inutile de retenter
  }
  return results;
}

async function searchItunes(query: string): Promise<TrackSuggestion[]> {
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

  // Quantité de pistolets CO2 choisie par le client (1 ou 2).
  const co2Qty = Math.min(2, Math.max(1, Number(formData.get("co2_qty") ?? 1) || 1));

  const selected: SelectedOption[] = (allOptions ?? [])
    .filter((option) => optionIds.includes(option.id))
    .map((option) => {
      const isCo2 = /co2/i.test(option.name);
      const qty = isCo2 ? co2Qty : 1;
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
    .select("selected_options, total_cents, pending_options, customer_email")
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

  // Notification e-mail au client (best effort).
  try {
    if (quote.customer_email) {
      const { Resend } = await import("resend");
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.NOTIF_EMAIL;
      if (apiKey && from) {
        const resend = new Resend(apiKey);
        const { buildEmailHtml, buildEmailText } = await import("@/lib/emails");
        const emailData = approve
          ? {
              title: "Vos options ont été validées !",
              emoji: "✓",
              intro:
 "Bonjour,<br/><br/>Bonne nouvelle : vos modifications d'options ont été <strong>validées</strong> et appliquées à votre devis.",
              sections: [
                {
                  title: "Et maintenant ?",
                  lines: [
 "Le <strong>nouveau montant</strong> de votre devis est visible dans votre espace.",
 "Vous pouvez poursuivre la préparation de votre soirée normalement.",
                  ],
                },
              ],
              button: { label: "Voir mon devis mis à jour", href: `${SITE_URL}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${quoteId}`)}` },
            }
          : {
              title: "À propos de votre demande d'options",
              emoji: "❌",
              intro:
 "Bonjour,<br/><br/>Après étude, nous ne pouvons pas retenir votre demande de modification d'options.",
              sections: [
                {
                  title: "Une question ?",
                  lines: [
 "N'hésitez pas à nous contacter pour en discuter : on trouvera sûrement une <strong>alternative</strong> !",
                  ],
                },
              ],
              button: { label: "Accéder à mon dossier client", href: `${SITE_URL}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${quoteId}`)}` },
            };
        await resend.emails.send({
          from: EMAIL_FROM,
          to: quote.customer_email,
          subject: approve
            ? "✓ Vos options ont été validées — Propul'Sound DJ"
            : "❌ Demande d'options non retenue — Propul'Sound DJ",
          html: buildEmailHtml(emailData),
          text: buildEmailText(emailData),
        });
      }
    }
  } catch {
    // best effort
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

// Supprime un temps fort personnalisé (musiques + fichiers associés).
export async function deleteQuoteMoment(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const moment = String(formData.get("moment") ?? "").trim();
  if (!quoteId || !moment) return;

  const { user } = await getOwnedQuote(quoteId);
  if (!user) return;

  const supabase = createAdminClient();
  // Fichiers associés : on retire aussi les objets du storage.
  const { data: files } = await supabase
    .from("quote_files")
    .select("storage_path")
    .eq("quote_id", quoteId)
    .eq("moment", moment);
  if (files && files.length > 0) {
    await supabase.storage
      .from("client-files")
      .remove(files.map((f) => f.storage_path));
  }

  await supabase.from("playlist_tracks").delete().eq("quote_id", quoteId).eq("moment", moment);
  await supabase.from("quote_files").delete().eq("quote_id", quoteId).eq("moment", moment);

  // Pastille nouveautés côté admin.
  await supabase.from("quotes").update({ has_unread_updates: true }).eq("id", quoteId);

  revalidatePath(`/mon-espace/devis/${quoteId}`);
  revalidatePath("/admin/devis");
}

// Remplace un PDF dans le storage (suppression + ré-upload : le « update »
// du storage échoue silencieusement sur certains objets).
async function replaceStoredPdf(
  supabase: ReturnType<typeof createAdminClient>,
  storagePath: string,
  bytes: Uint8Array
) {
  await supabase.storage.from("client-files").remove([storagePath]);
  const { error } = await supabase.storage
    .from("client-files")
    .upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });
  if (error) console.error("Signature : remplacement du PDF impossible", error);
}

// Le client signe un document en ligne (acceptation nominative et datée,
// avec consentement explicite et IP — valeur probante renforcée).
export async function signClientDocument(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const fileId = String(formData.get("file_id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const consent = String(formData.get("consent") ?? "") === "on";
  if (!quoteId || !fileId || !name || !consent) {
    return { ok: false as const, error: "Nom et consentement requis pour signer." };
  }

  const { user } = await getOwnedQuote(quoteId);
  if (!user) return { ok: false as const, error: "Devis introuvable." };

  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("quote_files")
    .update({
      signed_name: name,
      signed_at: new Date().toISOString(),
      signed_ip: ip,
      signed_consent: true,
    })
    .eq("id", fileId)
    .eq("quote_id", quoteId);
  if (error) return { ok: false as const, error: "Impossible de signer." };

  // On régénère le PDF du devis avec la signature apposée (badge SIGNÉ,
  // nom du client sur la ligne de signature et date du bon pour accord).
  try {
    const { data: file } = await supabase
      .from("quote_files")
      .select("name, storage_path")
      .eq("id", fileId)
      .eq("quote_id", quoteId)
      .single();
    const { data: fullQuote } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();
    if (file && fullQuote && file.name.startsWith("Devis ")) {
      const contractNumber = file.name.replace(/^Devis\s+/, "").replace(/\.pdf$/, "");
      const { DEVIS_TEMPLATE: tpl } = await import("@/lib/devis-template");
      const { buildDevisPdf } = await import("@/lib/devis-pdf");
      const sigData = {
        name,
        dateIso: new Date().toISOString(),
        ip,
        drawnPng: String(formData.get("signature_data") ?? "") || null,
      };
      const signedBytes = await buildDevisPdf(fullQuote as never, {
        contractNumber,
        validityDays: tpl.validityDays,
        signature: sigData,
      });
      await replaceStoredPdf(supabase, file.storage_path, signedBytes);
    } else if (file && fullQuote && file.name.startsWith("Contrat ")) {
      const contractNumber = file.name.replace(/^Contrat\s+/, "").replace(/\.pdf$/, "");
      const { buildContratPdf } = await import("@/lib/contrat-pdf");
      const signedBytes = await buildContratPdf(fullQuote as never, {
        contractNumber,
        signature: {
          name,
          dateIso: new Date().toISOString(),
          ip,
          drawnPng: String(formData.get("signature_data") ?? "") || null,
        },
      });
      await replaceStoredPdf(supabase, file.storage_path, signedBytes);
    }
  } catch (e) {
    // Le document reste signé dans la base même si l'incrustation échoue,
    // mais on journalise l'erreur pour diagnostic.
    console.error("Signature : incrustation impossible", e);
  }

  // La signature ne confirme le devis que si TOUS les documents à signer
  // (devis + contrat) sont signés. Sinon le devis reste « à signer ».
  const { data: toSignFiles } = await supabase
    .from("quote_files")
    .select("signed_name")
    .eq("quote_id", quoteId)
    .eq("doc_kind", "a_signer");
  const allSigned =
    (toSignFiles ?? []).length > 0 &&
    (toSignFiles ?? []).every((f) => Boolean(f.signed_name));
  if (allSigned) await advanceQuoteStatus(supabase, quoteId, "attente_acompte");

  // E-mail de confirmation au client (best effort), uniquement si tout est signé.
  if (allSigned) try {
    const { data: quote } = await supabase
      .from("quotes")
      .select("customer_email")
      .eq("id", quoteId)
      .single();
    if (quote?.customer_email) {
      const { Resend } = await import("resend");
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.NOTIF_EMAIL;
      if (apiKey && from) {
        const resend = new Resend(apiKey);
        const { buildEmailHtml, buildEmailText, stepsSection } = await import("@/lib/emails");
        const emailData = {
          title: "Document signé — devis confirmé !",
          emoji: "✓",
          intro:
 "Bonjour,<br/><br/>Nous avons bien reçu votre signature : vos documents sont désormais <strong style=\"color:#219653;\">validés</strong> !<br/><br/>Votre <strong>playlist est débloquée</strong> dans votre espace client — à vous de nous faire vos propositions musicales !",
          sections: [
            stepsSection("attente_acompte"),
            {
              title: "Action à faire en priorité : l'acompte (20 %)",
              lines: [
 "Transmettez l'<strong>acompte de réservation</strong> (20 %) par virement, puis cliquez sur <strong>« ✓ J'ai envoyé l'acompte »</strong> dans votre espace : c'est <strong>ce qui verrouille définitivement votre date</strong>.",
 "Ensuite, renseignez votre <strong>playlist</strong> (temps forts + piste de danse) — elle vous attend dans votre espace !",
              ],
            },
          ],
          button: { label: "Régler mon acompte dans mon espace", href: `${SITE_URL}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${quoteId}#acompte`)}` },
        };
        await resend.emails.send({
          from: EMAIL_FROM,
          replyTo: quote.customer_email,
          to: quote.customer_email,
          subject: "✓ Documents signés — votre playlist est débloquée !",
          html: buildEmailHtml(emailData),
          text: buildEmailText(emailData),
        });
      }
    }
  } catch {
    // best effort
  }

  revalidatePath(`/mon-espace/devis/${quoteId}`);
  revalidatePath("/admin/devis");
  return { ok: true as const, message: "Document signé ✓" };
}

// ---------- Documents envoyés par l'admin ----------

// Génère automatiquement le devis PDF à partir de la prestation choisie
// et le place dans la section « à signer » du client.
export async function generateDevisDocument(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();
  if (!quote) return { ok: false as const, error: "Devis introuvable." };

  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  // Personnalisation : valeurs du formulaire admin, sinon modèle par défaut.
  const { DEVIS_TEMPLATE } = await import("@/lib/devis-template");
  const title = String(formData.get("devis_title") ?? "") || DEVIS_TEMPLATE.title;
  const subtitle =
    String(formData.get("devis_subtitle") ?? "") || DEVIS_TEMPLATE.subtitle;
  const conditions =
    String(formData.get("devis_conditions") ?? "") || DEVIS_TEMPLATE.conditions;
  const validityDays =
    Number(formData.get("devis_validity_days") ?? "") || DEVIS_TEMPLATE.validityDays;
  const customNotes = String(formData.get("devis_notes") ?? "").trim();

  // Génération du PDF avec le modèle validé (charte anthracite / bleu / cyan).
  let bytes: Uint8Array;
  const { buildDevisPdf } = await import("@/lib/devis-pdf");
  // N° de contrat : date d'émission (AAAAMMJJ) + compteur du jour (-01, -02…)
  const todayIso = new Date().toLocaleDateString("fr-CA"); // AAAA-MM-JJ
  const startOfDay = `${todayIso}T00:00:00`;
  const { count: todayCount } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfDay);
  const contractNumber = `${todayIso.replace(/-/g, "")}-${String(
    (todayCount ?? 0) + 1
  ).padStart(2, "0")}`;
  bytes = await buildDevisPdf(quote as never, {
    contractNumber,
    validityDays,
    conditions: conditions.includes("valable")
      ? conditions.replace(/valable\s+\d+\s+jours?/i, `valable ${validityDays} jours`)
      : conditions || undefined,
  });

  // Propriétaire du devis (clé user_id).
  const { data: owner } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const ownerUser = owner?.users?.find(
    (u) => u.email?.toLowerCase() === quote.customer_email?.toLowerCase()
  );

  const storagePath = `admin/${quoteId}/devis-${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("client-files")
    .upload(storagePath, bytes, { contentType: "application/pdf" });
  if (uploadError) {
    return { ok: false as const, error: "Échec de la génération du devis." };
  }

  await supabase.from("quote_files").insert({
    quote_id: quoteId,
    user_id: ownerUser?.id ?? null,
    name: `Devis ${contractNumber}.pdf`,
    storage_path: storagePath,
    mime_type: "application/pdf",
    size_bytes: bytes.length,
    from_admin: true,
    doc_kind: "a_signer",
  });

  // Passage en « attente de signature » + pastille.
  await supabase.from("quotes").update({ has_unread_updates: true }).eq("id", quoteId);
  await advanceQuoteStatus(supabase, quoteId, "attente_signature");

  // Prévient le client qu'un document attend sa signature.
  // Prévient le client qu'un document attend sa signature (sauf si les
  // documents sont générés en lot : un seul e-mail récapitulatif sera envoyé).
  if (formData.get("silent") !== "1") {
    void notifyClientDocuments(quoteId, [`Devis ${contractNumber}`], { aSigner: true });
  }

  revalidatePath("/admin/devis");
  revalidatePath(`/mon-espace/devis/${quoteId}`);
  return { ok: true as const, message: "Devis PDF généré et envoyé à la signature ✓" };
}

// Génère automatiquement le contrat PDF (même charte que le devis) et le
// place dans la section « à signer » du client. Réutilise le numéro de
// contrat du devis si celui-ci a déjà été généré.
export async function generateContratDocument(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();
  if (!quote) return { ok: false as const, error: "Devis introuvable." };

  // Numéro : celui du devis existant s'il y en a un, sinon nouveau compteur.
  const { data: devisFile } = await supabase
    .from("quote_files")
    .select("name")
    .eq("quote_id", quoteId)
    .eq("doc_kind", "a_signer")
    .like("name", "Devis %.pdf")
    .limit(1)
    .maybeSingle();
  let contractNumber = devisFile?.name
    ?.replace(/^Devis\s+/, "")
    .replace(/\.pdf$/, "");
  if (!contractNumber) {
    const todayIso = new Date().toLocaleDateString("fr-CA");
    const startOfDay = `${todayIso}T00:00:00`;
    const { count: todayCount } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay);
    contractNumber = `${todayIso.replace(/-/g, "")}-${String(
      (todayCount ?? 0) + 1
    ).padStart(2, "0")}`;
  }

  const { buildContratPdf } = await import("@/lib/contrat-pdf");
  let bytes: Uint8Array;
  try {
    bytes = await buildContratPdf(quote as never, { contractNumber });
  } catch (e) {
    console.error("Génération contrat impossible", e);
    return { ok: false as const, error: "Échec de la génération du contrat." };
  }

  // Propriétaire du devis (clé user_id).
  const { data: owner } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const ownerUser = owner?.users?.find(
    (u) => u.email?.toLowerCase() === quote.customer_email?.toLowerCase()
  );

  const storagePath = `admin/${quoteId}/contrat-${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("client-files")
    .upload(storagePath, bytes, { contentType: "application/pdf" });
  if (uploadError) {
    return { ok: false as const, error: "Échec de la génération du contrat." };
  }

  await supabase.from("quote_files").insert({
    quote_id: quoteId,
    user_id: ownerUser?.id ?? null,
    name: `Contrat ${contractNumber}.pdf`,
    storage_path: storagePath,
    mime_type: "application/pdf",
    size_bytes: bytes.length,
    from_admin: true,
    doc_kind: "a_signer",
  });

  // Pastille nouveautés côté client.
  await supabase.from("quotes").update({ has_unread_updates: true }).eq("id", quoteId);

  // Prévient le client qu'un document attend sa signature.
  // Prévient le client qu'un document attend sa signature (sauf génération
  // en lot : voir generateDevisEtContratDocument).
  if (formData.get("silent") !== "1") {
    void notifyClientDocuments(quoteId, [`Contrat ${contractNumber}`], { aSigner: true });
  }

  revalidatePath("/admin/devis");
  revalidatePath(`/mon-espace/devis/${quoteId}`);
  return { ok: true as const, message: "Contrat PDF généré et envoyé à la signature ✓" };
}

// Génère le devis ET le contrat en un clic, puis n'envoie qu'UN SEUL e-mail
// au client listant les deux documents (au lieu de deux mails séparés).
export async function generateDevisEtContratDocument(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  // Copie des champs (personnalisation devis…) + drapeau « pas d'e-mail »
  // pour que chaque génération reste silencieuse individuellement.
  const silentFd = new FormData();
  for (const [key, value] of formData.entries()) silentFd.set(key, value);
  silentFd.set("silent", "1");

  const devisResult = await generateDevisDocument(silentFd);
  if (devisResult && devisResult.ok === false) return devisResult;
  const contratResult = await generateContratDocument(silentFd);
  if (contratResult && contratResult.ok === false) return contratResult;

  // Un seul e-mail récapitulatif avec les documents à signer présents.
  const supabase = createAdminClient();
  const { data: files } = await supabase
    .from("quote_files")
    .select("name")
    .eq("quote_id", quoteId)
    .eq("doc_kind", "a_signer");
  const names = (files ?? [])
    .filter((f) => /^Devis |^Contrat /.test(f.name))
    .map((f) => f.name.replace(/\.pdf$/, ""));

  await notifyClientDocuments(quoteId, names, { aSigner: true });

  revalidatePath("/admin/devis");
  revalidatePath(`/mon-espace/devis/${quoteId}`);
  return {
    ok: true as const,
    message: `Devis + contrat générés et envoyés à la signature ✓ (${names.length} document${names.length > 1 ? "s" : ""})`,
  };
}

// Génère la facture PDF (même charte que le devis, sans signature) et la
// place dans les documents simples du devis. Numérotation F-AAAA-NNN.
export async function generateFactureDocument(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  try {
    const supabase = createAdminClient();
    const { data: quote } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();
    if (!quote) return { ok: false as const, error: "Devis introuvable." };

    // Numéro de facture : séquence annuelle (F-2026-001, F-2026-002…)
    const year = new Date().getFullYear();
    const { count: factureCount } = await supabase
      .from("quote_files")
      .select("id", { count: "exact", head: true })
      .like("name", `Facture F-${year}-%.pdf`);
    const invoiceNumber = `F-${year}-${String((factureCount ?? 0) + 1).padStart(3, "0")}`;

    const { buildFacturePdf } = await import("@/lib/facture-pdf");
    let bytes: Uint8Array;
    try {
      const adjustments = Array.isArray(quote.invoice_adjustments)
        ? (quote.invoice_adjustments as { label: string; amount_cents: number }[])
        : [];
      bytes = await buildFacturePdf(quote as never, { invoiceNumber, adjustments });
    } catch (e) {
      console.error("Génération facture impossible", e);
      return { ok: false as const, error: "Échec de la génération de la facture." };
    }

    // Propriétaire du devis (clé user_id).
    const { data: owner } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const ownerUser = owner?.users?.find(
      (u) => u.email?.toLowerCase() === quote.customer_email?.toLowerCase()
    );

    const storagePath = `admin/${quoteId}/facture-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("client-files")
      .upload(storagePath, bytes, { contentType: "application/pdf" });
    if (uploadError) {
      console.error("Upload facture impossible", uploadError);
      return { ok: false as const, error: "Échec de la génération de la facture." };
    }

    await supabase.from("quote_files").insert({
      quote_id: quoteId,
      user_id: ownerUser?.id ?? null,
      name: `Facture ${invoiceNumber}.pdf`,
      storage_path: storagePath,
      mime_type: "application/pdf",
      size_bytes: bytes.length,
      from_admin: true,
      doc_kind: "info",
    });

    revalidatePath("/admin/devis");
    revalidatePath(`/mon-espace/devis/${quoteId}`);

    // Prévient le client que sa facture est disponible.
    void notifyClientDocuments(quoteId, [`Facture ${invoiceNumber}`]);

    return { ok: true as const, message: `Facture ${invoiceNumber} générée ✓` };
  } catch (e) {
    console.error("Erreur inattendue génération facture", e);
    return {
      ok: false as const,
      error: e instanceof Error ? `Erreur : ${e.message}` : "Erreur inattendue.",
    };
  }
}

// Le client supprime un devis encore au stade « nouveau » (erreur de saisie).
export async function deleteClientQuote(formData: FormData) {
  const { createAuthClient } = await import("@/lib/supabase/server");
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "Non autorisé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_email, status")
    .eq("id", quoteId)
    .single();
  if (!quote || quote.customer_email?.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false as const, error: "Non autorisé." };
  }
  if (quote.status !== "nouveau") {
    return {
      ok: false as const,
      error: "Ce devis est déjà en cours de traitement : contactez le prestataire pour l'annuler.",
    };
  }

  // Nettoyage des données liées avant suppression du devis.
  await supabase.from("quote_files").delete().eq("quote_id", quoteId);
  await supabase.from("playlist_tracks").delete().eq("quote_id", quoteId);
  await supabase.from("quote_messages").delete().eq("quote_id", quoteId);
  const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
  if (error) return { ok: false as const, error: "Échec de la suppression." };

  revalidatePath("/mon-espace");
  return { ok: true as const, message: "Devis supprimé ✓" };
}

// Le client déclare avoir envoyé l'acompte par virement.
export async function declareAcompteSent(formData: FormData) {
  const { createAuthClient } = await import("@/lib/supabase/server");
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "Non autorisé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_email, acompte_declared_at")
    .eq("id", quoteId)
    .single();
  if (!quote || quote.customer_email?.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false as const, error: "Non autorisé." };
  }
  if (quote.acompte_declared_at) return { ok: true as const, message: "Déjà déclaré ✓" };

  const { error } = await supabase
    .from("quotes")
    .update({ acompte_declared_at: new Date().toISOString() })
    .eq("id", quoteId);
  if (error) return { ok: false as const, error: "Échec de la déclaration." };

  // Notification e-mail à l'admin : le client dit avoir envoyé l'acompte.
  try {
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.NOTIF_EMAIL;
    if (apiKey && to) {
      const resend = new Resend(apiKey);
      const emailData = {
        title: "Acompte déclaré par le client",
        emoji: "",
        intro: `<strong>${quote.customer_email ?? user.email}</strong> déclare avoir envoyé l'acompte du devis.`,
        sections: [
          {
            title: "À faire",
            lines: [
 "1. Vérifie la <strong>réception du virement</strong> sur ton compte bancaire",
 "2. Passe le devis en <strong>« Confirmé »</strong> depuis l'admin → sa réservation sera entièrement validée",
            ],
          },
        ],
        button: { label: "Ouvrir l'admin — Devis", href: `${SITE_URL}/admin/devis` },
      };
      await resend.emails.send({
        from: EMAIL_FROM,
        replyTo: user.email,
        to,
        subject: "Acompte déclaré — à vérifier sur ton compte",
        html: buildEmailHtml(emailData),
        text: buildEmailText(emailData),
      });
    }
  } catch (err) {
    console.error("[acompte] Echec e-mail admin:", err);
  }

  console.log(`[acompte] Le client ${user.email} a déclaré avoir envoyé l'acompte du devis ${quoteId}`);

  revalidatePath(`/mon-espace/devis/${quoteId}`);
  revalidatePath("/admin/devis");
  return { ok: true as const, message: "Merci ! Le prestataire a été prévenu ✓" };
}

// L'admin confirme la réception de l'acompte.
// Notification e-mail au client : des documents viennent d'être déposés/générés
// dans son espace (devis/contrat à signer, facture…). Un seul e-mail même si
// plusieurs documents sont générés en une fois.
async function notifyClientDocuments(
  quoteId: string,
  docNames: string[],
  opts: { aSigner?: boolean } = {}
) {
  if (docNames.length === 0) return;
  try {
    const supabase = createAdminClient();
    const { data: quote } = await supabase
      .from("quotes")
      .select("customer_email, customer_name")
      .eq("id", quoteId)
      .single();
    if (!quote?.customer_email) return;
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;
    const single = docNames.length === 1;
    const emailData = {
      title: opts.aSigner
        ? single ? "Un document attend votre signature" : "Des documents attendent votre signature"
        : single ? "Un document est disponible" : "Des documents sont disponibles",
      emoji: opts.aSigner ? "" : "",
      intro: `Bonjour ${quote.customer_name ?? ""},<br/><br/>${single ? "Le document" : "Les documents"} <strong style="color:#21619A;">« ${docNames.map((n) => n.replace(/</g, "&lt;")).join(" », « ")} »</strong> ${single ? "vient" : "viennent"} d'être déposé${single ? "" : "s"} dans votre espace client${opts.aSigner ? ` et ${single ? "attend" : "attendent"} votre <strong>signature</strong>` : ""}.`,
      sections: opts.aSigner
        ? [
            {
              title: "Rappel",
              lines: [
 "La signature <strong>débloque votre playlist</strong> et réserve votre date.",
 "Signature en ligne, en 2 minutes, depuis votre espace.",
              ],
            },
          ]
        : [
            {
              title: "Rappel",
              lines: ["Vous pouvez les consulter et les télécharger à tout moment depuis votre espace."],
            },
          ],
      button: {
        label: opts.aSigner ? "Signer maintenant" : "Voir les documents",
        href: `${SITE_URL}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${quoteId}#documents`)}`,
      },
    };
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: EMAIL_FROM,
      replyTo: process.env.NOTIF_EMAIL,
      to: quote.customer_email,
      subject: opts.aSigner
        ? `${docNames.join(" + ")} ${single ? "attend" : "attendent"} votre signature — Propul'Sound DJ`
        : `${docNames.join(" + ")} ${single ? "est" : "sont"} disponible${single ? "" : "s"} — Propul'Sound DJ`,
      html: buildEmailHtml(emailData),
      text: buildEmailText(emailData),
    });
  } catch (err) {
    console.error("[documents] Echec e-mail client:", err);
  }
}

// ---------- RDV téléphonique ----------
// Le client propose des créneaux, l'admin en valide un. Nécessite la table
// « rdv_requests » (SQL fourni dans le dashboard Supabase).

export async function proposeRdvCall(formData: FormData) {
  const { createAuthClient } = await import("@/lib/supabase/server");
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "Non autorisé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_email")
    .eq("id", quoteId)
    .single();
  if (!quote || quote.customer_email?.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false as const, error: "Non autorisé." };
  }

  // Récupère 1 à 3 créneaux proposés (datetime-local).
  const slots = [1, 2, 3]
    .map((i) => String(formData.get(`slot${i}`) ?? "").trim())
    .filter(Boolean)
    .slice(0, 3);
  if (slots.length === 0) {
    return { ok: false as const, error: "Propose au moins un créneau." };
  }

  const { error } = await supabase.from("rdv_requests").insert(
    slots.map((slot) => ({
      quote_id: quoteId,
      proposed_at: new Date(slot).toISOString(),
      status: "propose" as const,
    }))
  );
  if (error) {
    console.error("[rdv] Erreur insertion:", error.message);
    return { ok: false as const, error: "Échec de l'enregistrement. Vérifie que la table rdv_requests existe." };
  }

  // Notification admin : nouveau(x) créneau(x) à valider.
  try {
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.NOTIF_EMAIL;
    if (apiKey && to) {
      const { EMAIL_FROM, buildEmailHtml, buildEmailText } = await import("@/lib/emails");
      const slotsFr = slots
        .map((s) => new Date(s).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }))
        .map((s) => `• ${s}`);
      const emailData = {
        title: "Demande de RDV téléphonique",
        emoji: "",
        intro: `<strong>${quote.customer_email}</strong> souhaite un point téléphonique avec toi. Créneaux proposés :`,
        sections: [{ lines: slotsFr }],
        button: { label: "Valider un créneau (admin)", href: `${SITE_URL}/admin/devis` },
      };
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: EMAIL_FROM,
        replyTo: user.email,
        to,
        subject: "Demande de RDV téléphonique — à valider",
        html: buildEmailHtml(emailData),
        text: buildEmailText(emailData),
      });
    }
  } catch (err) {
    console.error("[rdv] Echec e-mail admin:", err);
  }

  revalidatePath(`/mon-espace/devis/${quoteId}`);
  return { ok: true as const, message: "Créneaux envoyés ! Tu recevras un e-mail dès confirmation ✓" };
}

// L'admin valide ou refuse un créneau proposé.
export async function adminRdvDecision(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };

  const rdvId = String(formData.get("rdv_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!rdvId || !["valide", "refuse"].includes(decision)) {
    return { ok: false as const, error: "Requête invalide." };
  }

  const supabase = createAdminClient();
  const { data: rdv } = await supabase
    .from("rdv_requests")
    .select("id, quote_id, proposed_at")
    .eq("id", rdvId)
    .single();
  if (!rdv) return { ok: false as const, error: "Créneau introuvable." };

  if (decision === "valide") {
    await supabase.from("rdv_requests").update({ status: "valide" }).eq("id", rdvId);
    await supabase
      .from("rdv_requests")
      .update({ status: "refuse" })
      .eq("quote_id", rdv.quote_id)
      .eq("status", "propose");
  } else {
    await supabase.from("rdv_requests").update({ status: "refuse" }).eq("id", rdvId);
  }

  // E-mail au client (confirmation ou invitation à reproposer).
  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_email")
    .eq("id", rdv.quote_id)
    .single();
  if (quote?.customer_email) {
    try {
      const { Resend } = await import("resend");
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const { EMAIL_FROM, buildEmailHtml, buildEmailText } = await import("@/lib/emails");
        if (decision === "valide") {
          const when = new Date(rdv.proposed_at).toLocaleString("fr-FR", {
            weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
          });
          const emailData = {
            title: "Ton RDV téléphonique est confirmé !",
            emoji: "",
            intro: `Bonjour,<br/><br/>C'est confirmé : je t'appelle le <strong>${when}</strong>.<br/><br/>Prépare tes questions, on fait le point sur ta soirée !`,
            sections: [
              { lines: ["Ajoute-le à ton calendrier depuis ton espace client."] },
            ],
            button: {
              label: "Voir dans mon espace",
              href: `${SITE_URL}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${rdv.quote_id}#rdv`)}`,
            },
          };
          const resend = new Resend(apiKey);
          await resend.emails.send({
            from: EMAIL_FROM,
            replyTo: process.env.NOTIF_EMAIL,
            to: quote.customer_email,
            subject: "RDV téléphonique confirmé — Propul'Sound DJ",
            html: buildEmailHtml(emailData),
            text: buildEmailText(emailData),
          });
        } else {
          const { EMAIL_FROM } = await import("@/lib/emails");
          const resend = new Resend(apiKey);
          await resend.emails.send({
            from: EMAIL_FROM,
            replyTo: process.env.NOTIF_EMAIL,
            to: quote.customer_email,
            subject: "Créneau indisponible — propose-en un autre",
            text: "Bonjour,\n\nLe créneau que tu avais proposé ne m'est malheureusement pas possible. Propose-en un autre depuis ton espace client, on trouvera un moment !\n\n— Maxime, Propul'Sound DJ",
          });
        }
      }
    } catch (err) {
      console.error("[rdv] Echec e-mail client:", err);
    }
  }

  revalidatePath("/admin/devis");
  revalidatePath(`/mon-espace/devis/${rdv.quote_id}`);
  return { ok: true as const, message: decision === "valide" ? "RDV validé ✓" : "Créneau refusé ✓" };
}

export async function confirmAcompteReceived(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("quotes")
    .update({ acompte_paid_at: new Date().toISOString(), status: "confirme" })
    .eq("id", quoteId);
  if (error) return { ok: false as const, error: "Échec." };

  revalidatePath("/admin/devis");
  revalidatePath(`/mon-espace/devis/${quoteId}`);
  return { ok: true as const, message: "Acompte confirmé ✓" };
}

// Sauvegarde les ajustements de facture (lignes ajoutées/retirées par l'admin).
export async function saveInvoiceAdjustments(adjustments: { label: string; amount: string }[], quoteId: string) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const cleaned = adjustments
    .map((a) => ({
      label: String(a.label ?? "").trim(),
      amount_cents: Math.round(parseFloat(String(a.amount ?? "").replace(",", ".")) * 100) || 0,
    }))
    .filter((a) => a.label && a.amount_cents !== 0);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("quotes")
    .update({ invoice_adjustments: cleaned })
    .eq("id", quoteId);
  if (error) return { ok: false as const, error: "Échec de l'enregistrement." };
  revalidatePath("/admin/devis");
  return { ok: true as const, message: "Ajustements enregistrés ✓" };
}

export async function uploadAdminDocument(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  const docKind = String(formData.get("doc_kind") ?? "info") === "a_signer" ? "a_signer" : "info";
  const file = formData.get("file");
  if (!quoteId || !(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Aucun fichier sélectionné." };
  }
  if (file.size > 50 * 1024 * 1024) {
    return { ok: false as const, error: "Fichier trop volumineux (50 Mo max)." };
  }

  const supabase = createAdminClient();
  await ensureBucket(supabase);

  const safeName = file.name.replace(/[^\w.\-()À-ÿ ]+/g, "_");
  const storagePath = `admin/${quoteId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined });
  if (uploadError) {
    return { ok: false as const, error: "Échec de l'envoi." };
  }

  // Propriétaire du devis (pour la clé user_id).
  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_email, status")
    .eq("id", quoteId)
    .single();
  const { data: owner } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const ownerUser = owner?.users?.find(
    (u) => u.email?.toLowerCase() === quote?.customer_email?.toLowerCase()
  );

  await supabase.from("quote_files").insert({
    quote_id: quoteId,
    user_id: ownerUser?.id ?? crypto.randomUUID(),
    name: file.name,
    storage_path: storagePath,
    mime_type: file.type || null,
    size_bytes: file.size,
    from_admin: true,
    doc_kind: docKind,
  });

  // Notification e-mail au client (best effort).
  try {
    if (quote?.customer_email) {
      const { Resend } = await import("resend");
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.NOTIF_EMAIL;
      if (apiKey && from) {
        const resend = new Resend(apiKey);
        const { buildEmailHtml, buildEmailText, stepsSection } = await import("@/lib/emails");
        const emailData = {
          title: "Un nouveau document est disponible",
          emoji: "",
          intro: `Bonjour,<br/><br/>Un nouveau document vient d'être déposé dans votre espace client :<br/><br/><strong style="color:#21619A;">« ${file.name.replace(/</g, "&lt;")} »</strong>`,
          sections: [
            stepsSection(quote?.status ?? "contacte"),
            {
              title: "Rappel",
              lines: [
 "Si ce document est <strong>à signer</strong>, vous pouvez le signer directement en ligne depuis votre espace.",
              ],
            },
          ],
          button: { label: "Ouvrir mon dossier client", href: `${SITE_URL}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${quoteId}`)}` },
        };
        await resend.emails.send({
          from: EMAIL_FROM,
          replyTo: quote.customer_email,
          to: quote.customer_email,
          subject: "Un nouveau document est disponible — Propul'Sound DJ",
          html: buildEmailHtml(emailData),
          text: buildEmailText(emailData),
        });
      }
    }
  } catch {
    // best effort
  }

  // Pastille nouveautés + passage en « attente de signature ».
  await supabase.from("quotes").update({ has_unread_updates: true }).eq("id", quoteId);
  await advanceQuoteStatus(supabase, quoteId, "attente_signature");

  revalidatePath("/admin/devis");
  revalidatePath(`/mon-espace/devis/${quoteId}`);
  return { ok: true as const, message: "Document envoyé au client ✓" };
}

export async function deleteAdminDocument(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return;
  const quoteId = String(formData.get("quote_id") ?? "");
  const fileId = String(formData.get("file_id") ?? "");
  if (!quoteId || !fileId) return;

  const supabase = createAdminClient();
  const { data: file } = await supabase
    .from("quote_files")
    .select("storage_path")
    .eq("id", fileId)
    .eq("quote_id", quoteId)
    .single();
  if (!file) return;

  await supabase.storage.from(FILES_BUCKET).remove([file.storage_path]);
  await supabase.from("quote_files").delete().eq("id", fileId);
  revalidatePath("/admin/devis");
  revalidatePath(`/mon-espace/devis/${quoteId}`);
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
    .select("id, name, storage_path, mime_type, size_bytes, created_at, moment, from_admin, signed_name, signed_at, doc_kind")
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
    .select("id, name, storage_path, mime_type, size_bytes, created_at, moment, from_admin")
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

  // Passe par la route de téléchargement sécurisée (/api/files/[id]) qui
  // sert le fichier directement (pas de redirection vers une URL signée,
  // qui pouvait échouer et renvoyer vers la page d'accueil).
  redirect(`/api/files/${fileId}`);
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


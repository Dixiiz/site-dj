"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";
import type { SelectedOption } from "@/lib/types";
import { SITE_URL } from "@/lib/site-url";
import { EMAIL_FROM, buildEmailHtml, buildEmailText } from "@/lib/emails";
import { ADMIN_PACK_LIST } from "@/components/pricing-section";

// ---------- Recherche du compte client (cache) ----------

// listUsers({ perPage: 1000 }) rapatrie tous les comptes à chaque génération
// de document : très lent. On met en cache email → user_id (10 min), ce qui
// rend les générations suivantes quasi instantanées.
const ownerUserCache = new Map<string, { id: string | null; at: number }>();
const OWNER_CACHE_TTL = 10 * 60 * 1000;

export async function findOwnerUserId(
  supabase: ReturnType<typeof createAdminClient>,
  email?: string | null,
  // Si on connaît le devis, on récupère d'abord son user_id dans les tables
  // existantes (quote_files, messages, playlist, échéancier) : requête
  // instantanée, évite le listUsers({ perPage: 1000 }) qui ralentit la
  // génération des documents à chaque cold start serverless.
  quoteId?: string | null
): Promise<string | null> {
  if (!email) return null;
  const key = email.toLowerCase();
  const cached = ownerUserCache.get(key);
  if (cached && Date.now() - cached.at < OWNER_CACHE_TTL) return cached.id;

  if (quoteId) {
    for (const table of ["quote_files", "quote_messages", "playlist_tracks"] as const) {
      try {
        const { data } = await supabase
          .from(table)
          .select("user_id")
          .eq("quote_id", quoteId)
          .not("user_id", "is", null)
          .limit(1)
          .maybeSingle();
        if (data?.user_id) {
          ownerUserCache.set(key, { id: data.user_id, at: Date.now() });
          return data.user_id;
        }
      } catch {
        // Table absente : on continue.
      }
    }
  }

  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const id = data?.users?.find((u) => u.email?.toLowerCase() === key)?.id ?? null;
  ownerUserCache.set(key, { id, at: Date.now() });
  return id;
}

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

  // Le mailleur par défaut de Supabase (confirmations de compte) est peu fiable
  // (limite horaire, spams fréquents) : le client n'avait jamais l'e-mail et
  // restait bloqué sans mot de passe actif. On crée donc le compte via l'API
  // admin, qui renvoie le lien de confirmation SANS envoyer d'e-mail, puis on
  // l'envoie nous-mêmes via Resend (domaine du site, délivrabilité maîtrisée).
  const admin = createAdminClient();
  let actionLink: string | null = null;
  let alreadyConfirmed = false;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { data: { name }, redirectTo: `${SITE_URL}/connexion` },
  });
  if (error || !data) {
    const dejaPris = /already|exist|registered|duplicate/i.test(error?.message ?? "");
    return {
      ok: false as const,
      error: dejaPris
        ? "Un compte existe déjà avec cet e-mail. Connectez-vous, ou utilisez « Mot de passe oublié »."
        : "Création du compte impossible pour le moment. Réessayez dans un instant.",
    };
  }
  actionLink = data.properties?.action_link ?? null;
  // Si la confirmation par e-mail est désactivée côté Supabase, le compte est
  // déjà actif : on connecte directement le client, sans passer par un e-mail.
  alreadyConfirmed = Boolean(data.user.email_confirmed_at ?? data.user.confirmed_at);

  if (alreadyConfirmed) {
    const auth = await createAuthClient();
    const { error: loginError } = await auth.auth.signInWithPassword({ email, password });
    if (loginError) {
      return { ok: false as const, error: loginError.message };
    }
    redirect("/mon-espace");
  }

  // Compte créé mais non confirmé : envoi du mail d'activation via Resend.
  if (!actionLink) {
    return {
      ok: false as const,
      error: "Lien d'activation indisponible. Contactez-nous pour activer votre compte.",
    };
  }
  const { Resend } = await import("resend");
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[signUpClient] RESEND_API_KEY manquante : e-mail d'activation non envoyé.");
    return {
      ok: false as const,
      error: "Envoi d'e-mail momentanément indisponible. Réessayez ou contactez-nous.",
    };
  }
  const resend = new Resend(apiKey);
  const { error: sendError } = await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Activez votre compte Propul'Sound DJ",
    html: buildEmailHtml({
      title: "Votre compte est prêt !",
      intro: `Bonjour ${name},<br/><br/>Votre compte client vient d'être créé. Une dernière étape : <strong>confirmez votre adresse e-mail</strong> en cliquant sur le bouton ci-dessous. Votre mot de passe (celui que vous avez choisi) sera actif immédiatement après.`,
      button: { label: "Activer mon compte", href: actionLink },
      sections: [
        {
          title: "Ensuite",
          lines: [
            "Cliquez sur le bouton : votre adresse est confirmée.",
            "Revenez sur le site et connectez-vous avec votre e-mail et votre mot de passe.",
            "Vous retrouvez votre devis, vos documents et votre playlist dans votre espace.",
          ],
        },
      ],
      footer: "Si vous n'êtes pas à l'origine de ce compte, ignorez simplement cet e-mail.",
    }),
    text: buildEmailText({
      intro: `Bonjour ${name}, votre compte client Propul'Sound DJ vient d'être créé. Confirmez votre adresse e-mail pour activer votre mot de passe.`,
      sections: [
        {
          title: "Ensuite",
          lines: [
            "Cliquez sur le bouton ci-dessous : votre adresse est confirmée.",
            "Connectez-vous ensuite avec votre e-mail et votre mot de passe.",
          ],
        },
      ],
      button: { label: "Activer mon compte", href: actionLink },
    }),
  });
  if (sendError) {
    console.error("[signUpClient] Echec envoi e-mail d'activation:", sendError);
    return {
      ok: false as const,
      error: "L'e-mail d'activation n'a pas pu partir. Réessayez dans un instant.",
    };
  }

  return {
    ok: true as const,
    needsConfirmation: true as const,
    message:
      "Compte créé ! Un e-mail d'activation vient de partir (vérifiez vos spams si besoin). Cliquez sur le lien : votre mot de passe sera actif immédiatement.",
  };
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false as const, error: "E-mail requis." };

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const redirectTo = `${proto}://${host}/connexion/reinitialiser`;

  // Même approche que l'inscription : le mailleur par défaut de Supabase est
  // peu fiable (limite horaire, spams fréquents) — les liens de récupération
  // expirent (1 h) avant même d'être ouverts. On génère le lien via l'API
  // admin et on l'envoie nous-mêmes via Resend (délivrabilité maîtrisée).
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  // Adresse inconnue : on ne révèle pas l'existence du compte, même réponse
  // qu'un envoi réussi.
  if (error || !data) {
    const inconnu = /not found|unable to find|user not/i.test(error?.message ?? "");
    if (inconnu) {
      return {
        ok: true as const,
        message:
          "E-mail envoyé ! Vérifiez votre boîte mail (et vos spams) pour définir un nouveau mot de passe.",
      };
    }
    console.error("[requestPasswordReset] generateLink:", error);
    return { ok: false as const, error: "Réinitialisation impossible pour le moment. Réessayez dans un instant." };
  }

  const actionLink = data.properties?.action_link ?? null;
  if (!actionLink) {
    return { ok: false as const, error: "Lien de réinitialisation indisponible. Réessayez dans un instant." };
  }

  const { Resend } = await import("resend");
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[requestPasswordReset] RESEND_API_KEY manquante : e-mail non envoyé.");
    return {
      ok: false as const,
      error: "Envoi d'e-mail momentanément indisponible. Réessayez ou contactez-nous.",
    };
  }
  const resend = new Resend(apiKey);
  const { error: sendError } = await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Nouveau mot de passe — Propul'Sound DJ",
    html: buildEmailHtml({
      title: "Nouveau mot de passe",
      intro: `Bonjour,<br/><br/>Vous avez demandé la réinitialisation du mot de passe de votre espace client Propul'Sound DJ. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. <strong>Ce lien est valable 1 heure.</strong>`,
      sections: [
        {
          title: "Ensuite",
          lines: [
            "Choisissez un nouveau mot de passe (6 caractères minimum).",
            "Vous serez immédiatement connecté à votre espace client.",
          ],
        },
      ],
      button: { label: "Choisir un nouveau mot de passe", href: actionLink },
      footer:
        "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail — votre mot de passe reste inchangé. — Maxime",
    }),
    text: buildEmailText({
      intro: "Vous avez demandé la réinitialisation de votre mot de passe. Ce lien est valable 1 heure.",
      button: { label: "Choisir un nouveau mot de passe", href: actionLink },
    }),
  });
  if (sendError) {
    console.error("[requestPasswordReset] Echec envoi:", sendError);
    return { ok: false as const, error: "L'envoi de l'e-mail a échoué. Réessayez dans un instant." };
  }
  return {
    ok: true as const,
    message:
      "E-mail envoyé ! Vérifiez votre boîte mail (et vos spams) — le lien est valable 1 heure, cliquez-le rapidement.",
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

  // Pastille nouveautés côté admin + notification push.
  await supabase.from("quotes").update({ has_unread_updates: true }).eq("id", quoteId);
  const { notifyAdminPush } = await import("@/lib/push");
  void notifyAdminPush({
    title: "Nouveau message client",
    body: `${quote.customer_name ?? user.email} : ${body.slice(0, 100)}`,
    url: `/admin/devis?focus=${quoteId}`,
  });

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
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return [];
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
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return;
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
  const ownerUserId = await findOwnerUserId(supabase, quote.customer_email, quoteId);

  await supabase.from("quote_messages").insert({
    quote_id: quoteId,
    user_id: ownerUserId,
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
          to: quote.customer_email,
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
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return [];
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
      if (results.length >= 8) return results;
    }
    if (results.length > 0) break; // assez de résultats, inutile de retenter
  }
  return results;
}

async function searchItunes(query: string): Promise<TrackSuggestion[]> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=10&country=FR`,
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
            : "Demande d'options non retenue — Propul'Sound DJ",
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

// ---------- Modification du devis par le client (lieu, date, horaires, pack) ----------

export type PendingQuoteDetails = {
  event_location?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  formula_name?: string | null;
  formula_price_cents?: number | null;
  message?: string | null;
};

// Le client demande une modification du devis (lieu, date, horaires, pack).
// Comme pour les options : rien n'est appliqué avant validation admin.
export async function updateQuoteDetails(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const { quote } = await getOwnedQuote(quoteId);
  if (!quote) return { ok: false as const, error: "Devis introuvable." };
  if (!optionsEditable(quote.status)) {
    return {
      ok: false as const,
      error: "Ce devis est confirmé : contactez-nous via la messagerie.",
    };
  }
  if (quote.pending_options || quote.pending_details) {
    return {
      ok: false as const,
      error: "Une modification est déjà en attente de validation.",
    };
  }

  const pack = ADMIN_PACK_LIST.find(
    (p) => p.name === String(formData.get("formula_name") ?? "").trim()
  );

  const details: PendingQuoteDetails = {
    event_location: String(formData.get("event_location") ?? "").trim() || null,
    event_date: String(formData.get("event_date") ?? "").trim() || null,
    start_time: String(formData.get("start_time") ?? "").trim() || null,
    end_time: String(formData.get("end_time") ?? "").trim() || null,
    formula_name: pack?.name ?? null,
    formula_price_cents: pack ? pack.price : null,
    message: String(formData.get("message") ?? "").trim() || null,
  };

  if (!details.event_location && !details.event_date && !details.start_time && !details.end_time && !details.formula_name) {
    return { ok: false as const, error: "Indiquez au moins un changement." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("quotes")
    .update({ pending_details: details, has_unread_updates: true })
    .eq("id", quoteId);

  if (error) {
    console.error("Demande de modification impossible", error);
    return {
      ok: false as const,
      error: "Enregistrement impossible — la migration SQL (pending_details) est-elle exécutée ?",
    };
  }

  // Notification admin : push + e-mail (best effort).
  try {
    const { notifyAdminPush } = await import("@/lib/push");
    void notifyAdminPush({
      title: "Demande de modification de devis",
      body: `${quote.customer_name} a demandé une modification (lieu, horaires ou pack).`,
      url: "/admin/devis",
    });
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.NOTIF_EMAIL;
    if (apiKey && to) {
      const { EMAIL_FROM: fromAddr } = await import("@/lib/emails");
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: fromAddr,
        replyTo: quote.customer_email,
        to,
        subject: "Demande de modification de devis — à valider",
        html: `<p><strong>${quote.customer_name}</strong> (${quote.customer_email}) a demandé une modification de son devis :</p><ul>${[
          details.event_location ? `<li>Lieu : ${details.event_location}</li>` : "",
          details.event_date ? `<li>Date : ${details.event_date}</li>` : "",
          details.start_time || details.end_time ? `<li>Horaires : ${details.start_time ?? "?"} - ${details.end_time ?? "?"}</li>` : "",
          details.formula_name ? `<li>Pack : ${details.formula_name}</li>` : "",
          details.message ? `<li>Message : ${details.message}</li>` : "",
        ].filter(Boolean).join("")}</ul><p><a href="${SITE_URL}/admin/devis">Valider ou refuser dans l'admin</a></p>`,
      });
    }
  } catch {
    // best effort
  }

  revalidatePath(`/mon-espace/devis/${quoteId}`);
  return { ok: true as const, message: "Demande envoyée ! Nous vous confirmons dès que possible." };
}

// Validation admin d'une demande de modification de devis (lieu, date,
// horaires, pack). À l'acceptation : application + régénération silencieuse
// du devis et du contrat PDF (à signer) — l'admin envoie ensuite l'e-mail au
// client via le bouton « Envoyer les documents au client ».
export async function resolveQuoteDetails(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  const approve = String(formData.get("approve") ?? "") === "true";
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();
  if (!quote?.pending_details) return { ok: false as const, error: "Rien à valider." };

  if (approve) {
    const d = quote.pending_details as PendingQuoteDetails;
    const updates: Record<string, unknown> = {
      pending_details: null,
      has_unread_updates: false,
    };
    if (d.event_location) updates.event_location = d.event_location;
    if (d.event_date) updates.event_date = d.event_date;
    if (d.start_time) updates.start_time = d.start_time;
    if (d.end_time) updates.end_time = d.end_time;
    if (d.formula_name) {
      const newPrice = Number(d.formula_price_cents ?? 0);
      updates.formula_name = d.formula_name;
      updates.formula_price_cents = newPrice;
      // Recalcul du total : on remplace le prix de l'ancien pack par le neuf
      // (options, déplacement et suppléments restent inchangés — ajustables
      // ensuite via l'édition admin si besoin, ex : heures supp).
      const oldPrice = Number(quote.formula_price_cents ?? 0);
      updates.total_cents = Math.max(0, (quote.total_cents ?? 0) - oldPrice + newPrice);
    }
    const { error } = await supabase
      .from("quotes")
      .update(updates)
      .eq("id", quoteId);
    if (error) return { ok: false as const, error: "Erreur lors de l'application." };

    // Nouveau devis + contrat PDF à signer (génération silencieuse : l'e-mail
    // part via le bouton « Envoyer les documents au client », à votre main).
    const fd = new FormData();
    fd.set("quote_id", quoteId);
    fd.set("silent", "1");
    const gen = await generateDevisEtContratDocument(fd);
    if (gen.ok === false) {
      return {
        ok: false as const,
        error: `Modifications appliquées, mais génération des PDF impossible : ${gen.error}`,
      };
    }
  } else {
    await supabase
      .from("quotes")
      .update({ pending_details: null, has_unread_updates: false })
      .eq("id", quoteId);
  }

  revalidatePath("/admin/devis");
  revalidatePath(`/mon-espace/devis/${quoteId}`);
  return {
    ok: true as const,
    message: approve
      ? "Modifications appliquées + nouveau devis/contrat générés ✓ Pensez à envoyer l'e-mail au client."
      : "Demande refusée — le devis reste inchangé ✓",
  };
}

// L'admin envoie (de son propre chef) l'e-mail « documents à signer » pour un
// devis modifié : liste les PDF à signer non signés du devis.
export async function notifyDevisReady(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };
  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const supabase = createAdminClient();
  const { data: files } = await supabase
    .from("quote_files")
    .select("name")
    .eq("quote_id", quoteId)
    .eq("doc_kind", "a_signer")
    .is("signed_at", null);
  const names = (files ?? [])
    .filter((f) => /^Devis |^Contrat /.test(f.name))
    .map((f) => f.name.replace(/\.pdf$/, ""));
  if (names.length === 0) {
    return { ok: false as const, error: "Aucun document à signer en attente (générez d'abord le devis)." };
  }

  await notifyClientDocuments(quoteId, names, { aSigner: true });
  revalidatePath("/admin/devis");
  return { ok: true as const, message: `E-mail envoyé au client ✓ (${names.join(" + ")})` };
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
  // Acompte demandé ? Sinon, la signature suffit : le devis passe directement
  // en « confirmé » (date verrouillée sans premier versement).
  const { data: acompteFlag } = allSigned
    ? await supabase
        .from("quotes")
        .select("acompte_required")
        .eq("id", quoteId)
        .single()
    : { data: null };
  const acompteRequis = acompteFlag?.acompte_required !== false;
  if (allSigned) {
    await advanceQuoteStatus(supabase, quoteId, acompteRequis ? "attente_acompte" : "confirme");
  }

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
          intro:
 "Bonjour,<br/><br/>Nous avons bien reçu votre signature : vos documents sont désormais <strong style=\"color:#219653;\">validés</strong> !<br/><br/>Votre <strong>playlist est débloquée</strong> dans votre espace client — à vous de nous faire vos propositions musicales !",
          sections: acompteRequis
            ? [
                stepsSection("attente_acompte"),
                {
                  title: "Action à faire en priorité : l'acompte (20 %)",
                  lines: [
                    "Transmettez l'<strong>acompte de réservation</strong> (20 %) par virement, puis cliquez sur <strong>« ✓ J'ai envoyé l'acompte »</strong> dans votre espace : c'est <strong>ce qui verrouille définitivement votre date</strong>.",
                    "Ensuite, renseignez votre <strong>playlist</strong> (temps forts + piste de danse) — elle vous attend dans votre espace !",
                  ],
                },
                {
                  title: "Vos conseils de préparation",
                  lines: [
                    "Visez <strong>15 à 30 titres</strong> pour la piste de danse : c'est votre soirée, la playlist doit vous ressembler.",
                    "Utilisez la <strong>blacklist</strong> : le titre que vous ne supportez plus n'y échappera pas.",
                    "Le <strong>panneau « Timeline »</strong> dans votre espace : notez les horaires (cocktail, repas, dessert, ouverture de bal) et nous suivons ce déroulé à la lettre.",
                    "Prévenez-nous des <strong>moments surprises</strong> (discours, jeux, karaoké) : nous préparons l'ambiance en conséquence.",
                  ],
                },
              ]
            : [
                stepsSection("confirme"),
                {
                  title: "Aucun acompte à envoyer",
                  lines: [
                    "<strong>Bonne nouvelle : aucun acompte n'est demandé pour votre devis</strong> — votre date est d'ores et déjà <strong>verrouillée</strong>.",
                    "Le règlement se fera plus tard (dans votre espace client, par carte ou virement, en une fois ou étalé), au plus tard le jour de la prestation.",
                    "En attendant, renseignez votre <strong>playlist</strong> (temps forts + piste de danse) — elle vous attend dans votre espace !",
                  ],
                },
                {
                  title: "Vos conseils de préparation",
                  lines: [
                    "Visez <strong>15 à 30 titres</strong> pour la piste de danse : c'est votre soirée, la playlist doit vous ressembler.",
                    "Utilisez la <strong>blacklist</strong> : le titre que vous ne supportez plus n'y échappera pas.",
                    "Le <strong>panneau « Timeline »</strong> dans votre espace : notez les horaires (cocktail, repas, dessert, ouverture de bal) et nous suivons ce déroulé à la lettre.",
                    "Prévenez-nous des <strong>moments surprises</strong> (discours, jeux, karaoké) : nous préparons l'ambiance en conséquence.",
                  ],
                },
              ],
          button: acompteRequis
            ? { label: "Régler mon acompte dans mon espace", href: `${SITE_URL}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${quoteId}#acompte`)}` }
            : { label: "Ouvrir mon espace client", href: `${SITE_URL}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${quoteId}`)}` },
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

  // Notification admin : une signature vient d'être apposée (push + e-mail).
  try {
    const { data: qInfo } = await supabase
      .from("quotes")
      .select("customer_name")
      .eq("id", quoteId)
      .single();
    const { data: fileInfo } = await supabase
      .from("quote_files")
      .select("name")
      .eq("id", fileId)
      .maybeSingle();
    const docName = (fileInfo?.name ?? "un document").replace(/\.pdf$/, "");
    const clientName = qInfo?.customer_name ?? "Le client";
    const { notifyAdmin } = await import("@/lib/admin-notify");
    void notifyAdmin({
      title: allSigned ? "Tous les documents sont signés !" : "Signature reçue",
      body: `${clientName} a signé ${docName}${allSigned ? (acompteRequis ? " — dossier complet signé, acompte à venir." : " — dossier complet signé, devis confirmé (sans acompte).") : ""}`,
      url: `/admin/devis?focus=${quoteId}`,
      email: {
        subject: allSigned
          ? acompteRequis
            ? `${clientName} a signé devis + contrat — acompte à venir`
            : `${clientName} a signé devis + contrat — devis confirmé (sans acompte)`
          : `Signature reçue : ${docName} — ${clientName}`,
        html: `<p><strong>${clientName}</strong> a signé <strong>${docName}</strong>.</p>${
          allSigned
            ? acompteRequis
              ? "<p><strong>Tous les documents à signer sont signés</strong> : le devis passe en « attente de l'acompte ». La date est quasi verrouillée — surveille l'acompte (20 %) pour confirmer définitivement.</p>"
              : "<p><strong>Tous les documents à signer sont signés</strong> : le devis est directement <strong>confirmé</strong> (acompte non demandé) — la date est verrouillée.</p>"
            : "<p>Il reste des documents à signer dans ce dossier.</p>"
        }<p><a href="${SITE_URL}/admin/devis?focus=${quoteId}">Ouvrir le devis dans l'admin</a></p>`,
      },
    });
  } catch {
    // best effort
  }

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

  // Personnalisation : valeurs du formulaire admin, sinon modèle par défaut.
  const { DEVIS_TEMPLATE } = await import("@/lib/devis-template");
  const conditions =
    String(formData.get("devis_conditions") ?? "") || DEVIS_TEMPLATE.conditions;
  const validityDays =
    Number(formData.get("devis_validity_days") ?? "") || DEVIS_TEMPLATE.validityDays;

  // Génération du PDF avec le modèle validé (charte anthracite / bleu / cyan).
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
  const bytes = await buildDevisPdf(quote as never, {
    contractNumber,
    validityDays,
    conditions: conditions.includes("valable")
      ? conditions.replace(/valable\s+\d+\s+jours?/i, `valable ${validityDays} jours`)
      : conditions || undefined,
  });

  // Propriétaire du devis (clé user_id) — cache mémoire.
  const ownerUserId = await findOwnerUserId(supabase, quote.customer_email, quoteId);

  const storagePath = `admin/${quoteId}/devis-${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("client-files")
    .upload(storagePath, bytes, { contentType: "application/pdf" });
  if (uploadError) {
    return { ok: false as const, error: "Échec de la génération du devis." };
  }

  await supabase.from("quote_files").insert({
    quote_id: quoteId,
    user_id: ownerUserId,
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

  // Propriétaire du devis (clé user_id) — cache mémoire.
  const ownerUserId = await findOwnerUserId(supabase, quote.customer_email, quoteId);

  const storagePath = `admin/${quoteId}/contrat-${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("client-files")
    .upload(storagePath, bytes, { contentType: "application/pdf" });
  if (uploadError) {
    return { ok: false as const, error: "Échec de la génération du contrat." };
  }

  await supabase.from("quote_files").insert({
    quote_id: quoteId,
    user_id: ownerUserId,
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
    const adjustments = Array.isArray(quote.invoice_adjustments)
      ? (quote.invoice_adjustments as { label: string; amount_cents: number }[])
      : [];

    // PDF et recherche du compte client en parallèle (gain de latence).
    const [pdfResult, ownerUserId] = await Promise.all([
      (async () => {
        try {
          return {
            ok: true as const,
            bytes: await buildFacturePdf(quote as never, {
              invoiceNumber,
              adjustments,
              // Pas d'acompte pour ce devis ? Le total est directement à régler.
              hideAcompte: quote.acompte_required === false,
            }),
          };
        } catch (e) {
          console.error("Génération facture impossible", e);
          return { ok: false as const, bytes: null };
        }
      })(),
      findOwnerUserId(supabase, quote.customer_email, quoteId),
    ]);
    if (!pdfResult.ok || !pdfResult.bytes) {
      return { ok: false as const, error: "Échec de la génération de la facture." };
    }
    const bytes = pdfResult.bytes;

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
      user_id: ownerUserId,
      name: `Facture ${invoiceNumber}.pdf`,
      storage_path: storagePath,
      mime_type: "application/pdf",
      size_bytes: bytes.length,
      from_admin: true,
      doc_kind: "info",
    });

    revalidatePath("/admin/devis");
    revalidatePath(`/mon-espace/devis/${quoteId}`);

    // Pas d'e-mail automatique : l'admin décide d'envoyer la notification
    // au client via le bouton « ✉ Envoyer au client » à côté de la facture.

    return { ok: true as const, message: `Facture ${invoiceNumber} générée ✓` };
  } catch (e) {
    console.error("Erreur inattendue génération facture", e);
    return {
      ok: false as const,
      error: e instanceof Error ? `Erreur : ${e.message}` : "Erreur inattendue.",
    };
  }
}

// Envoie au client l'e-mail « document disponible » pour une facture déjà
// générée (sur clic de l'admin — rien n'est envoyé automatiquement).
export async function sendInvoiceDocument(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  const fileId = String(formData.get("file_id") ?? "");
  if (!quoteId || !fileId) return { ok: false as const, error: "Facture introuvable." };

  const supabase = createAdminClient();
  const { data: file } = await supabase
    .from("quote_files")
    .select("id, name, from_admin, storage_path")
    .eq("id", fileId)
    .eq("quote_id", quoteId)
    .single();
  if (!file?.from_admin) return { ok: false as const, error: "Facture introuvable." };

  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_email")
    .eq("id", quoteId)
    .single();
  if (!quote?.customer_email) return { ok: false as const, error: "Client sans e-mail." };

  // Le client reçoit la facture SANS compte : PDF joint à l'e-mail + lien de
  // téléchargement signé (30 jours) en secours.
  let downloadUrl: string | undefined;
  let attachment: { filename: string; content: string } | undefined;
  if (file.storage_path) {
    const [{ data: signed }, { data: blob }] = await Promise.all([
      supabase.storage.from("client-files").createSignedUrl(file.storage_path, 60 * 60 * 24 * 30),
      supabase.storage.from("client-files").download(file.storage_path),
    ]);
    downloadUrl = signed?.signedUrl;
    if (blob) {
      const buf = Buffer.from(await blob.arrayBuffer());
      attachment = { filename: file.name, content: buf.toString("base64") };
    }
  }

  // L'e-mail part en tâche de fond (après la réponse) : le bouton répond
  // immédiatement au lieu de mouliner pendant l'envoi via Resend.
  after(() =>
    notifyClientDocuments(quoteId, [file.name], {
      downloadUrl,
      downloadFileName: file.name,
      attachment,
    })
  );

  return {
    ok: true as const,
    message: `« ${file.name} » : envoi en cours vers ${quote.customer_email} ✓`,
  };
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
    .select("customer_email, customer_name, acompte_declared_at")
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
        intro: `<strong>${quote.customer_name ?? quote.customer_email ?? user.email}</strong>${quote.customer_email ? ` (${quote.customer_email})` : ""} déclare avoir envoyé l'acompte du devis.`,
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

  // Notification push admin (même info que l'e-mail).
  const { notifyAdminPush } = await import("@/lib/push");
  void notifyAdminPush({
    title: "Acompte déclaré par le client",
    body: `${quote.customer_name ?? quote.customer_email ?? user.email} dit avoir envoyé l'acompte — à vérifier`,
    url: "/admin/devis",
  });

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
  opts: {
    aSigner?: boolean;
    downloadUrl?: string;
    downloadFileName?: string;
    // PDF joint directement à l'e-mail : le client récupère son document
    // sans compte (factures notamment).
    attachment?: { filename: string; content: string };
  } = {}
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
    const accesDirect = Boolean(opts.downloadUrl || opts.attachment);
    const emailData = {
      title: opts.aSigner
        ? single ? "Un document attend votre signature" : "Des documents attendent votre signature"
        : single ? "Un document est disponible" : "Des documents sont disponibles",
      intro: accesDirect
        ? `Bonjour ${quote.customer_name ?? ""},<br/><br/>${single ? "Le document" : "Les documents"} <strong style="color:#21619A;">« ${docNames.map((n) => n.replace(/</g, "&lt;")).join(" », « ")} »</strong> ${single ? "est" : "sont"} en pièce jointe de cet e-mail${opts.downloadUrl ? (single ? " et téléchargeable aussi via le bouton ci-dessous" : " et téléchargeables aussi via le bouton ci-dessous") : ""}. <strong>Aucun compte n'est nécessaire</strong> pour le${single ? "" : "s"} récupérer.`
        : `Bonjour ${quote.customer_name ?? ""},<br/><br/>${single ? "Le document" : "Les documents"} <strong style="color:#21619A;">« ${docNames.map((n) => n.replace(/</g, "&lt;")).join(" », « ")} »</strong> ${single ? "vient" : "viennent"} d'être déposé${single ? "" : "s"} dans votre espace client${opts.aSigner ? ` et ${single ? "attend" : "attendent"} votre <strong>signature</strong>` : ""}.`,
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
        : accesDirect
          ? [
              {
                title: "Bon à savoir",
                lines: [
                  `Le PDF est <strong>joint à cet e-mail</strong> — enregistrez-le où vous voulez.`,
                  ...(opts.downloadUrl
                    ? [`Le bouton ci-dessous fonctionne aussi (lien valable 30 jours).`]
                    : []),
                ],
              },
            ]
          : [
              {
                title: "Rappel",
                lines: [
                  "Vous pouvez les consulter et les télécharger à tout moment depuis votre espace.",
                ],
              },
            ],
      button: opts.downloadUrl
        ? {
            label: `Télécharger ${opts.downloadFileName ?? "le document"}`,
            href: opts.downloadUrl,
          }
        : {
            label: opts.aSigner ? "Consulter les documents" : "Voir les documents",
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
      ...(opts.attachment ? { attachments: [opts.attachment] } : {}),
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
    .select("customer_email, customer_name")
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
        intro: `<strong>${quote.customer_name ?? quote.customer_email}</strong> (${quote.customer_email}) souhaite un point téléphonique avec toi. Créneaux proposés :`,
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
  // Date/heure exacte choisie par l'admin (requis pour valider une
  // disponibilité hebdo, optionnel pour un créneau daté).
  const rdvDatetime = String(formData.get("rdv_datetime") ?? "").trim();
  if (!rdvId || !["valide", "refuse"].includes(decision)) {
    return { ok: false as const, error: "Requête invalide." };
  }

  const supabase = createAdminClient();
  const { data: rdv } = await supabase
    .from("rdv_requests")
    .select("id, quote_id, proposed_at, availability")
    .eq("id", rdvId)
    .single();
  if (!rdv) return { ok: false as const, error: "Créneau introuvable." };

  const whenIso = rdvDatetime
    ? new Date(rdvDatetime).toISOString()
    : (rdv.proposed_at ?? "");
  if (decision === "valide" && !whenIso) {
    return { ok: false as const, error: "Choisis d'abord la date et l'heure du rappel." };
  }

  if (decision === "valide") {
    await supabase
      .from("rdv_requests")
      .update({ status: "valide", proposed_at: whenIso })
      .eq("id", rdvId);
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
          const when = new Date(whenIso).toLocaleString("fr-FR", {
            weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
          });
          const emailData = {
            title: "Ton RDV téléphonique est confirmé !",
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

// Le client envoie ses disponibilités hebdo (jours + moments en texte libre
// structuré). L'admin choisit ensuite la date exacte pour valider.
export async function proposeRdvAvailability(formData: FormData) {
  const { createAuthClient } = await import("@/lib/supabase/server");
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "Non autorisé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  const availability = String(formData.get("availability") ?? "").trim();
  if (!quoteId || !availability) return { ok: false as const, error: "Requête invalide." };

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_email, customer_name")
    .eq("id", quoteId)
    .single();
  if (!quote || quote.customer_email?.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false as const, error: "Non autorisé." };
  }

  const { error } = await supabase.from("rdv_requests").insert({
    quote_id: quoteId,
    availability,
    status: "propose",
  });
  if (error) {
    console.error("[rdv] Erreur insertion:", error.message);
    return { ok: false as const, error: "Échec de l'enregistrement." };
  }

  // Notification admin.
  try {
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.NOTIF_EMAIL;
    if (apiKey && to) {
      const { EMAIL_FROM, buildEmailHtml, buildEmailText } = await import("@/lib/emails");
      const emailData = {
        title: "Demande de RDV téléphonique",
        intro: `<strong>${quote.customer_name ?? quote.customer_email}</strong> (${quote.customer_email}) souhaite un point téléphonique. Disponibilités :`,
        sections: [{ lines: [`<strong>${availability}</strong>`] }],
        button: { label: "Choisir un créneau (admin)", href: `${SITE_URL}/admin/devis` },
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
  return { ok: true as const, message: "Disponibilités envoyées ✓" };
}

// L'admin propose directement un (ou plusieurs) créneau(x) au client, qui
// l'accepte, le refuse ou contre-propose depuis son espace (clientRdvResponse).
export async function adminProposeRdv(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  // 1 à 3 créneaux proposés (datetime-local).
  const slots = [1, 2, 3]
    .map((i) => String(formData.get(`slot${i}`) ?? "").trim())
    .filter(Boolean)
    .slice(0, 3);
  if (slots.length === 0) {
    return { ok: false as const, error: "Choisis au moins une date et une heure." };
  }

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_email, customer_name")
    .eq("id", quoteId)
    .single();
  if (!quote) return { ok: false as const, error: "Devis introuvable." };

  // Une nouvelle proposition remplace la précédente si le client n'a pas répondu.
  await supabase
    .from("rdv_requests")
    .update({ status: "refuse" })
    .eq("quote_id", quoteId)
    .eq("origin", "admin")
    .eq("status", "propose");

  const { error } = await supabase.from("rdv_requests").insert(
    slots.map((slot) => ({
      quote_id: quoteId,
      proposed_at: new Date(slot).toISOString(),
      status: "propose" as const,
      origin: "admin" as const,
    }))
  );
  if (error) {
    console.error("[rdv] Erreur insertion proposition admin:", error.message);
    return { ok: false as const, error: "Échec de l'enregistrement. Vérifie que la colonne « origin » de rdv_requests existe (SQL de migration)." };
  }

  // Pastille « contenu non lu » côté client.
  await supabase.from("quotes").update({ has_unread_updates: true }).eq("id", quoteId);

  // E-mail au client : créneaux à accepter, refuser ou déplacer.
  try {
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && quote.customer_email) {
      const { EMAIL_FROM, buildEmailHtml, buildEmailText } = await import("@/lib/emails");
      const slotsFr = slots
        .map((s) =>
          new Date(s).toLocaleString("fr-FR", {
            weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
          })
        )
        .map((s) => `• ${s}`);
      const emailData = {
        title: "Je te propose un RDV téléphonique !",
        intro: `Bonjour ${quote.customer_name ?? ""},<br/><br/>Pour préparer ta soirée, je te propose de t'appeler à l'un de ces moments :`,
        sections: [{ lines: slotsFr }],
        button: {
          label: "Accepter ou proposer un autre moment",
          href: `${SITE_URL}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${quoteId}#rdv`)}`,
        },
        footer:
          "Aucun créneau ne te convient ? Tu peux en proposer un autre depuis ton espace client.",
      };
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: EMAIL_FROM,
        replyTo: process.env.NOTIF_EMAIL,
        to: quote.customer_email,
        subject: "Proposition de RDV téléphonique — Propul'Sound DJ",
        html: buildEmailHtml(emailData),
        text: buildEmailText(emailData),
      });
    }
  } catch (err) {
    console.error("[rdv] Echec e-mail client (proposition):", err);
  }

  revalidatePath("/admin/devis");
  revalidatePath(`/mon-espace/devis/${quoteId}`);
  return { ok: true as const, message: "Proposition envoyée au client ✓" };
}

// Le client répond à une proposition de l'admin : il accepte le créneau,
// refuse tout court, ou refuse ET contre-propose une autre date et heure.
export async function clientRdvResponse(formData: FormData) {
  const { createAuthClient } = await import("@/lib/supabase/server");
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "Non autorisé." };

  const rdvId = String(formData.get("rdv_id") ?? "");
  const decision = String(formData.get("decision") ?? ""); // accepte | refuse
  const counter = String(formData.get("counter_datetime") ?? "").trim();
  if (!rdvId || !["accepte", "refuse"].includes(decision)) {
    return { ok: false as const, error: "Requête invalide." };
  }

  const supabase = createAdminClient();
  const { data: rdv } = await supabase
    .from("rdv_requests")
    .select("id, quote_id, proposed_at")
    .eq("id", rdvId)
    .single();
  if (!rdv) return { ok: false as const, error: "Proposition introuvable." };

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, customer_email, customer_name")
    .eq("id", rdv.quote_id)
    .single();
  if (!quote || quote.customer_email?.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false as const, error: "Non autorisé." };
  }

  if (decision === "accepte") {
    // Le créneau choisi devient le RDV validé ; les autres demandes en
    // attente (toutes origines) sont automatiquement refusées.
    await supabase.from("rdv_requests").update({ status: "valide" }).eq("id", rdvId);
    await supabase
      .from("rdv_requests")
      .update({ status: "refuse" })
      .eq("quote_id", rdv.quote_id)
      .eq("status", "propose");
  } else {
    // Refus : toutes les propositions de l'admin encore en attente.
    await supabase
      .from("rdv_requests")
      .update({ status: "refuse" })
      .eq("quote_id", rdv.quote_id)
      .eq("origin", "admin")
      .eq("status", "propose");
    // Contre-proposition éventuelle : créneau daté choisi par le client, que
    // Maxime confirmera ensuite depuis l'admin (adminRdvDecision).
    if (counter) {
      await supabase.from("rdv_requests").insert({
        quote_id: rdv.quote_id,
        proposed_at: new Date(counter).toISOString(),
        status: "propose",
        origin: "client",
      });
    }
  }

  // Notification admin (push + e-mail).
  const when = rdv.proposed_at
    ? new Date(rdv.proposed_at).toLocaleString("fr-FR", {
        weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
      })
    : "le créneau proposé";
  const counterFr = counter
    ? new Date(counter).toLocaleString("fr-FR", {
        weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
      })
    : null;
  const { notifyAdmin } = await import("@/lib/admin-notify");
  await notifyAdmin({
    title:
      decision === "accepte"
        ? "RDV accepté par le client !"
        : counter
          ? "RDV refusé — contre-proposition reçue"
          : "RDV refusé par le client",
    body:
      decision === "accepte"
        ? `${quote.customer_name ?? quote.customer_email} a accepté l'appel du ${when}.`
        : `${quote.customer_name ?? quote.customer_email} a refusé ${when}${counterFr ? ` et contre-propose : ${counterFr}` : ""}.`,
    url: `/admin/devis?focus=${rdv.quote_id}`,
    email: {
      subject:
        decision === "accepte"
          ? `RDV accepté — ${when}`
          : `RDV refusé${counterFr ? " — contre-proposition" : ""}`,
      html: `<p><strong>${quote.customer_name ?? quote.customer_email}</strong> ${
        decision === "accepte"
          ? `a <strong>accepté</strong> le RDV téléphonique du <strong>${when}</strong>.`
          : `a <strong>refusé</strong> ${when}.${counterFr ? ` Il contre-propose : <strong>${counterFr}</strong>.` : ""}`
      }</p><p><a href="${SITE_URL}/admin/devis?focus=${rdv.quote_id}">Ouvrir le devis dans l'admin</a></p>`,
    },
  });

  // E-mail de confirmation au client quand il accepte (récap du RDV).
  if (decision === "accepte" && quote.customer_email) {
    try {
      const { Resend } = await import("resend");
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const { EMAIL_FROM, buildEmailHtml, buildEmailText } = await import("@/lib/emails");
        const emailData = {
          title: "Ton RDV téléphonique est confirmé !",
          intro: `Bonjour,<br/><br/>C'est confirmé : je t'appelle le <strong>${when}</strong>.<br/><br/>Prépare tes questions, on fait le point sur ta soirée !`,
          sections: [{ lines: ["Ajoute-le à ton calendrier depuis ton espace client."] }],
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
      }
    } catch (err) {
      console.error("[rdv] Echec e-mail client (acceptation):", err);
    }
  }

  revalidatePath("/admin/devis");
  revalidatePath(`/mon-espace/devis/${rdv.quote_id}`);
  return {
    ok: true as const,
    message:
      decision === "accepte"
        ? "RDV confirmé ✓"
        : counter
          ? "Créneaux refusés — ta contre-proposition a été envoyée ✓"
          : "Créneaux refusés ✓",
  };
}

// L'admin modifie (déplace) ou supprime une de ses propositions de RDV.
// Déplacer un créneau déjà accepté le remet en attente de confirmation du
// client ; supprimer un RDV validé l'annule (e-mail au client).
export async function adminEditRdv(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };

  const rdvId = String(formData.get("rdv_id") ?? "");
  const mode = String(formData.get("mode") ?? ""); // modifier | supprimer
  const rdvDatetime = String(formData.get("rdv_datetime") ?? "").trim();
  if (!rdvId || !["modifier", "supprimer"].includes(mode)) {
    return { ok: false as const, error: "Requête invalide." };
  }

  const supabase = createAdminClient();
  const { data: rdv } = await supabase
    .from("rdv_requests")
    .select("id, quote_id, proposed_at, status")
    .eq("id", rdvId)
    .single();
  if (!rdv) return { ok: false as const, error: "Proposition introuvable." };

  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_email, customer_name")
    .eq("id", rdv.quote_id)
    .single();

  const fmtFr = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });
  const revalidate = () => {
    revalidatePath("/admin/devis");
    revalidatePath(`/mon-espace/devis/${rdv.quote_id}`);
  };

  // E-mail client (best effort) via le canal centralisé.
  const emailClient = async (email: {
    subject: string;
    html: string;
  }) => {
    try {
      const { Resend } = await import("resend");
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey && quote?.customer_email) {
        const { EMAIL_FROM } = await import("@/lib/emails");
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: EMAIL_FROM,
          replyTo: process.env.NOTIF_EMAIL,
          to: quote.customer_email,
          ...email,
        });
      }
    } catch (err) {
      console.error("[rdv] Echec e-mail client (modification):", err);
    }
  };

  if (mode === "modifier") {
    if (!rdvDatetime) {
      return { ok: false as const, error: "Choisis d'abord la nouvelle date et l'heure." };
    }
    const wasValide = rdv.status === "valide";
    const whenIso = new Date(rdvDatetime).toISOString();
    // Un créneau déjà accepté repasse en attente : le client doit re-confirmer.
    await supabase
      .from("rdv_requests")
      .update({ proposed_at: whenIso, status: "propose" })
      .eq("id", rdvId);
    const when = fmtFr(whenIso);
    await emailClient({
      subject: wasValide
        ? `Le RDV téléphonique est déplacé — ${when}`
        : `Créneau de RDV mis à jour — ${when}`,
      html: `<p>Bonjour ${quote?.customer_name ?? ""},</p><p>${
        wasValide
          ? `Je dois déplacer notre appel : il n'aura pas lieu au moment prévu, mais <strong>${when}</strong>. Merci de re-confirmer depuis ton espace client.`
          : `Petite mise à jour : je te propose finalement de t'appeler le <strong>${when}</strong> (en remplacement du créneau précédent).`
      }</p><p><a href="${SITE_URL}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${rdv.quote_id}#rdv`)}">Répondre dans mon espace client</a></p><p>— Maxime, Propul'Sound DJ</p>`,
    });
    revalidate();
    return {
      ok: true as const,
      message: wasValide
        ? "RDV déplacé — le client doit re-confirmer ✓"
        : "Créneau modifié ✓",
    };
  }

  // Suppression.
  const wasValide = rdv.status === "valide";
  await supabase.from("rdv_requests").delete().eq("id", rdvId);
  if (wasValide) {
    await emailClient({
      subject: "RDV téléphonique annulé",
      html: `<p>Bonjour ${quote?.customer_name ?? ""},</p><p>Je dois annuler le point téléphonique prévu. Désolé ! Proposons-en un autre : choisis un moment qui t'arrange depuis ton espace client, ou réponds à ce message.</p><p><a href="${SITE_URL}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${rdv.quote_id}#rdv`)}">Ouvrir mon espace client</a></p><p>— Maxime, Propul'Sound DJ</p>`,
    });
  }
  revalidate();
  return {
    ok: true as const,
    message: wasValide ? "RDV annulé — client prévenu ✓" : "Créneau supprimé ✓",
  };
}

// Le client sauvegarde la timeline de sa soirée (horaires cérémonie,
// cocktail, repas, dessert, ouverture de bal…) — stockée en JSON dans quotes.
export async function saveClientTimeline(formData: FormData) {
  const { createAuthClient } = await import("@/lib/supabase/server");
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "Non autorisé." };

  const quoteId = String(formData.get("quote_id") ?? "");
  const raw = String(formData.get("timeline") ?? "[]");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  // Validation légère : tableau de {time, label} avec chaînes courtes.
  let rows: { time: string; label: string }[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("format");
    rows = parsed
      .slice(0, 12)
      .map((r) => ({
        time: String(r?.time ?? "").slice(0, 5),
        label: String(r?.label ?? "").slice(0, 60),
      }))
      .filter((r) => r.label.trim().length > 0);
  } catch {
    return { ok: false as const, error: "Format invalide." };
  }

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_email")
    .eq("id", quoteId)
    .single();
  if (!quote || quote.customer_email?.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false as const, error: "Non autorisé." };
  }

  const { error } = await supabase
    .from("quotes")
    .update({ timeline: rows })
    .eq("id", quoteId);
  if (error) {
    console.error("[timeline] Erreur:", error.message);
    return { ok: false as const, error: "Échec de la sauvegarde. Vérifie que la colonne quotes.timeline existe (SQL)." };
  }

  revalidatePath(`/mon-espace/devis/${quoteId}`);
  revalidatePath("/admin/devis");
  return { ok: true as const, message: "Timeline enregistrée ✓" };
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

// Ouvre une session Stripe Checkout pour régler l'acompte par carte.
// Le client est redirigé vers la page de paiement hébergée par Stripe.
export async function startAcompteCheckout(formData: FormData) {
  const { getStripe, acompteCents } = await import("@/lib/stripe");
  const { createAuthClient: createAuth } = await import("@/lib/supabase/server");

  const auth = await createAuth();
  const {
    data: { user },
  } = await auth.auth.getUser();
  const email = user?.email ?? null;
  if (!email) redirect("/connexion");

  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) redirect("/mon-espace");

  const stripe = getStripe();
  if (!stripe) redirect(`/mon-espace/devis/${quoteId}?paiement=indisponible`);

  const supabase = createAdminClient();
  const { data: quoteRow } = await supabase
    .from("quotes")
    .select("customer_email, total_cents, status, acompte_paid_at, acompte_required, event_date, customer_name")
    .eq("id", quoteId)
    .single();
  const quote = quoteRow ?? null;

  if (
    !quote ||
    quote.customer_email?.toLowerCase() !== email.toLowerCase() ||
    quote.acompte_paid_at ||
    quote.acompte_required === false ||
    (quote.status !== "attente_acompte" && quote.status !== "confirme")
  ) {
    redirect(`/mon-espace/devis/${quoteId}?paiement=indisponible`);
  }

  const amount = acompteCents(quote.total_cents ?? 0);
  if (amount <= 0) redirect(`/mon-espace/devis/${quoteId}?paiement=indisponible`);

  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? h.get("origin") ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amount,
          product_data: {
            name: `Acompte de réservation — DJ`,
            description: `${quote.customer_name ?? ""} — événement du ${quote.event_date ?? "date à définir"}`,
          },
        },
      },
    ],
    metadata: { quote_id: quoteId },
    success_url: `${origin}/mon-espace/devis/${quoteId}?paiement=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/mon-espace/devis/${quoteId}#acompte`,
  });

  if (session.url) redirect(session.url);
  redirect(`/mon-espace/devis/${quoteId}?paiement=erreur`);
}

// Au retour de Stripe : vérifie la session côté serveur et marque l'acompte
// payé si le paiement est confirmé (pas besoin de webhook pour démarrer).
// Notification admin : acompte réglé (push + e-mail) — partagé par le webhook
// Stripe (voir api/stripe/webhook), le retour de paiement et l'échéancier.
async function notifyAcompteRecu(
  supabase: ReturnType<typeof createAdminClient>,
  quoteId: string
) {
  try {
    const { data: quote } = await supabase
      .from("quotes")
      .select("customer_name, total_cents, event_date")
      .eq("id", quoteId)
      .single();
    const name = quote?.customer_name ?? "Le client";
    const total = quote?.total_cents
      ? (quote.total_cents / 100).toFixed(2).replace(".", ",") + " €"
      : "?";
    const dateFr = quote?.event_date ?? "date ?";
    const { notifyAdmin } = await import("@/lib/admin-notify");
    void notifyAdmin({
      title: "Acompte réglé — devis confirmé !",
      body: `${name} — ${dateFr} : acompte reçu (total ${total}). La date est verrouillée.`,
      url: `/admin/devis?focus=${quoteId}`,
      email: {
        subject: `Acompte reçu — ${name} (${dateFr}) — devis confirmé`,
        html: `<p><strong>${name}</strong> (soirée du <strong>${dateFr}</strong>, total <strong>${total}</strong>) vient de régler son <strong>acompte</strong>.</p><p>Le devis est désormais <strong>confirmé</strong> : la date est verrouillée.</p><p><a href="${SITE_URL}/admin/devis?focus=${quoteId}">Ouvrir le devis dans l'admin</a></p>`,
      },
    });
  } catch {
    // best effort
  }
}

export async function verifyStripeAcompte(quoteId: string, sessionId: string): Promise<boolean> {
  const { getStripe } = await import("@/lib/stripe");
  const stripe = getStripe();
  if (!stripe || !quoteId || !sessionId) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (
      session.payment_status !== "paid" ||
      session.metadata?.quote_id !== quoteId ||
      !session.amount_total
    ) {
      return false;
    }
    const supabase = createAdminClient();
    const { data: quote } = await supabase
      .from("quotes")
      .select("acompte_paid_at, status")
      .eq("id", quoteId)
      .single();
    if (!quote || quote.acompte_paid_at) return quote?.acompte_paid_at != null;

    // L'acompte est réglé : réservation entièrement confirmée.
    await supabase
      .from("quotes")
      .update({ acompte_paid_at: new Date().toISOString(), status: "confirme" })
      .eq("id", quoteId);
    void notifyAcompteRecu(supabase, quoteId);

    revalidatePath(`/mon-espace/devis/${quoteId}`);
    revalidatePath("/admin/devis");
    return true;
  } catch {
    return false;
  }
}

// Au retour de Stripe pour une ÉCHÉANCE : vérifie la session côté serveur et
// marque l'échéance payée si confirmée (ceinture + bretelles avec le webhook —
// si le webhook tarde, le retour client fait le travail immédiatement).
export async function verifyStripeEcheance(
  quoteId: string,
  sessionId: string
): Promise<boolean> {
  const { getStripe } = await import("@/lib/stripe");
  const stripe = getStripe();
  if (!stripe || !quoteId || !sessionId) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (
      session.payment_status !== "paid" ||
      session.metadata?.quote_id !== quoteId ||
      session.metadata?.payment_type !== "echeance"
    ) {
      return false;
    }
    const numero = parseInt(session.metadata.payment_numero ?? "0", 10);
    if (!(numero > 0)) return false;

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("payment_schedule")
      .update({ status: "payee", paid_at: new Date().toISOString() })
      .eq("quote_id", quoteId)
      .eq("numero", numero)
      .eq("status", "a_payer");
    if (error) return false;

    // Cohérence devis : la 1ʳᵉ échéance couvre l'acompte (jamais sur un
    // échéancier de solde — l'acompte est déjà payé dans ce cas).
    if (numero === 1) {
      const { data: quote } = await supabase
        .from("quotes")
        .select("acompte_paid_at, status")
        .eq("id", quoteId)
        .single();
      if (quote && !quote.acompte_paid_at && !["refuse", "annule"].includes(quote.status ?? "")) {
        await supabase
          .from("quotes")
          .update({ acompte_paid_at: new Date().toISOString(), status: "confirme" })
          .eq("id", quoteId);
        void notifyAcompteRecu(supabase, quoteId);
      }
    }
    revalidatePath(`/mon-espace/devis/${quoteId}`);
    revalidatePath("/admin/devis");
    return true;
  } catch {
    return false;
  }
}

// ---------- Solde : sur place ou réglé en ligne ----------

// Solde restant d'un devis (mêmes règles que le tableau de bord : marqueurs
// [[acompte:]], [[solde-montant:]], flag acompte_required).
function soldeRestantDe(quote: {
  total_cents?: number | null;
  notes?: string | null;
  acompte_paid_at?: string | null;
  acompte_required?: boolean | null;
}): number {
  const notes = String(quote.notes ?? "");
  const fixe = /\[\[solde-montant:(\d+)\]\]/.exec(notes);
  if (fixe) return Number(fixe[1]);
  const total = Number(quote.total_cents ?? 0);
  const marker = /\[\[acompte:(\d+)\]\]/.exec(notes);
  if (marker) return Math.max(0, total - Number(marker[1]));
  if (
    notes.includes("[[facture-libre]]") ||
    notes.includes("[[import-avant-site]]") ||
    quote.acompte_required === false ||
    !quote.acompte_paid_at
  ) {
    return total;
  }
  return Math.max(0, total - Math.floor((total * 0.008) / 10) * 1000);
}

// Le client choisit de régler le solde SUR PLACE le jour de la soirée
// (espèces, chèque ou virement). Le solde restera à encaisser manuellement :
// l'admin le validera après la soirée (bouton « Valider le solde »).
export async function chooseSoldeSurPlace(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  const modeRaw = String(formData.get("mode") ?? "");
  const modes: Record<string, string> = {
    especes: "en espèces",
    cheque: "par chèque",
    virement: "par virement",
  };
  if (!quoteId || !(modeRaw in modes)) {
    return { ok: false as const, error: "Choix invalide." };
  }
  const { user, quote } = await getOwnedQuote(quoteId);
  if (!user || !quote) return { ok: false as const, error: "Devis introuvable." };

  const supabase = createAdminClient();
  const { data: sched } = await supabase
    .from("payment_schedule")
    .select("id, status")
    .eq("quote_id", quoteId)
    .limit(1);
  const solde = soldeRestantDe(quote);
  if (
    (sched ?? []).some((s) => s.status === "a_payer") ||
    /\[\[solde-en-ligne:/.test(String(quote.notes ?? ""))
  ) {
    return {
      ok: false as const,
      error: "Le solde est déjà géré autrement (échéancier ou paiement en ligne).",
    };
  }
  if (solde <= 0) return { ok: false as const, error: "Il n'y a plus de solde à régler." };

  let notes = String(quote.notes ?? "").replace(/\[\[solde-sur-place:[a-z]+\]\]\s*/g, "");
  notes = `[[solde-sur-place:${modeRaw}]]\n${notes}`;
  const { error } = await supabase.from("quotes").update({ notes }).eq("id", quoteId);
  if (error) return { ok: false as const, error: "Enregistrement impossible." };

  // Notification admin (push + e-mail) : le client paiera sur place.
  try {
    const dateFr = quote.event_date ?? "date à définir";
    const { notifyAdmin } = await import("@/lib/admin-notify");
    void notifyAdmin({
      title: "Solde à encaisser sur place",
      body: `${quote.customer_name} paiera le solde ${modes[modeRaw]} le jour de la soirée (${dateFr}).`,
      url: `/admin/devis?focus=${quoteId}`,
      email: {
        subject: `Solde sur place — ${quote.customer_name} (${dateFr})`,
        html: `<p><strong>${quote.customer_name}</strong> (soirée du <strong>${dateFr}</strong>) choisit de régler le solde <strong>${modes[modeRaw]}</strong> le jour de la prestation.</p><p>Pense à valider le solde dans le tableau de bord après la soirée pour le compter dans l'URSSAF.</p><p><a href="${SITE_URL}/admin/devis?focus=${quoteId}">Ouvrir le devis dans l'admin</a></p>`,
      },
    });
  } catch {
    // best effort
  }

  revalidatePath(`/mon-espace/devis/${quoteId}`);
  revalidatePath("/admin/devis");
  return {
    ok: true as const,
    message: `Noté : tu règleras le solde ${modes[modeRaw]} le jour de la soirée ✓`,
  };
}

// Le client change d'avis : il réglera le solde ici (carte ou virement).
export async function chooseSoldeEnLigne(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };
  const { user, quote } = await getOwnedQuote(quoteId);
  if (!user || !quote) return { ok: false as const, error: "Devis introuvable." };

  const supabase = createAdminClient();
  const notes = String(quote.notes ?? "").replace(/\[\[solde-sur-place:[a-z]+\]\]\s*/g, "");
  const { error } = await supabase.from("quotes").update({ notes }).eq("id", quoteId);
  if (error) return { ok: false as const, error: "Enregistrement impossible." };

  revalidatePath(`/mon-espace/devis/${quoteId}`);
  revalidatePath("/admin/devis");
  return { ok: true as const, message: "Bien noté — tu pourras régler le solde ici ✓" };
}

// Le client déclare avoir envoyé le SOLDE par virement (paiement ici).
// L'admin confirme à réception → le solde part dans le CA URSSAF du mois.
export async function declareSoldeSent(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };
  const { user, quote } = await getOwnedQuote(quoteId);
  if (!user || !quote) return { ok: false as const, error: "Devis introuvable." };

  const notes = String(quote.notes ?? "");
  if (/\[\[solde-en-ligne:/.test(notes)) {
    return { ok: true as const, message: "Solde déjà réglé ✓" };
  }
  if (/\[\[solde-declare:/.test(notes)) {
    return { ok: true as const, message: "Déclaration déjà envoyée ✓" };
  }

  const supabase = createAdminClient();
  const newNotes = `[[solde-declare:${new Date().toLocaleDateString("fr-CA")}]]\n${notes}`;
  const { error } = await supabase.from("quotes").update({ notes: newNotes }).eq("id", quoteId);
  if (error) return { ok: false as const, error: "Enregistrement impossible." };

  // Notification admin : le client dit avoir envoyé le solde.
  try {
    const dateFr = quote.event_date ?? "date à définir";
    const solde = soldeRestantDe(quote);
    const { notifyAdmin } = await import("@/lib/admin-notify");
    void notifyAdmin({
      title: "Solde envoyé par le client (virement)",
      body: `${quote.customer_name} déclare avoir envoyé le solde (${(solde / 100).toFixed(2).replace(".", ",")} €) — à confirmer à réception.`,
      url: `/admin?vue=solde`,
      email: {
        subject: `Solde envoyé — ${quote.customer_name} (${dateFr}) — à confirmer`,
        html: `<p><strong>${quote.customer_name}</strong> (soirée du <strong>${dateFr}</strong>) déclare avoir envoyé le <strong>solde</strong> par virement (${(solde / 100).toFixed(2).replace(".", ",")} €).</p><p>Vérifie ton compte, puis confirme dans le tableau de bord (« Paiements reçus à confirmer ») pour le compter dans l'URSSAF.</p><p><a href="${SITE_URL}/admin?vue=solde">Ouvrir le tableau de bord</a></p>`,
      },
    });
  } catch (err) {
    console.error("[solde] Echec notification admin:", err);
  }

  revalidatePath(`/mon-espace/devis/${quoteId}`);
  revalidatePath("/admin");
  console.log(`[solde] Le client a déclaré avoir envoyé le solde du devis ${quoteId}`);
  return { ok: true as const, message: "Merci ! En attente de réception du virement ✓" };
}

// L'admin confirme la réception du solde (virement déclaré ou reçu à la main).
// Pose [[solde-en-ligne:date]] + [[solde-en-ligne-net:centimes]] : le solde
// part AUTOMATIQUEMENT dans le CA URSSAF du mois de réception.
export async function confirmSoldeReceived(formData: FormData) {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };
  const quoteId = String(formData.get("id") ?? "").trim();
  if (!quoteId) return { ok: false as const, error: "Soirée introuvable." };

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("notes, total_cents, acompte_paid_at, acompte_required, customer_name")
    .eq("id", quoteId)
    .maybeSingle();
  if (!quote) return { ok: false as const, error: "Soirée introuvable." };

  const notes = String(quote.notes ?? "");
  if (/\[\[solde-en-ligne:/.test(notes)) {
    return { ok: true as const, message: "Solde déjà compté ✓" };
  }
  const solde = soldeRestantDe(quote);
  const today = new Date().toLocaleDateString("fr-CA");
  let newNotes = notes.replace(/\[\[solde-declare:[^\]]*\]\]\s*/g, "");
  newNotes = `[[solde-en-ligne-net:${solde}]]\n[[solde-en-ligne:${today}]]\n${newNotes}`;

  const { error } = await supabase.from("quotes").update({ notes: newNotes }).eq("id", quoteId);
  if (error) return { ok: false as const, error: "Opération impossible." };

  revalidatePath("/admin");
  revalidatePath("/admin/devis");
  return {
    ok: true as const,
    message: `Solde reçu pour « ${quote.customer_name} » — compté dans l'URSSAF ✓`,
  };
}

// Checkout Stripe pour régler le SOLDE par carte (metadata payment_type=solde).
export async function startSoldeCheckout(formData: FormData) {
  const { getStripe } = await import("@/lib/stripe");
  const { createAuthClient: createAuth } = await import("@/lib/supabase/server");

  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) redirect("/mon-espace");
  const auth = await createAuth();
  const {
    data: { user },
  } = await auth.auth.getUser();
  const email = user?.email ?? "";
  if (!email) redirect("/connexion");

  const stripe = getStripe();
  if (!stripe) redirect(`/mon-espace/devis/${quoteId}?paiement=indisponible`);

  const supabase = createAdminClient();
  const { data: quoteRow } = await supabase
    .from("quotes")
    .select("customer_email, total_cents, status, notes, acompte_paid_at, acompte_required, event_date, customer_name")
    .eq("id", quoteId)
    .single();
  const quote = quoteRow ?? null;

  if (
    !quote ||
    quote.customer_email?.toLowerCase() !== email.toLowerCase() ||
    /\[\[solde-en-ligne:/.test(String(quote.notes ?? "")) ||
    (quote.status !== "attente_acompte" && quote.status !== "confirme")
  ) {
    redirect(`/mon-espace/devis/${quoteId}?paiement=indisponible`);
  }

  // Pas de solde payable ici si un échéancier est en cours (il le couvre).
  const { data: sched } = await supabase
    .from("payment_schedule")
    .select("id, status")
    .eq("quote_id", quoteId)
    .limit(1);
  if ((sched ?? []).some((s) => s.status === "a_payer")) {
    redirect(`/mon-espace/devis/${quoteId}?paiement=indisponible`);
  }

  const amount = soldeRestantDe(quote);
  if (amount <= 0) redirect(`/mon-espace/devis/${quoteId}?paiement=indisponible`);

  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? h.get("origin") ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amount,
          product_data: {
            name: `Solde — prestation DJ`,
            description: `${quote.customer_name ?? ""} — événement du ${quote.event_date ?? "date à définir"}`,
          },
        },
      },
    ],
    metadata: { quote_id: quoteId, payment_type: "solde" },
    success_url: `${origin}/mon-espace/devis/${quoteId}?paiement=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/mon-espace/devis/${quoteId}#paiement`,
  });

  if (session.url) redirect(session.url);
  redirect(`/mon-espace/devis/${quoteId}?paiement=erreur`);
}

// Notification admin : solde réglé en ligne (webhook carte, retour Stripe ou
// virement confirmé).
async function notifySoldeRecu(
  supabase: ReturnType<typeof createAdminClient>,
  quoteId: string,
  source: string
) {
  try {
    const { data: quote } = await supabase
      .from("quotes")
      .select("customer_name, total_cents, event_date, notes")
      .eq("id", quoteId)
      .single();
    const name = quote?.customer_name ?? "Le client";
    const net = /\[\[solde-en-ligne-net:(\d+)\]\]/.exec(String(quote?.notes ?? ""));
    const montant = net ? (Number(net[1]) / 100).toFixed(2).replace(".", ",") + " €" : "?";
    const dateFr = quote?.event_date ?? "date ?";
    const { notifyAdmin } = await import("@/lib/admin-notify");
    void notifyAdmin({
      title: "Solde réglé — compté dans l'URSSAF !",
      body: `${name} — ${dateFr} : solde reçu ${source}, net ${montant}.`,
      url: `/admin?vue=urssaf`,
      email: {
        subject: `Solde reçu — ${name} (${dateFr})`,
        html: `<p><strong>${name}</strong> (soirée du <strong>${dateFr}</strong>) a réglé son <strong>solde</strong> ${source} — net ${montant}.</p><p>Il est compté automatiquement dans le <strong>CA URSSAF</strong> du mois de réception.</p><p><a href="${SITE_URL}/admin">Ouvrir le tableau de bord</a></p>`,
      },
    });
  } catch {
    // best effort
  }
}

// Marque le solde comme reçu (marqueurs URSSAF) — partagé par le webhook
// Stripe (carte), le retour de paiement et la confirmation du virement.
async function marquerSoldeRecu(
  supabase: ReturnType<typeof createAdminClient>,
  quoteId: string,
  net: number,
  source: string
): Promise<boolean> {
  const { data: quote } = await supabase
    .from("quotes")
    .select("notes")
    .eq("id", quoteId)
    .single();
  if (!quote) return false;
  const notes = String(quote.notes ?? "");
  if (/\[\[solde-en-ligne:/.test(notes)) return true; // idempotent

  const today = new Date().toLocaleDateString("fr-CA");
  let newNotes = notes.replace(/\[\[solde-declare:[^\]]*\]\]\s*/g, "");
  newNotes = `[[solde-en-ligne-net:${net}]]\n[[solde-en-ligne:${today}]]\n${newNotes}`;
  const { error } = await supabase.from("quotes").update({ notes: newNotes }).eq("id", quoteId);
  if (error) return false;
  void notifySoldeRecu(supabase, quoteId, source);
  return true;
}

// Au retour de Stripe pour le SOLDE : vérifie la session et marque le solde
// reçu si le paiement est confirmé (compte immédiat, même si le webhook tarde).
export async function verifyStripeSolde(quoteId: string, sessionId: string): Promise<boolean> {
  const { getStripe } = await import("@/lib/stripe");
  const stripe = getStripe();
  if (!stripe || !quoteId || !sessionId) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (
      session.payment_status !== "paid" ||
      session.metadata?.quote_id !== quoteId ||
      session.metadata?.payment_type !== "solde" ||
      !session.amount_total
    ) {
      return false;
    }
    const supabase = createAdminClient();
    const { data: quote } = await supabase
      .from("quotes")
      .select("notes")
      .eq("id", quoteId)
      .single();
    if (!quote) return false;
    if (/\[\[solde-en-ligne:/.test(String(quote.notes ?? ""))) return true;

    // Net encaissé : frais Stripe réels si disponibles, sinon estimation
    // standard (carte européenne : 1,5 % + 0,25 €) — comme le webhook.
    let net = session.amount_total - Math.round(session.amount_total * 0.015 + 25);
    try {
      const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
        expand: ["latest_charge.balance_transaction"],
      });
      const charge = pi.latest_charge as
        | { balance_transaction?: { fee?: number; status?: string } | null }
        | null;
      const bt = charge?.balance_transaction;
      if (bt && typeof bt.fee === "number" && bt.status !== "pending") {
        net = session.amount_total - bt.fee;
      }
    } catch {
      // estimation conservée
    }
    const ok = await marquerSoldeRecu(supabase, quoteId, net, "par carte");
    revalidatePath(`/mon-espace/devis/${quoteId}`);
    revalidatePath("/admin");
    return ok;
  } catch {
    return false;
  }
}
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

  // Propriétaire du devis (pour la clé user_id) — cache mémoire.
  const { data: quote } = await supabase
    .from("quotes")
    .select("customer_email, status")
    .eq("id", quoteId)
    .single();
  const ownerUserId = await findOwnerUserId(supabase, quote?.customer_email, quoteId);

  await supabase.from("quote_files").insert({
    quote_id: quoteId,
    user_id: ownerUserId ?? crypto.randomUUID(),
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

  // Pastille nouveautés côté admin + notification push.
  await supabase.from("quotes").update({ has_unread_updates: true }).eq("id", quoteId);
  const { notifyAdminPush } = await import("@/lib/push");
  void notifyAdminPush({
    title: "Nouveau fichier client",
    body: `${quote.customer_name ?? user.email} a envoyé « ${file.name} »`,
    url: `/admin/devis?focus=${quoteId}`,
  });

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

// Extrait de 30 s d'un titre (API iTunes, gratuite et légale) — utilisé par
// les boutons d'écoute du blog "Playlist de mariage". Action publique.
export async function getMusicPreviewUrl(title: string, artist: string) {
  const t = title.trim();
  const a = artist.trim();
  if (!t) return { ok: false as const, error: "Titre manquant." };
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${a} ${t}`)}&media=music&entity=song&limit=5&country=FR`,
      { cache: "no-store" }
    );
    if (!res.ok) return { ok: false as const, error: "Recherche impossible." };
    const json = (await res.json()) as {
      results?: { trackName?: string; artistName?: string; previewUrl?: string }[];
    };
    const tLower = t.toLowerCase();
    const aLower = a.toLowerCase();
    // Meilleure correspondance : titre ET artiste contenus dans le résultat.
    const match =
      (json.results ?? []).find(
        (r) =>
          r.previewUrl &&
          r.trackName?.toLowerCase().includes(tLower) &&
          (!a || r.artistName?.toLowerCase().includes(aLower))
      ) ??
      (json.results ?? []).find((r) => r.previewUrl);
    if (!match?.previewUrl) {
      return { ok: false as const, error: "Extrait introuvable pour ce titre." };
    }
    return { ok: true as const, previewUrl: match.previewUrl };
  } catch {
    return { ok: false as const, error: "Recherche impossible." };
  }
}

// Création de l'échéancier de paiement (2 à 10 fois) : montants ajustés
// pour couvrir les frais Stripe (1,5 % + 0,25 €/paiement), échéances
// réparties entre aujourd'hui et la veille de la soirée.
export async function creerEcheancier(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "").trim();
  const nombre = Math.round(Number(formData.get("nombre") ?? 0));
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };
  if (!(nombre >= 2 && nombre <= 10)) {
    return { ok: false as const, error: "Le nombre d'échéances doit être entre 2 et 10." };
  }

  const { user } = await getOwnedQuote(quoteId);
  if (!user) return { ok: false as const, error: "Non autorisé." };

  // Planchers revalidés côté serveur : 150 € min par échéance, x4+ seulement
  // à partir de 1 000 € (cf. installments.ts — règle unique partagée).
  const { niveauxDisponibles } = await import("@/lib/installments");

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("total_cents, event_date, acompte_paid_at, acompte_required")
    .eq("id", quoteId)
    .maybeSingle();
  if (!quote) return { ok: false as const, error: "Devis introuvable." };

  const total_cents = Number(quote.total_cents ?? 0);
  if (total_cents <= 0) return { ok: false as const, error: "Montant invalide." };
  if (!quote.event_date) {
    return { ok: false as const, error: "Ce devis n'a pas de date d'événement." };
  }

  // Même règle que l'acompte : le paiement n'est possible qu'une fois les
  // documents signés (attente_acompte) ou le devis confirmé. Jamais avant.
  const { data: statut } = await supabase
    .from("quotes")
    .select("status")
    .eq("id", quoteId)
    .single();
  if (!["attente_acompte", "confirme"].includes(statut?.status ?? "")) {
    return {
      ok: false as const,
      error: "Le paiement est possible après la signature des documents.",
    };
  }

  // Vérifie qu'aucune échéance n'est déjà payée (sinon : pas de recréation).
  const { data: existing } = await supabase
    .from("payment_schedule")
    .select("id, status")
    .eq("quote_id", quoteId);
  if ((existing ?? []).some((row) => row.status === "payee")) {
    return { ok: false as const, error: "Un échéancier avec paiement déjà effectué existe." };
  }

  // Jours restants avant la soirée (les échéances s'arrêtent 2 jours avant).
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const event = new Date(`${quote.event_date}T12:00:00`);
  const daysUntil = Math.floor((event.getTime() - today.getTime()) / 86400_000) - 2;
  if (daysUntil < 10) {
    return {
      ok: false as const,
      error: `Il ne reste que ${daysUntil + 2} jours avant la soirée : trop court pour un échéancier.`,
    };
  }

  // Montant de l'acompte (20 % du total, même règle que le devis PDF :
  // le solde est arrondi à la dizaine inférieure). Aucun acompte quand
  // l'admin l'a désactivé pour ce devis.
  const soldeStandard = Math.floor((total_cents * 0.008) / 10) * 1000;
  const acompte =
    quote.acompte_required === false ? 0 : Math.max(0, total_cents - soldeStandard);

  // Planchers revalidés avec le vrai total : le format demandé doit faire
  // partie des niveaux disponibles (150 € min/échéance, x4+ dès 1 000 €).
  const baseEcheancier = Boolean(quote.acompte_paid_at)
    ? Math.max(0, total_cents - acompte)
    : total_cents;
  if (!niveauxDisponibles(baseEcheancier).includes(nombre)) {
    return {
      ok: false as const,
      error: "Ce format n'est pas disponible pour ce montant (minimum 150 € par échéance ; x4 et plus à partir de 1 000 €).",
    };
  }

  // Frais Stripe (1,5 % + 0,25 €/paiement) répercutés au client.
  const avecFrais = (base: number) => Math.ceil((base + 25) / 0.985);

  // Acompte déjà réglé (par carte ou virement) ? L'échéancier porte alors
  // sur le SOLDE uniquement — on ne repasse jamais l'acompte.
  const acompteDejaPaye = Boolean(quote.acompte_paid_at);
  let firstAmount: number;
  let restAmount: number;
  if (acompteDejaPaye) {
    const solde = Math.max(0, total_cents - acompte);
    firstAmount = avecFrais(Math.ceil(solde / nombre));
    restAmount = firstAmount;
  } else {
    // Règle : la 1ʳᵉ échéance doit couvrir AU MINIMUM l'acompte (la date est
    // sécurisée dès le 1ᵉʳ paiement). Si une répartition égale donne des parts
    // PLUS GROSSES que l'acompte, on garde un échéancier réparti harmonieux
    // (ex. 2× = moitié + moitié) au lieu de forcer une petite 1ʳᵉ échéance.
    const partEgale = Math.floor(total_cents / nombre);
    const harmonieux = partEgale >= acompte;

    firstAmount = harmonieux ? avecFrais(partEgale) : avecFrais(acompte);
    restAmount =
      nombre > 1
        ? harmonieux
          ? avecFrais(Math.ceil((total_cents - partEgale) / (nombre - 1)))
          : avecFrais(Math.ceil((total_cents - acompte) / (nombre - 1)))
        : 0;
  }

  // Remplace l'échéancier existant (non payé) par le nouveau.
  await supabase.from("payment_schedule").delete().eq("quote_id", quoteId);

  // Échéance 1 due sous 3 jours (paiement immédiat attendu) ; les suivantes
  // sont espacées régulièrement jusqu'à 2 jours avant la soirée.
  const firstDue = new Date(today.getTime() + 3 * 86400_000);
  const spanDays = Math.max(7, daysUntil - 3);
  const step = Math.floor(spanDays / Math.max(1, nombre - 1));

  const rows = Array.from({ length: nombre }, (_, i) => {
    const due = new Date(firstDue.getTime() + i * step * 86400_000);
    return {
      quote_id: quoteId,
      user_id: user.id,
      numero: i + 1,
      total: nombre,
      amount_cents: i === 0 ? firstAmount : restAmount,
      due_date: due.toISOString().slice(0, 10),
    };
  });
  const { error } = await supabase.from("payment_schedule").insert(rows);
  if (error) {
    console.error("Création échéancier impossible", error);
    return { ok: false as const, error: "Création de l'échéancier impossible." };
  }

  return {
    ok: true as const,
    message: acompteDejaPaye
      ? `Échéancier du solde créé : ${nombre} × ${eur(firstAmount)}`
      : acompte === 0
        ? `Échéancier créé : ${nombre} × ${eur(firstAmount)}`
        : `Échéancier créé : ${eur(firstAmount)} (acompte) puis ${nombre - 1} × ${eur(restAmount)}`,
  };
}

// Annule un échéancier tant qu'aucune échéance n'est payée : le client
// garde le droit de marche arrière et peut revenir au paiement classique.
export async function annulerEcheancier(formData: FormData) {
  const quoteId = String(formData.get("quote_id") ?? "").trim();
  if (!quoteId) return { ok: false as const, error: "Devis introuvable." };

  const { user } = await getOwnedQuote(quoteId);
  if (!user) return { ok: false as const, error: "Non autorisé." };

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("payment_schedule")
    .select("id, status")
    .eq("quote_id", quoteId);
  if ((rows ?? []).some((row) => row.status === "payee")) {
    return { ok: false as const, error: "Impossible : une échéance est déjà réglée." };
  }

  const { error } = await supabase.from("payment_schedule").delete().eq("quote_id", quoteId);
  if (error) return { ok: false as const, error: "Annulation impossible." };
  return { ok: true as const, message: "Échéancier annulé — vous pouvez choisir un autre mode de paiement." };
}

function eur(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}


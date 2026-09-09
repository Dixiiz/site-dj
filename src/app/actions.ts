"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { clearAdminSession, isAdmin, setAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateTravelFromAddress } from "@/lib/travel";
import { EXTRA_HOUR_RATE_CENTS } from "@/lib/booking-rules";
import { ADMIN_FX_OPTIONS } from "@/components/pricing-section";
import { formatEuros } from "@/lib/money";
import { SITE_URL } from "@/lib/site-url";
import { EMAIL_FROM } from "@/lib/emails";

function formatPrice(cents: number) {
  return formatEuros(cents);
}

import type { SelectedOption } from "@/lib/types";
import { Resend } from "resend";

const NOTIF_EMAIL = process.env.NOTIF_EMAIL ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";

async function sendQuoteNotification(
  subject: string,
  emailData: Parameters<typeof import("@/lib/emails").buildEmailHtml>[0]
) {
  if (!NOTIF_EMAIL || !RESEND_API_KEY) return;
  try {
    const resend = new Resend(RESEND_API_KEY);
    const { buildEmailHtml, buildEmailText } = await import("@/lib/emails");
    await resend.emails.send({
      from: EMAIL_FROM,
      replyTo: NOTIF_EMAIL,
      to: NOTIF_EMAIL,
      subject,
      html: buildEmailHtml(emailData),
      text: buildEmailText(emailData),
    });
  } catch (err) {
    console.error("[notif] Echec envoi e-mail:", err);
  }
}

// Échappement HTML pour les contenus saisis par le client.
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function estimateTravelFee(formData: FormData) {
  // L'adresse complète (champ caché rempli via les suggestions) prime sur le
  // nom seul affiché dans le champ, pour un géocodage précis.
  const address = String(
    formData.get("event_location_full") ?? formData.get("event_location") ?? ""
  ).trim();
  return estimateTravelFromAddress(address);
}

// Suggestions d'adresses pour le formulaire : Google Places Autocomplete (New)
// en priorité (optimisé pour la frappe, plus rapide et moins cher), avec repli
// sur Google Text Search puis OpenStreetMap Nominatim si indisponible.
export async function searchAddresses(query: string) {
  const q = query.trim();
  if (q.length < 2)
    return { ok: true as const, results: [] as string[], subtitles: [] as string[], details: [] as string[], placeIds: [] as string[] };

  // 1) Google Places (New) — Autocomplete : conçu pour la saisie en cours,
  // réponses bien plus rapides que la Text Search.
  const key = process.env.GOOGLE_PLACES_API_KEY ?? "";
  if (key) {
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat",
        },
        body: JSON.stringify({
          input: q,
          languageCode: "fr",
          regionCode: "FR",
          includedPrimaryTypes: ["geocode"],
          // Restriction stricte à la France métropolitaine (regionCode seul
          // ne fait qu'influencer, des lieux étrangers pouvaient apparaître).
          locationRestriction: {
            rectangle: {
              low: { latitude: 41.0, longitude: -5.5 },
              high: { latitude: 51.5, longitude: 9.8 },
            },
          },
        }),
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          suggestions?: {
            placePrediction?: {
              placeId?: string;
              text?: { text?: string };
              structuredFormat?: {
                mainText?: { text?: string };
                secondaryText?: { text?: string };
              };
            };
          }[];
        };
        const entries = (data.suggestions ?? [])
          .map((s) => {
            const prediction = s.placePrediction;
            return {
              // Nom seul dans la suggestion (ex : "Place du Château").
              label: prediction?.structuredFormat?.mainText?.text || prediction?.text?.text || "",
              // Ville / contexte (ex : "Blois") affiché en petit dessous.
              subtitle: prediction?.structuredFormat?.secondaryText?.text ?? "",
              // Texte complet (ex : "Place du Château, Blois") pour le calcul.
              detail: prediction?.text?.text ?? "",
              placeId: prediction?.placeId ?? "",
            };
          })
          .filter((entry) => entry.label.length > 0)
          // Le rectangle géographique seul laisse passer des lieux proches
          // mais étrangers (ouest de l'Allemagne, Belgique...) : filtre par nom
          // de pays présent dans le texte des suggestions étrangères.
          .filter((entry) => {
            const text = `${entry.subtitle} ${entry.detail}`;
            return !/\b(Allemagne|Espagne|Belgique|Suisse|Italie|Luxembourg|Pays-Bas|Autriche|Royaume-Uni|Portugal|Angleterre|Écosse|Grande-Bretagne)\b/.test(
              text
            );
          })
          .slice(0, 5);
        if (entries.length > 0)
          return {
            ok: true as const,
            results: entries.map((e) => e.label),
            subtitles: entries.map((e) => e.subtitle),
            details: entries.map((e) => e.detail),
            placeIds: entries.map((e) => e.placeId),
          };
      }
    } catch {
      // Repli ci-dessous.
    }
  }

  // 2) Repli : Google Places (New) — Text Search (ancien comportement),
  // trouve aussi les domaines/lieux (pas que les adresses).
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
      if (results.length > 0)
        return { ok: true as const, results, subtitles: [] as string[], details: results, placeIds: [] };
    }
  } catch {
    // Repli ci-dessous.
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
    if (!res.ok)
      return { ok: true as const, results: [], subtitles: [], details: [], placeIds: [] };
    const data = (await res.json()) as { display_name?: string }[];
    const fallbackResults = data
      .map((item) => item.display_name ?? "")
      .filter((label) => label.length > 0)
      .slice(0, 5);
    return {
      ok: true as const,
      results: fallbackResults,
      subtitles: [] as string[],
      details: fallbackResults,
      placeIds: [],
    };
  } catch {
    return { ok: true as const, results: [], subtitles: [], details: [], placeIds: [] };
  }
}

// Récupère l'adresse postale complète (avec code postal) d'un lieu Google
// à partir de son placeId — appelé une seule fois, à la sélection.
// Repli : Nominatim (gratuit) si Google est indisponible.
export async function getPlaceAddress(placeId: string, fallbackQuery?: string) {
  const key = process.env.GOOGLE_PLACES_API_KEY ?? "";
  if (key && placeId) {
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
        {
          headers: {
            "X-Goog-Api-Key": key,
            // addressComponents : pour extraire proprement CP et ville.
            "X-Goog-FieldMask": "formattedAddress,addressComponents",
          },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          formattedAddress?: string;
          addressComponents?: { longText?: string; types?: string[] }[];
        };
        let postalCode = "";
        let city = "";
        for (const component of data.addressComponents ?? []) {
          const types = component.types ?? [];
          if (!postalCode && types.includes("postal_code")) {
            postalCode = component.longText ?? "";
          }
          if (!city && types.includes("locality")) {
            city = component.longText ?? "";
          }
        }
        const address = data.formattedAddress ?? "";
        if (address) {
          return { ok: true as const, address, postalCode, city };
        }
      }
    } catch {
      // Repli ci-dessous.
    }
  }
  // Repli Nominatim : récupère CP et ville depuis les détails d'adresse.
  if (fallbackQuery) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&addressdetails=1&q=${encodeURIComponent(
        fallbackQuery
      )}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "propulsounddj-site/1.0 (contact@propulsounddj.fr)",
          "Accept-Language": "fr",
        },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          display_name?: string;
          address?: {
            postcode?: string;
            city?: string;
            town?: string;
            village?: string;
          };
        }[];
        const item = data[0];
        if (item?.display_name) {
          const a = item.address ?? {};
          return {
            ok: true as const,
            address: item.display_name,
            postalCode: a.postcode ?? "",
            city: a.city ?? a.town ?? a.village ?? "",
          };
        }
      }
    } catch {
      // Échec total : l'appelant retombera sur le texte de suggestion.
    }
  }
  return { ok: false as const };
}

// Enrichit des suggestions avec code postal + ville (Place Details, champ
// léger). Appelé une fois par recherche, en arrière-plan, pour afficher le
// CP directement dans la liste déroulante.
export async function enrichSuggestions(placeIds: string[]) {
  const key = process.env.GOOGLE_PLACES_API_KEY ?? "";
  if (!key || placeIds.length === 0)
    return { ok: true as const, items: [] as { placeId: string; postalCode: string; city: string }[] };
  try {
    const items = await Promise.all(
      placeIds.map(async (placeId) => {
        try {
          const res = await fetch(
            `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
            {
              headers: {
                "X-Goog-Api-Key": key,
                "X-Goog-FieldMask": "addressComponents",
              },
              cache: "no-store",
            }
          );
          if (!res.ok) return { placeId, postalCode: "", city: "" };
          const data = (await res.json()) as {
            addressComponents?: { longText?: string; types?: string[] }[];
          };
          let postalCode = "";
          let city = "";
          for (const component of data.addressComponents ?? []) {
            const types = component.types ?? [];
            if (!postalCode && types.includes("postal_code")) {
              postalCode = component.longText ?? "";
            }
            if (!city && types.includes("locality")) {
              city = component.longText ?? "";
            }
          }
          return { placeId, postalCode, city };
        } catch {
          return { placeId, postalCode: "", city: "" };
        }
      })
    );
    return { ok: true as const, items };
  } catch {
    return { ok: true as const, items: [] as { placeId: string; postalCode: string; city: string }[] };
  }
}

export async function submitQuoteAndBooking(formData: FormData) {
  const customer_first_name = String(formData.get("customer_first_name") ?? "").trim();
  const customer_last_name = String(formData.get("customer_last_name") ?? "").trim();
  const customer_name = `${customer_first_name} ${customer_last_name}`.trim();
  const spouses = String(formData.get("spouses") ?? "").trim();
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

  // L'adresse complète (via suggestions) prime pour le calcul, le champ
  // affiché peut ne contenir que le nom du lieu.
  const eventLocationFull = String(formData.get("event_location_full") ?? "").trim();
  const travelResult = await estimateTravelFromAddress(eventLocationFull || event_location);
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
    spouses ? `Marié(e)s : ${spouses}` : null,
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
      event_date: event_date || null,
      start_time: start_time || null,
      end_time: end_time || null,
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
    console.error("[submitQuote] Erreur Supabase:", quoteError);
    return { ok: false as const, error: "Impossible d’enregistrer le devis. Réessaie dans un instant." };
  }

  // E-mails (client + admin) envoyés APRÈS la réponse au navigateur :
  // le formulaire s'affiche immédiatement, sans attendre les envois.
  after(async () => {
    try {
      if (customer_email) {
        const { Resend } = await import("resend");
        const { buildEmailHtml, buildEmailText, stepsSection } = await import("@/lib/emails");
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
          const dateFr = event_date
            ? new Date(event_date).toLocaleDateString("fr-FR", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })
            : null;
          const emailData = {
            title: "Nous avons bien reçu votre devis !",
            emoji: "",
            intro: `Bonjour ${customer_name},<br/><br/>Merci pour votre confiance ! Votre demande de devis a bien été enregistrée dans notre système. Vous recevrez très rapidement une réponse de notre part — généralement sous <strong>24 à 48 h</strong>.`,
            sections: [
              {
                title: "Récapitulatif de votre demande",
                lines: [
                  `<strong>Événement :</strong> ${pack_name || formula.name}`,
                  dateFr ? `<strong>Date :</strong> ${dateFr}` : "",
                  `<strong>Horaires :</strong> ${start_time} - ${end_time}`,
                  event_location ? `<strong>Lieu :</strong> ${event_location}` : "",
                  selected.length > 0
                    ? `<strong>Options :</strong> ${selected.map((o) => o.name).join(", ")}`
                    : "",
                  `<strong>Total estimé :</strong> <strong>${formatPrice(total_cents)}</strong>`,
                ].filter(Boolean),
              },
              stepsSection("nouveau"),
            ],
            button: {
              label: "Suivre ma demande dans mon espace client",
              href: `${SITE_URL}/connexion`,
            },
            footer:
 "Ce devis est une estimation : il sera confirmé après notre échange et la signature des documents.",
          };
          const resend = new Resend(apiKey);
          await resend.emails.send({
            from: EMAIL_FROM,
            replyTo: NOTIF_EMAIL,
            to: customer_email,
            subject: "Nous avons bien reçu votre devis — Propul'Sound DJ",
            html: buildEmailHtml(emailData),
            text: buildEmailText(emailData),
          });
        }
      }
    } catch (err) {
      console.error("[notif] Echec e-mail de confirmation client:", err);
    }

    await sendQuoteNotification("Nouveau devis reçu — à traiter", {
      title: "Nouveau devis reçu !",
      emoji: "",
      intro: `Un nouveau devis vient d'être soumis sur le site par <strong>${esc(customer_name)}</strong>.`,
      sections: [
        {
          title: "Détails de la demande",
          lines: [
            `<strong>Client :</strong> ${esc(customer_name)}`,
            `<strong>E-mail :</strong> ${esc(customer_email)}`,
            customer_phone ? `<strong>Téléphone :</strong> ${esc(customer_phone)}` : "",
            spouses ? `<strong>Marié(e)s :</strong> ${esc(spouses)}` : "",
            `<strong>Pack :</strong> ${esc(pack_name || formula.name)} (${formatPrice(packPriceCents)})`,
            `<strong>Date :</strong> ${esc(event_date)}`,
            `<strong>Horaires :</strong> ${esc(start_time)} - ${esc(end_time)}`,
            event_location ? `<strong>Lieu :</strong> ${esc(event_location)}` : "",
            selected.length > 0
              ? `<strong>Options :</strong> ${selected.map((o) => esc(o.name)).join(", ")}`
              : "<strong>Options :</strong> aucune",
            `<strong>Total :</strong> ${formatPrice(total_cents)}`,
            notes ? `<strong>Message :</strong><br/><em>${esc(notes)}</em>` : "",
          ].filter(Boolean),
        },
      ],
      button: { label: "Ouvrir l'admin — Devis", href: `${SITE_URL}/admin/devis` },
      footer: "Pense à qualifier le devis (statut « Contacté ») pour que le suivi soit à jour.",
    });
  });

  redirect(`/merci?nom=${encodeURIComponent(customer_first_name || customer_name)}`);
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
  redirect("/admin");
}

export async function updateQuoteAdmin(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = createAdminClient();

  // Options cochées : "Nom (quantité)" -> sélection avec prix du catalogue FX
  const checkedRaw = String(formData.get("checked_options") ?? "");
  const checkedNames = checkedRaw.split("||").map((n) => n.trim()).filter(Boolean);
  const co2Qty = Math.min(2, Math.max(1, Number(formData.get("co2_qty") ?? 1)));
  const selected: SelectedOption[] = checkedNames.map((name, index) => {
    const fx = ADMIN_FX_OPTIONS.find((f) => f.name === name);
    const qty = /CO2/i.test(name) ? co2Qty : 1;
    return {
      id: `admin-${index}`,
      name: qty > 1 ? `${name} × ${qty}` : name,
      price_cents: fx ? fx.price * qty : 0,
      qty,
    };
  });

  const toCents = (value: FormDataEntryValue | null) => {
    const n = Number.parseFloat(String(value ?? "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  };

  const start_time = String(formData.get("start_time") ?? "").trim() || null;
  const end_time = String(formData.get("end_time") ?? "").trim() || null;

  const { error } = await supabase
    .from("quotes")
    .update({
      customer_name: String(formData.get("customer_name") ?? "").trim(),
      customer_email: String(formData.get("customer_email") ?? "").trim(),
      customer_phone: String(formData.get("customer_phone") ?? "").trim() || null,
      event_location: String(formData.get("event_location") ?? "").trim() || null,
      event_date: String(formData.get("event_date") ?? "").trim() || null,
      start_time,
      end_time,
      notes: String(formData.get("notes") ?? "").trim() || null,
      formula_name:
        String(formData.get("formula_name_hidden") ?? "").trim() ||
        String(formData.get("formula_name") ?? "").trim() ||
 "Pack",
      formula_price_cents: toCents(formData.get("formula_price")),
      travel_distance_km: Number.parseFloat(String(formData.get("travel_distance_km") ?? "")) || null,
      travel_fee_cents: toCents(formData.get("travel_fee")),
      extra_fee_cents: toCents(formData.get("extra_fee")),
      extra_fee_label:
        String(formData.get("extra_fee_label") ?? "").trim() || null,
      total_cents: toCents(formData.get("total")),
      status: String(formData.get("status") ?? "nouveau"),
      selected_options: selected,
    })
    .eq("id", id);

  if (error) {
    redirect(`/admin/devis?erreur=1`);
  }

  revalidatePath("/admin/devis");
  revalidatePath("/disponibilites");
  redirect(`/admin/devis?modifie=1`);
}

// Estimation admin : distance réelle + frais de déplacement + péage estimé
// (TollGuru si TOLLGURU_API_KEY est configurée, sinon péage non calculé).
export async function estimateTravelAdmin(formData: FormData) {
  if (!(await isAdmin())) return { ok: false as const, error: "Accès refusé." };
  const location = String(formData.get("location") ?? "");
  const { estimateTravelWithToll } = await import("@/lib/travel");
  const result = await estimateTravelWithToll(location);
  if (!result.ok) return result;
  return {
    ok: true as const,
    distanceKm: result.estimate.distanceKm,
    travelFeeCents: result.estimate.feeCents,
    tollCents: result.tollCents,
  };
}

export async function getUnavailableDates(): Promise<string[]> {
 "use server";
  const today = new Date().toISOString().slice(0, 10);
  const out = new Set<string>();
  try {
    const supabase = createAdminClient();
    const { data: quotes } = await supabase
      .from("quotes")
      .select("event_date")
      .in("status", ["attente_acompte", "confirme"])
      .gte("event_date", today);
    for (const r of quotes ?? []) {
      if (r.event_date) out.add(String(r.event_date));
    }
    const { data: blocked } = await supabase
      .from("blocked_dates")
      .select("date")
      .gte("date", today);
    for (const r of blocked ?? []) out.add(String(r.date));
  } catch {
    // ignore
  }
  return [...out];
}

export async function toggleBlockedDate(formData: FormData) {
  if (!(await isAdmin())) return;
  const slot_date = String(formData.get("slot_date") ?? "").trim();
  if (!slot_date) return;
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("blocked_dates")
    .select("date")
    .eq("date", slot_date)
    .maybeSingle();
  if (existing) {
    await supabase.from("blocked_dates").delete().eq("date", slot_date);
  } else {
    await supabase.from("blocked_dates").insert({ date: slot_date });
  }
  revalidatePath("/admin/planning");
  revalidatePath("/disponibilites");
}

export async function logoutAdmin() {
 "use server";
  await clearAdminSession();
  redirect("/admin");
}

export async function updateQuoteStatus(formData: FormData) {
  if (!(await isAdmin())) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const allowed = ["nouveau", "contacte", "attente_signature", "attente_acompte", "confirme", "refuse", "annule"];
  if (!id || !allowed.includes(status)) return;
  const supabase = createAdminClient();

  // Notification e-mail au client quand le devis est confirmé.
  if (status === "confirme") {
    const { data: quote } = await supabase
      .from("quotes")
      .select("customer_email, event_date")
      .eq("id", id)
      .single();
    try {
      if (quote?.customer_email) {
        const { Resend } = await import("resend");
        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.NOTIF_EMAIL;
        if (apiKey && from) {
          const resend = new Resend(apiKey);
          const { buildEmailHtml, buildEmailText, stepsSection } = await import("@/lib/emails");
          const dateFr = quote.event_date
            ? new Date(quote.event_date).toLocaleDateString("fr-FR", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })
            : null;
          const emailData = {
            title: "Votre devis est confirmé !",
            emoji: "",
            intro: `Bonjour,<br/><br/>Excellente nouvelle : votre devis${dateFr ? ` pour le <strong>${dateFr}</strong>` : ""} est désormais <strong style="color:${"#219653"};">confirmé</strong> !<br/><br/>La date est bloquée pour vous. Vous pouvez dès maintenant préparer votre soirée.`,
            sections: [
              stepsSection("confirme"),
              {
                title: "Prochaines étapes",
                lines: [
 "Renseignez votre <strong>playlist</strong> (musiques des temps forts + piste de danse)",
 "Retrouvez et téléchargez vos <strong>documents</strong>",
 "Une question ? Écrivez-nous directement depuis votre espace",
                ],
              },
            ],
            button: {
              label: "Ouvrir mon espace client",
              href: `${SITE_URL}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${id}`)}`,
            },
          };
          await resend.emails.send({
            from: EMAIL_FROM,
            replyTo: quote.customer_email,
            to: quote.customer_email,
            subject: "Votre devis est confirmé ! — Propul'Sound DJ",
            html: buildEmailHtml(emailData),
            text: buildEmailText(emailData),
          });
        }
      }
    } catch {
      // best effort
    }
  }

  await supabase.from("quotes").update({ status }).eq("id", id);
  revalidatePath("/admin/devis");
  revalidatePath("/admin/planning");
  revalidatePath("/disponibilites");
}

export async function deleteQuote(formData: FormData) {
  if (!(await isAdmin())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createAdminClient();
  await supabase.from("quote_options").delete().eq("quote_id", id);
  await supabase.from("quotes").delete().eq("id", id);
  revalidatePath("/admin/devis");
  revalidatePath("/admin/planning");
  revalidatePath("/disponibilites");
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

// Supprime une facture libre (PDF dans le storage, dossier factures-libres)
// ainsi que la soirée associée créée lors de la génération.
export async function deleteFreeInvoice(formData: FormData) {
  if (!(await isAdmin())) return { ok: false as const, error: "Non autorisé." };
  const fileName = String(formData.get("file_name") ?? "").trim();
  // Sécurité : on n'accepte qu'un nom de fichier simple, sans chemin.
  if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    return { ok: false as const, error: "Nom de fichier invalide." };
  }
  const invoiceNumber = fileName.match(/F-\d{4}-\d{3}/)?.[0] ?? "";

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from("client-files")
    .remove([`admin/factures-libres/${fileName}`]);
  if (error) {
    console.error("Suppression facture libre impossible", error);
    return { ok: false as const, error: "Suppression impossible." };
  }

  // Supprime aussi la soirée liée (créée automatiquement à la génération).
  if (invoiceNumber) {
    const { data: linked } = await supabase
      .from("quotes")
      .select("id")
      .like("notes", `%[[facture-libre]]%`)
      .like("notes", `%Facture ${invoiceNumber} générée%`);
    for (const quote of linked ?? []) {
      await supabase.from("quotes").delete().eq("id", quote.id);
    }
  }

  revalidatePath("/admin/factures");
  revalidatePath("/admin");
  return { ok: true as const };
}

// Envoie une facture libre par e-mail avec un lien de téléchargement signé.
export async function sendFreeInvoiceEmail(formData: FormData) {
  if (!(await isAdmin())) return { ok: false as const, error: "Non autorisé." };
  const fileName = String(formData.get("file_name") ?? "").trim();
  if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    return { ok: false as const, error: "Nom de fichier invalide." };
  }
  const to = String(formData.get("email") ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return { ok: false as const, error: "Adresse e-mail invalide." };
  }
  if (!RESEND_API_KEY) return { ok: false as const, error: "Envoi d'e-mail non configuré." };

  const supabase = createAdminClient();
  // Lien signé valable 7 jours : le destinataire télécharge le PDF sans compte.
  const { data } = await supabase.storage
    .from("client-files")
    .createSignedUrl(`admin/factures-libres/${fileName}`, 60 * 60 * 24 * 7);
  if (!data?.signedUrl) {
    return { ok: false as const, error: "Création du lien de téléchargement impossible." };
  }

  const invoiceNumber = fileName.match(/F-\d{4}-\d{3}/)?.[0] ?? "";
  const clientName = fileName
    .replace(/\.pdf$/, "")
    .replace(/^F-\d{4}-\d{3}_/, "")
    .replace(/_/g, " ");
  try {
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Facture Propul'Sound DJ ${invoiceNumber}`.trim(),
      html: `<div style="font-family:Arial,sans-serif;color:#1a1a1f;max-width:560px;margin:0 auto;padding:24px;">
        <p>Bonjour,</p>
        <p>Veuillez trouver ci-dessous votre facture <strong>${invoiceNumber}</strong>${clientName ? ` (${clientName})` : ""}.</p>
        <p style="margin:28px 0;">
          <a href="${data.signedUrl}" style="background:#21619A;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Télécharger la facture PDF</a>
        </p>
        <p style="color:#737373;font-size:13px;">Ce lien est valable 7 jours. Si besoin, demandez-nous un nouveau lien.</p>
        <p style="color:#737373;font-size:13px;">À très bientôt,<br/>Maxime — Propul'Sound DJ</p>
      </div>`,
      text: `Bonjour,\n\nVotre facture ${invoiceNumber} est disponible ici (lien valable 7 jours) :\n${data.signedUrl}\n\nÀ très bientôt,\nMaxime — Propul'Sound DJ`,
    });
    return { ok: true as const, message: `Facture envoyée à ${to} ✓` };
  } catch (err) {
    console.error("Envoi facture libre impossible", err);
    return { ok: false as const, error: "Échec de l'envoi de l'e-mail." };
  }
}

// Soirées "gérées" = créées via l'admin (import papier ou facture libre).
// Seules celles-là peuvent être modifiées ou supprimées depuis l'admin.
function isManagedQuote(notes: string | null | undefined) {
  const n = notes ?? "";
  return n.includes("[[import-avant-site]]") || n.includes("[[facture-libre]]");
}

// Modification d'une soirée gérée (date, formule, lieu, montant).
export async function updateManagedQuote(formData: FormData) {
  if (!(await isAdmin())) return { ok: false as const, error: "Non autorisé." };
  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const id = str("id");
  if (!id) return { ok: false as const, error: "Soirée introuvable." };

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, notes")
    .eq("id", id)
    .maybeSingle();
  if (!quote || !isManagedQuote(quote.notes)) {
    return { ok: false as const, error: "Cette soirée n'est pas modifiable (devis client du site)." };
  }

  const event_date = str("event_date");
  const formula_name = str("formula_name");
  if (!event_date || !formula_name) {
    return { ok: false as const, error: "Date et formule sont obligatoires." };
  }
  const totalEuros = parseFloat(str("total").replace(",", "."));
  if (!Number.isFinite(totalEuros) || totalEuros <= 0) {
    return { ok: false as const, error: "Montant invalide." };
  }
  const total_cents = Math.round(totalEuros * 100);

  // Acompte réglé (optionnel) : stocké en notes via [[acompte:centimes]].
  const acompteEuros = parseFloat(str("acompte").replace(",", "."));
  const acompte_cents = Number.isFinite(acompteEuros) && acompteEuros > 0
    ? Math.round(acompteEuros * 100)
    : 0;
  let notes = (quote.notes ?? "").replace(/\[\[acompte:\d+\]\]\s*/g, "");
  if (acompte_cents > 0) {
    notes = `[[acompte:${acompte_cents}]] ${notes}`;
  }

  const { error } = await supabase
    .from("quotes")
    .update({
      event_date,
      formula_name,
      event_location: str("event_location") || null,
      formula_price_cents: total_cents,
      total_cents,
      notes,
    })
    .eq("id", id);
  if (error) {
    console.error("Modification soirée impossible", error);
    return { ok: false as const, error: "Modification impossible." };
  }

  revalidatePath("/admin/import");
  revalidatePath("/admin");
  return { ok: true as const, message: "Soirée mise à jour ✓" };
}

// Suppression d'une soirée gérée (import ou facture libre).
export async function deleteManagedQuote(formData: FormData) {
  if (!(await isAdmin())) return { ok: false as const, error: "Non autorisé." };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false as const, error: "Soirée introuvable." };

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, notes, customer_name")
    .eq("id", id)
    .maybeSingle();
  if (!quote || !isManagedQuote(quote.notes)) {
    return { ok: false as const, error: "Cette soirée n'est pas supprimable (devis client du site)." };
  }

  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) {
    console.error("Suppression soirée impossible", error);
    return { ok: false as const, error: "Suppression impossible." };
  }

  revalidatePath("/admin/import");
  revalidatePath("/admin");
  return { ok: true as const, message: `Soirée « ${quote.customer_name} » supprimée ✓` };
}

// Valide ou annule le solde d'une soirée confirmée (marqueur
// [[solde-valide:date]] dans les notes). Alimente le CA URSSAF du mois.
export async function validerSoldeQuote(formData: FormData) {
  if (!(await isAdmin())) return { ok: false as const, error: "Non autorisé." };
  const id = String(formData.get("id") ?? "").trim();
  const annuler = String(formData.get("annuler") ?? "") === "1";
  if (!id) return { ok: false as const, error: "Soirée introuvable." };

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, notes, customer_name")
    .eq("id", id)
    .maybeSingle();
  if (!quote) return { ok: false as const, error: "Soirée introuvable." };

  let notes = quote.notes ?? "";
  if (annuler) {
    notes = notes.replace(/\[\[solde-valide:[^\]]*\]\]\s*/g, "");
  } else if (!notes.includes("[[solde-valide:")) {
    notes = `[[solde-valide:${new Date().toLocaleDateString("fr-CA")}]]\n${notes}`;
  } else {
    return { ok: true as const, message: "Solde déjà validé." };
  }

  const { error } = await supabase.from("quotes").update({ notes }).eq("id", id);
  if (error) {
    console.error("Validation solde impossible", error);
    return { ok: false as const, error: "Opération impossible." };
  }

  revalidatePath("/admin");
  return {
    ok: true as const,
    message: annuler
      ? `Solde retiré pour « ${quote.customer_name} » ✓`
      : `Solde validé pour « ${quote.customer_name} » ✓`,
  };
}

// Ajout manuel d'une soirée datant d'avant le site (devis papier signé).
// Crée un devis confirmé pour alimenter le CA et le planning.
export async function importPastQuote(formData: FormData) {
  if (!(await isAdmin())) return { ok: false as const, error: "Non autorisé." };

  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const customer_name = str("customer_name");
  const event_date = str("event_date");
  const formula_name = str("formula_name");
  const totalRaw = str("total");

  if (!customer_name || !event_date || !formula_name || !totalRaw) {
    return { ok: false as const, error: "Nom, date, formule et montant sont obligatoires." };
  }
  const totalEuros = parseFloat(totalRaw.replace(",", "."));
  if (!Number.isFinite(totalEuros) || totalEuros <= 0) {
    return { ok: false as const, error: "Montant invalide." };
  }
  const total_cents = Math.round(totalEuros * 100);

  const supabase = createAdminClient();
  const { error } = await supabase.from("quotes").insert({
    customer_name,
    customer_email: str("customer_email") || "non.renseigne@import.local",
    customer_phone: str("customer_phone") || null,
    event_type: str("event_type") || null,
    event_location: str("event_location") || null,
    event_date,
    formula_name,
    formula_price_cents: total_cents,
    total_cents,
    status: "confirme",
    notes: "[[import-avant-site]] Devis papier signé, importé manuellement.",
    // created_at aligné sur la date de l'événement : les imports ne
    // polluent pas les stats « nouveaux devis ce mois-ci ».
    created_at: `${event_date}T12:00:00Z`,
  });
  if (error) {
    console.error("Import soirée impossible", error);
    return { ok: false as const, error: "Enregistrement impossible." };
  }

  revalidatePath("/admin/import");
  revalidatePath("/admin");
  return { ok: true as const, message: `Soirée « ${formula_name} » du ${event_date} ajoutée ✓` };
}

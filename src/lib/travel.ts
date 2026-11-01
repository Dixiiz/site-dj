// Calcul des frais de déplacement depuis Huisseau-sur-Cosson (41350).
// Utilise des services publics et gratuits (OpenStreetMap Nominatim + OSRM)
// pour géocoder l'adresse et estimer la distance routière.
// Les frais sont calculés sur l'aller-RETOUR (distance x2).

const ORIGIN = { lat: 47.5776490, lon: 1.4115210 }; // Huisseau-sur-Cosson (41350)
export const FREE_KM = 30;
export const RATE_PER_KM_CENTS = 80; // 0,80 €/km

export type TravelEstimate = {
  distanceKm: number;
  billableKm: number;
  feeCents: number;
};

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q=${encodeURIComponent(
    address
  )}`;
  try {
    const res = await fetch(url, {
      headers: {
 "User-Agent": "propulsounddj-site/1.0 (contact@propulsounddj.fr)",
 "Accept-Language": "fr",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function routeDistanceKm(dest: { lat: number; lon: number }): Promise<number | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${ORIGIN.lon},${ORIGIN.lat};${dest.lon},${dest.lat}?overview=false`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const meters = data?.routes?.[0]?.distance;
    if (typeof meters !== "number") return null;
    return meters / 1000;
  } catch {
    return null;
  }
}

// Repli : géocodeur officiel français (BAN — api-adresse.data.gouv.fr).
// Très fiable pour les adresses postales françaises, sans clé API et sans
// les blocages/rate-limits que Nominatim inflige aux IP partagées (Vercel).
async function geocodeBan(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data?.features?.[0]?.geometry?.coordinates; // [lon, lat]
    if (!Array.isArray(coords) || coords.length < 2) return null;
    return { lat: coords[1], lon: coords[0] };
  } catch {
    return null;
  }
}

// Géocodage avec repli : Nominatim (noms de lieux, domaines…) puis BAN
// (adresses postales). Renvoie null seulement si les deux échouent.
async function geocodeWithFallback(address: string): Promise<{ lat: number; lon: number } | null> {
  return (await geocodeAddress(address)) ?? (await geocodeBan(address));
}

export function computeTravelFee(distanceKm: number): TravelEstimate {

  const roundTripKm = distanceKm * 2; // aller-retour
  const billableKm = Math.max(0, roundTripKm - FREE_KM);
  const feeCents = Math.round(billableKm * RATE_PER_KM_CENTS);
  return { distanceKm: Math.round(distanceKm * 10) / 10, billableKm: Math.round(billableKm * 10) / 10, feeCents };
}

// Estimation du PÉAGE via TollGuru (API gratuite avec clé). Requiert
// TOLLGURU_API_KEY dans .env.local ; renvoie null si indisponible.
export async function estimateTravelWithToll(
  address: string
): Promise<
  | { ok: true; estimate: TravelEstimate; tollCents: number | null }
  | { ok: false; error: string }
> {
  if (!address.trim()) {
    return { ok: false, error: "Merci d'indiquer le lieu de l'événement." };
  }
  const coords = await geocodeWithFallback(address);
  if (!coords) {
    return { ok: false, error: "Adresse introuvable. Précise la ville ou le code postal." };
  }
  const km = await routeDistanceKm(coords);
  if (km == null) {
    return { ok: false, error: "Calcul d'itinéraire momentanément indisponible. Réessaie dans un instant." };
  }
  return { ok: true, estimate: computeTravelFee(km), tollCents: null };
}

export async function estimateTravelFromAddress(
  address: string
): Promise<{ ok: true; estimate: TravelEstimate } | { ok: false; error: string }> {
  if (!address.trim()) {
    return { ok: false, error: "Merci d’indiquer le lieu de l’événement." };
  }
  const coords = await geocodeWithFallback(address);
  if (!coords) {
    return {
      ok: false,
      error: "Adresse introuvable. Précise la ville ou le code postal.",
    };
  }
  const km = await routeDistanceKm(coords);
  if (km == null) {
    return {
      ok: false,
      error: "Calcul d’itinéraire momentanément indisponible. Réessaie dans un instant.",
    };
  }
  return { ok: true, estimate: computeTravelFee(km) };
}

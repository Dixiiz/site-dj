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

export function computeTravelFee(distanceKm: number): TravelEstimate {
  const roundTripKm = distanceKm * 2; // aller-retour
  const billableKm = Math.max(0, roundTripKm - FREE_KM);
  const feeCents = Math.round(billableKm * RATE_PER_KM_CENTS);
  return { distanceKm: Math.round(distanceKm * 10) / 10, billableKm: Math.round(billableKm * 10) / 10, feeCents };
}

// Estimation du PÉAGE via TollGuru (API gratuite avec clé). Requiert
// TOLLGURU_API_KEY dans .env.local ; renvoie null si indisponible.
async function tollForRoute(geometryPolyline: string): Promise<number | null> {
  const key = process.env.TOLLGURU_API_KEY;
  if (!key) return null;
  // Catégorie du véhicule : configurable via TOLLGURU_VEHICLE_TYPE.
  // Catégorie 2 française (utilitaire léger / camion 2 essieux haut ≥ 2 m)
  // = « 2AxlesVan » chez TollGuru. Valeurs possibles : Car, 2AxlesVan,
  // 2AxlesTruck, 3AxlesTruck…
  const vehicleType = process.env.TOLLGURU_VEHICLE_TYPE || "2AxlesVan";
  try {
    const res = await fetch("https://apis.tollguru.com/toll/v2/complete-route-data", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: { polyline: geometryPolyline },
        destination: { polyline: geometryPolyline },
        vehicleType,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[toll] TollGuru HTTP", res.status);
      return null;
    }
    const data = await res.json();
    // La réponse varie selon le plan : on tente plusieurs emplacements.
    const route = data?.routes?.[0];
    const cost =
      route?.summary?.cost?.tagOrCash?.cost ??
      route?.summary?.cost?.cash?.cost ??
      route?.summary?.cost?.minimum?.cost ??
      route?.summary?.cost?.tag?.cost;
    if (typeof cost === "number" && cost > 0) {
      return Math.round(cost * 100);
    }
    return null;
  } catch (err) {
    console.error("[toll] TollGuru indisponible:", err);
    return null;
  }
}

// Comme estimateTravelFromAddress, mais récupère aussi l'itinéraire complet
// (polyline OSRM) pour l'estimation du péage aller-retour.
export async function estimateTravelWithToll(
  address: string
): Promise<
  | { ok: true; estimate: TravelEstimate; tollCents: number | null }
  | { ok: false; error: string }
> {
  if (!address.trim()) {
    return { ok: false, error: "Merci d'indiquer le lieu de l'événement." };
  }
  const coords = await geocodeAddress(address);
  if (!coords) {
    return { ok: false, error: "Adresse introuvable. Précise la ville ou le code postal." };
  }
  let km: number | null = null;
  let geometry: string | null = null;
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${ORIGIN.lon},${ORIGIN.lat};${coords.lon},${coords.lat}?overview=full`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      const meters = data?.routes?.[0]?.distance;
      geometry = data?.routes?.[0]?.geometry ?? null;
      if (typeof meters === "number") km = meters / 1000;
    }
  } catch {
    // km reste null
  }
  if (km == null) {
    return { ok: false, error: "Calcul d'itinéraire momentanément indisponible. Réessaie dans un instant." };
  }
  const estimate = computeTravelFee(km);
  const tollCents = geometry ? await tollForRoute(geometry) : null;
  return { ok: true, estimate, tollCents };
}

export async function estimateTravelFromAddress(
  address: string
): Promise<{ ok: true; estimate: TravelEstimate } | { ok: false; error: string }> {
  if (!address.trim()) {
    return { ok: false, error: "Merci d’indiquer le lieu de l’événement." };
  }
  const coords = await geocodeAddress(address);
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

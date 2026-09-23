// Heures supplémentaires : calcul partagé (PDF devis/facture, admin, espace client).
// Règle facturée côté serveur (submitQuote) : heures entamées au-delà de la durée
// incluse dans le pack (fin après minuit ramenée au lendemain).

// Durée incluse (minutes) selon le pack — noms issus de pricing-section
// (ADMIN_PACK_LIST). Renvoie null si le pack n'est pas reconnu (devis sur
// mesure) : dans ce cas on n'affiche pas d'heures calculées.
export function packBaseMinutes(formulaName?: string | null): number | null {
  const name = (formulaName ?? "").toLowerCase();
  if (!name) return null;
  if (name.includes("clé en main premium") || name.includes("cle en main premium")) return 180;
  if (name.includes("clé en main") || name.includes("cle en main")) return 120;
  if (name.includes("set dj")) return 120;
  if (/essential|deluxe|ultime/.test(name)) return 480;
  if (/standard|premium/.test(name)) return 360;
  if (name.includes("mariage")) return 480;
  return null;
}

export type ExtraHoursInput = {
  formula_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
  extra_fee_label?: string | null;
  extra_hours?: number | null;
};

function toMinutes(hhmm?: string | null): number | null {
  const m = hhmm?.match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// Nombre d'heures supplémentaires facturées (heures entamées), ou null si
// indéterminable / sans libellé personnalisé (ex : « Péage » → pas d'heures).
// Priorité : libellé personnalisé > colonne extra_hours > recalcul depuis les
// horaires (start/end, ou consignés dans les notes pour les anciens devis).
export function computeExtraHours(input: ExtraHoursInput): number | null {
  if (input.extra_fee_label?.trim()) return null;
  const base = packBaseMinutes(input.formula_name);
  if (base == null) {
    // Pack non reconnu : seule la colonne enregistrée fait foi.
    return input.extra_hours && input.extra_hours > 0 ? input.extra_hours : null;
  }
  let start = toMinutes(input.start_time ?? null);
  let end = toMinutes(input.end_time ?? null);
  // Anciennes données : horaires consignés dans les notes (« Début : 20:00 | Fin : 04:00 »).
  if (start == null) start = toMinutes(input.notes?.match(/Début\s*:\s*(\d{1,2}:\d{2})/)?.[1] ?? null);
  if (end == null) end = toMinutes(input.notes?.match(/Fin\s*:\s*(\d{1,2}:\d{2})/)?.[1] ?? null);
  if (start == null || end == null) return null;
  if (end < 12 * 60) end += 24 * 60; // fin après minuit → lendemain
  const past = end - start - base;
  return past > 0 ? Math.ceil(past / 60) : null;
}

// Formatage français : 0.5 → « 30 min », 1 → « 1 h », 1.5 → « 1 h 30 ».
export function formatExtraHours(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

// Quantité à afficher dans les tableaux : « 1,5 » (décimale à la française).
export function formatExtraQty(hours: number): string {
  return String(hours).replace(".", ",");
}
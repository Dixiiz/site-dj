// Règles de paiement en plusieurs fois — partagées entre le formulaire de
// devis (estimation) et l'espace client (échéancier réel).
// Acompte = 20 % du total (solde arrondi à la dizaine inférieure, même règle
// que le devis PDF). Frais Stripe (1,5 % + 0,25 €/paiement) répercutés au
// client. La 1re échéance couvre au minimum l'acompte ; si la répartition
// égale donne des parts plus grosses, l'échéancier est réparti harmonieusement
// (ex. 2× = moitié + moitié).
// Planchers : aucune échéance ne peut être < 150 € ; au-delà de x3,
// seulement à partir de 1 000 € de total.
export const ECHEANCE_MIN_CENTS = 15_000;
export const ECHEANCIER_LONG_MIN_CENTS = 100_000;

export function acompteCents(totalCents: number): number {
  const solde = Math.floor((totalCents * 0.008) / 10) * 1000;
  return Math.max(0, totalCents - solde);
}

export function avecFrais(base: number): number {
  return Math.ceil((base + 25) / 0.985);
}

export function montantsEcheances(
  totalCents: number,
  n: number,
  acompteRequis = true
): { first: number; rest: number } {
  const acompte = acompteRequis ? acompteCents(totalCents) : 0;
  const partEgale = Math.floor(totalCents / n);
  if (partEgale >= acompte) {
    return {
      first: avecFrais(partEgale),
      rest: n > 1 ? avecFrais(Math.ceil((totalCents - partEgale) / (n - 1))) : 0,
    };
  }
  return {
    first: avecFrais(acompte),
    rest: n > 1 ? avecFrais(Math.ceil((totalCents - acompte) / (n - 1))) : 0,
  };
}

// Échéancier du solde uniquement (quand l'acompte est déjà réglé) :
// toutes les parts sont égales.
export function montantsEcheancesSolde(
  soldeCents: number,
  n: number
): { first: number; rest: number } {
  const part = avecFrais(Math.ceil(soldeCents / n));
  return { first: part, rest: part };
}

// Formats disponibles pour un total : chaque échéance doit respecter le
// plancher de 150 € ; x4 et plus exige 1 000 € minimum.
export function niveauxDisponibles(totalCents: number): number[] {
  return [2, 3, 4, 5, 6, 7, 8, 9, 10].filter((n) => {
    if (n > 3 && totalCents < ECHEANCIER_LONG_MIN_CENTS) return false;
    const { first, rest } = montantsEcheances(totalCents, n);
    return Math.min(first, rest || first) >= ECHEANCE_MIN_CENTS;
  });
}

// ---------- Contraintes de date ----------
// La soirée approche ? Un échéancier n'a de sens que si les échéances peuvent
// tomber AVANT la soirée, avec un espacement raisonnable (minimum 7 jours).
// Même garde-fou que le serveur (creerEcheancier) : il faut au moins 10 jours
// « utiles » avant la soirée, c.-à-d. une soirée à 12 jours ou plus.

// Jours entiers entre aujourd'hui (midi) et la soirée (null si date absente
// ou invalide).
export function joursAvantSoiree(eventDate: string | null): number | null {
  if (!eventDate) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const event = new Date(`${eventDate}T12:00:00`);
  if (Number.isNaN(event.getTime())) return null;
  return Math.floor((event.getTime() - today.getTime()) / 86400_000);
}

// L'échéancier est-il proposable du tout pour cette date de soirée ?
// Date inconnue (null) = on ne bloque pas (le serveur validera de toute façon).
export function echeancierPossiblePourDate(eventDate: string | null): boolean {
  const jours = joursAvantSoiree(eventDate);
  return jours === null ? true : jours - 2 >= 10;
}

// Nombre max d'échéances pour cette date : la 1ʳᵉ tombe à J+3, puis espacement
// d'au moins 7 jours, la dernière au plus tard 2 jours avant la soirée
// (ex. 2× dès 12 jours de délai ; 10× à partir de 79 jours).
export function maxEcheancesPourDate(eventDate: string | null): number {
  const jours = joursAvantSoiree(eventDate);
  if (jours === null) return 10;
  const daysUntil = jours - 2;
  if (daysUntil < 10) return 0;
  // Clamp à 10 : le site ne propose jamais plus de 10 échéances.
  return Math.min(10, Math.max(2, Math.floor((daysUntil - 3) / 7) + 1));
}

// Formats disponibles pour un total ET une date de soirée : planchers
// monétaires (niveauxDisponibles) + plafond temporel (maxEcheancesPourDate).
export function niveauxDisponiblesPourDate(
  totalCents: number,
  eventDate: string | null
): number[] {
  const max = maxEcheancesPourDate(eventDate);
  return niveauxDisponibles(totalCents).filter((n) => n <= max);
}



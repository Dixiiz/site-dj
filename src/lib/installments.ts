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
  // Acompte ≈ 20 % du total. Le solde (≈ 80 %) est arrondi à la dizaine
  // d'euros inférieure (1 000 centimes) : l'acompte récupère l'arrondi.
  // totalCents / 1250 = (totalCents × 0,8) / 1 000 — division entière donc
  // exacte, aucune erreur de virgule flottante possible.
  const solde = Math.floor(totalCents / 1250) * 1000;
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
// tomber AVANT la soirée, avec AU PLUS une échéance par mois calendaire.
// L'acompte compte comme le 1ᵉʳ paiement (dans le mois en cours) ; ensuite
// une échéance par mois jusqu'au mois de la soirée. Ex. acompte en novembre :
// soirée en décembre → 2 paiements, soirée en février → 4 paiements.
// Une soirée dans le mois même (ou trop proche) n'offre pas d'échéancier :
// règlement acompte + solde, comme d'habitude.

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

// Nombre max d'échéances pour cette date : une échéance par mois calendaire,
// l'acompte comptant comme le 1ᵉʳ paiement (ce mois-ci). Ex. acompte en
// novembre, soirée en février → 4 paiements max (nov, déc, janv, févr).
// La dernière échéance tombe au plus tard 2 jours avant la soirée ; il faut
// au moins 10 jours « utiles » avant la soirée (soirée à 12 jours ou plus),
// même garde-fou que le serveur (creerEcheancier).
// Date inconnue ou illisible → 0 : sans date de soirée, aucun échéancier ne
// peut être garanti AVANT la soirée (le serveur le refuserait de toute façon).
export function maxEcheancesPourDate(eventDate: string | null): number {
  const jours = joursAvantSoiree(eventDate);
  if (jours === null) return 0;
  const daysUntil = jours - 2;
  if (daysUntil < 10) return 0;
  const event = new Date(`${eventDate}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  // Écart de mois calendaires entre aujourd'hui et la soirée (0 = même mois).
  const moisEcart =
    (event.getFullYear() - today.getFullYear()) * 12 +
    (event.getMonth() - today.getMonth());
  // 1ᵉʳ paiement (acompte) ce mois-ci, puis une échéance par mois jusqu'au
  // mois de la soirée. Écart de 3 mois → 4 paiements au total.
  // Clamp à 10 : le site ne propose jamais plus de 10 échéances.
  return Math.min(10, Math.max(1, moisEcart + 1));
}

// L'échéancier est-il proposable du tout pour cette date de soirée ?
// Date inconnue ou illisible → non : autant ne pas montrer des options que
// le serveur refuserait (« Ce devis n'a pas de date d'événement »).
export function echeancierPossiblePourDate(eventDate: string | null): boolean {
  const jours = joursAvantSoiree(eventDate);
  if (jours === null) return false;
  return jours - 2 >= 10 && maxEcheancesPourDate(eventDate) >= 2;
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



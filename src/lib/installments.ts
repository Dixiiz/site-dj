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
  n: number
): { first: number; rest: number } {
  const acompte = acompteCents(totalCents);
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



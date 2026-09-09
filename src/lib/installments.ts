// Règles de paiement en plusieurs fois — partagées entre le formulaire de
// devis (estimation) et l'espace client (échéancier réel).
// Acompte = 20 % du total (solde arrondi à la dizaine inférieure, même règle
// que le devis PDF). Frais Stripe (1,5 % + 0,25 €/paiement) répercutés au
// client. La 1re échéance couvre au minimum l'acompte ; si la répartition
// égale donne des parts plus grosses, l'échéancier est réparti harmonieusement
// (ex. 2× = moitié + moitié).
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

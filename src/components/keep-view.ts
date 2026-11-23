"use client";

// Conserve la position de lecture et l'ouverture de l'accordéon du devis
// autour d'une action serveur (génération de PDF, envoi, validation…) : le
// rafraîchissement de la page qui suit la revalidation peut replacer la vue
// en haut du document et/ou refermer le <details> parent. On restaure les
// deux une fois le DOM à jour, pour rester exactement là où on était.
//
// L'accordéon « devis-<id> » n'existe que dans la liste admin : côté espace
// client (ou tout autre contexte) la fonction se contente de restaurer le
// scroll, ce qui reste inoffensif si la page n'a pas bougé.
export async function garderVue<T>(quoteId: string, run: () => Promise<T>): Promise<T> {
  const scrollY = window.scrollY;
  const ouvert = Boolean(
    (document.getElementById(`devis-${quoteId}`) as HTMLDetailsElement | null)?.open
  );
  const restaurer = () => {
    const details = document.getElementById(
      `devis-${quoteId}`
    ) as HTMLDetailsElement | null;
    if (details && ouvert) details.open = true;
    window.scrollTo({ top: scrollY });
  };
  try {
    return await run();
  } finally {
    // La page actualisée arrive avec la réponse de l'action et est appliquée
    // par React juste après : on restaure sur les frames suivantes, puis une
    // fois de plus en secours au cas où le rendu serait plus lent.
    requestAnimationFrame(() => requestAnimationFrame(restaurer));
    setTimeout(restaurer, 120);
  }
}

"use client";

// Conserve la position de lecture et l'ouverture de l'accordéon du devis
// autour d'une action serveur (génération de PDF, envoi, validation…) : le
// rafraîchissement de la page qui suit la revalidation referme sinon le
// <details> parent et peut déplacer la vue.
//
// La restauration suit le DEVIS, pas un offset absolu : générer un document
// change le statut du devis (ex. « nouveau » → « attente de signature »),
// ce qui le fait quitter le haut de la liste et se replacer selon le tri —
// souvent plus bas. Restaurer l'offset absolu laisserait alors la fenêtre
// sur ce qui occupait l'ancienne place (un autre devis). On mémorise donc
// la position du devis dans le document AVANT l'action ; après le
// rafraîchissement, on ré-applique le décalage entre sa nouvelle et son
// ancienne position : la vue reste vissée sur le devis concerné, où qu'il
// soit allé dans la liste.
//
// L'accordéon « devis-<id> » n'existe que dans la liste admin : côté espace
// client (ou tout autre contexte) l'ancre est absente et la fonction se
// contente de restaurer le scroll absolu, ce qui reste inoffensif si la
// page n'a pas bougé.
export async function garderVue<T>(quoteId: string, run: () => Promise<T>): Promise<T> {
  const scrollY = window.scrollY;
  const detailsAvant = document.getElementById(
    `devis-${quoteId}`
  ) as HTMLDetailsElement | null;
  const ouvert = Boolean(detailsAvant?.open);
  // Ancre : position du devis dans le DOCUMENT avant l'action (pas dans le
  // viewport, pour rester juste même si l'utilisateur lisait au milieu du
  // contenu déplié, bien en dessous de l'en-tête du devis).
  const ancreAvant = detailsAvant
    ? detailsAvant.getBoundingClientRect().top + scrollY
    : null;

  const restaurer = () => {
    const details = document.getElementById(
      `devis-${quoteId}`
    ) as HTMLDetailsElement | null;
    if (details && ouvert) details.open = true;
    if (ancreAvant === null || !details) {
      // Sans ancre (autre contexte que la liste admin, ou devis sorti de la
      // liste — archivé, filtré…) : repli sur l'ancien comportement —
      // offset absolu.
      window.scrollTo({ top: scrollY, behavior: "instant" });
      return;
    }
    // Décalage du devis dans la page depuis l'action (re-tri, sortie du
    // groupe épinglé « nouveau »…) : on translate la fenêtre du même
    // montant, borné aux limites du document.
    const ancreApres = details.getBoundingClientRect().top + window.scrollY;
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({
      top: Math.min(Math.max(0, scrollY + (ancreApres - ancreAvant)), max),
      behavior: "instant",
    });
  };

  try {
    return await run();
  } finally {
    // La page actualisée arrive avec la réponse de l'action et est appliquée
    // par React juste après : on restaure sur les frames suivantes, puis
    // encore à 120/300/600 ms au cas où le rendu serait plus lent. Chaque
    // passe recalcule depuis le DOM courant : si rien n'a bougé, elle ne
    // change rien — et le scroll instantané évite toute animation parasite
    // entre les passes.
    requestAnimationFrame(() => requestAnimationFrame(restaurer));
    setTimeout(restaurer, 120);
    setTimeout(restaurer, 300);
    setTimeout(restaurer, 600);
  }
}

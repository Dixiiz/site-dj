"use client";

import { useEffect } from "react";

// Après une action serveur (édition, génération, envoi…), la page se
// recharge avec ?focus=<id> : on scrolle en douceur vers le devis concerné
// au lieu de laisser l'utilisateur tout en haut de la liste.
export function ScrollToFocus({ focus }: { focus?: string }) {
  useEffect(() => {
    if (!focus) return;
    // Petit délai : laisse l'animation d'ouverture du <details> démarrer
    // pour que scrollIntoView calcule la bonne position finale.
    const t = setTimeout(() => {
      document
        .getElementById(`devis-${focus}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(t);
  }, [focus]);
  return null;
}

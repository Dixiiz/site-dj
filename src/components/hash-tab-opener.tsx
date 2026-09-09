"use client";

import { useEffect } from "react";

// Ouvre automatiquement l'onglet Paiement quand on arrive avec #paiement
// (le lien de l'onglet Ma soirée pointe sur ce hash).
export default function HashTabOpener() {
  useEffect(() => {
    if (window.location.hash !== "#paiement") return;
    // Petit délai : le temps que les Tabs soient montés.
    const timer = setTimeout(() => {
      document.getElementById("tab-paiement")?.click();
    }, 50);
    return () => clearTimeout(timer);
  }, []);
  return null;
}

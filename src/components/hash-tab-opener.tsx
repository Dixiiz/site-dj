"use client";

import { useEffect } from "react";

// Ouvre automatiquement l'onglet Paiement quand le hash #paiement est présent
// (au chargement ET lors d'un simple changement de hash dans la même page —
// le clic sur le lien de l'onglet Ma soirée).
export default function HashTabOpener() {
  useEffect(() => {
    function openIfPaiement() {
      if (window.location.hash !== "#paiement") return;
      // Le délai laisse les Tabs finir leur montage (arrivée directe en URL).
      document.getElementById("tab-paiement")?.click();
    }
    window.addEventListener("hashchange", openIfPaiement);
    const timer = setTimeout(openIfPaiement, 300);
    return () => {
      window.removeEventListener("hashchange", openIfPaiement);
      clearTimeout(timer);
    };
  }, []);
  return null;
}

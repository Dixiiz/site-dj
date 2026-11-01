"use client";

import { useEffect } from "react";

// Fait défiler la page en douceur vers le mois en cours dès l'ouverture,
// pour que le client tombe directement sur le bon mois sans chercher.
export function ScrollToCurrentMonth() {
  useEffect(() => {
    const el = document.getElementById("mois-courant");
    if (!el) return;
    const timer = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 700);
    return () => clearTimeout(timer);
  }, []);
  return null;
}

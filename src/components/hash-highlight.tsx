"use client";

import { useEffect } from "react";

// Au chargement : si l'URL contient une ancre (#acompte, #playlist…), fait
// défiler jusqu'à la section et la met en évidence (grossissement + halo),
// pour que le client trouvé depuis un e-mail ne cherche pas.
export function HashHighlight() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;

    let cleanup: (() => void) | null = null;
    const timer = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("anchor-flash");
      const remove = setTimeout(() => el.classList.remove("anchor-flash"), 2800);
      cleanup = () => clearTimeout(remove);
    }, 400);

    return () => {
      clearTimeout(timer);
      cleanup?.();
    };
  }, []);

  return null;
}

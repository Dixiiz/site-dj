"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";

// Onglets du devis en mode contrôlé. Deux déclencheurs externes :
//  - événement "propul:open-paiement" (clic sur la carte de renvoi de
//    l'onglet Ma soirée — immédiat, 100 % fiable en navigation client),
//  - hash #paiement (arrivée directe par URL ou rafraîchissement).
export default function DevisTabs({
  children,
  className,
  orientation = "horizontal",
}: {
  children: ReactNode;
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  const [tab, setTab] = useState("soiree");

  function ouvrirPaiement() {
    setTab("paiement");
    window.setTimeout(() => {
      document
        .getElementById("tabs-devis")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  useEffect(() => {
    function applyHash() {
      if (window.location.hash === "#paiement") ouvrirPaiement();
    }
    window.addEventListener("propul:open-paiement", ouvrirPaiement);
    window.addEventListener("hashchange", applyHash);
    applyHash();
    return () => {
      window.removeEventListener("propul:open-paiement", ouvrirPaiement);
      window.removeEventListener("hashchange", applyHash);
    };
  }, []);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(String(value ?? "soiree"))}
      orientation={orientation}
      className={className}
    >
      {children}
    </Tabs>
  );
}

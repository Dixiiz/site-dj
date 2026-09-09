"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";

// Onglets du devis en mode contrôlé : l'onglet Paiement s'active tout seul
// quand le hash #paiement est présent — au chargement ET lors d'un simple
// changement de hash dans la même page (clic sur le lien de Ma soirée),
// ce que les onglets non contrôlés n'entendent pas.
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

  useEffect(() => {
    function applyHash() {
      if (window.location.hash !== "#paiement") return;
      setTab("paiement");
      // Scroll doux vers le contenu de l'onglet (utile depuis Ma soirée).
      window.setTimeout(() => {
        document
          .getElementById("tabs-devis")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
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

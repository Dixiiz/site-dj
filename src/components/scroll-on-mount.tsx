"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * Fait défiler la page jusqu'à ce bloc quand il apparaît (utile pour les
 * panneaux de détail rendus plus bas dans la page, sous les cartes).
 */
export function ScrollOnMount({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <div ref={ref} className="scroll-mt-20">
      {children}
    </div>
  );
}

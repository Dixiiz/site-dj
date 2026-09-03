"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

// Le site est toujours en mode sombre : pas besoin de next-themes
// (son script inline causait une erreur de rendu côté client).
export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

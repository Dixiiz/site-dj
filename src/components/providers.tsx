"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

// Le site est toujours en mode sombre : pas besoin de next-themes
// (son script inline causait une erreur de rendu côté client).
"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {children}
      <Toaster />
    </ThemeProvider>
  );
}

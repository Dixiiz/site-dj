"use client";

import { useRouter } from "next/navigation";

// Flèche retour : revient à la page précédente (devis, liste, etc.).
export function ClientBack() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Retour à la page précédente"
      title="Retour"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
    </button>
  );
}

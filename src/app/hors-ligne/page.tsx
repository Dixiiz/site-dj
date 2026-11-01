import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hors-ligne",
  robots: { index: false, follow: false },
};

export default function HorsLignePage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-medium tracking-tight">Vous êtes hors-ligne</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Cette page n&apos;a pas été consultée récemment, elle n&apos;est donc
        pas disponible en cache. Reconnectez-vous à Internet puis réessayez —
        le planning et les devis déjà consultés restent accessibles hors-ligne.
      </p>
      <Link
        href="/admin"
        className="mt-6 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent/50"
      >
        Réessayer
      </Link>
    </main>
  );
}

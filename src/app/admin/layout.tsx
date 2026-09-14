import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { AdminLoginForm } from "@/components/admin-login-form";
import { OfflineIndicator } from "@/components/offline-indicator";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { isAdmin } from "@/lib/admin-auth";

// Manifeste PWA propre à l'admin : l'app installée depuis /admin s'ouvre
// directement sur le tableau de bord admin (et non sur le site public).
export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const ok = await isAdmin();

  if (!ok) {
    return (
      <main className="min-h-full px-4">
        <AdminLoginForm />
      </main>
    );
  }

  return (
    <div className="min-h-full">
      {/* En-tête sticky : la navigation reste accessible même en défilant */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <p className="truncate font-medium tracking-tight">
            <Link
              href="/admin"
              className="transition-colors hover:text-accent"
            >
              Admin — Propul&apos;Sound
            </Link>
          </p>
          <AdminNav />
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">{children}</div>
      <OfflineIndicator />
      <ServiceWorkerRegister />
    </div>
  );
}

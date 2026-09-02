import type { ReactNode } from "react";
import Link from "next/link";
import { logoutAdmin } from "@/app/actions";
import { AdminLoginForm } from "@/components/admin-login-form";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/admin-auth";

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
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <p className="font-medium">Tableau de bord</p>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/admin/devis" className="text-muted-foreground hover:text-foreground">
              Devis
            </Link>
            <Link href="/admin/planning" className="text-muted-foreground hover:text-foreground">
              Planning
            </Link>
            <Link href="/admin/creneaux" className="text-muted-foreground hover:text-foreground">
              Créneaux
            </Link>
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Site
            </Link>
            <form action={logoutAdmin}>
              <Button type="submit" variant="outline" size="sm">
                Déconnexion
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}

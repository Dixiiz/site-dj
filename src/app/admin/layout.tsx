import type { ReactNode } from "react";
import Link from "next/link";
import { logoutAdmin } from "@/app/actions";
import { AdminLoginForm } from "@/components/admin-login-form";
import { SubmitButton } from "@/components/submit-button";
import { Button, buttonVariants } from "@/components/ui/button";
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
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <p className="font-medium">Tableau de bord</p>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/admin/devis" className="text-muted-foreground hover:text-foreground">
              Devis
            </Link>
            <Link href="/admin/planning" className="text-muted-foreground hover:text-foreground">
              Planning
            </Link>
            <Link href="/admin/medias" className="text-muted-foreground hover:text-foreground">
              Médias
            </Link>
            <Link href="/admin/comptes" className="text-muted-foreground hover:text-foreground">
              Comptes
            </Link>
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Site
            </Link>
            <form action={logoutAdmin}>
              <SubmitButton
                pendingLabel="…"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Déconnexion
              </SubmitButton>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}

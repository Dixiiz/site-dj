import type { ReactNode } from "react";
import { ClientBack } from "@/components/client-back";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientUser, logoutClient } from "@/app/client-actions";
import { Button } from "@/components/ui/button";

export default async function MonEspaceLayout({ children }: { children: ReactNode }) {
  const user = await getClientUser();
  if (!user) redirect("/connexion");

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <ClientBack />
            <Link href="/mon-espace" className="font-medium">
              Mon espace
            </Link>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Site
            </Link>
            <form action={logoutClient}>
              <Button type="submit" variant="outline" size="sm">
                Déconnexion
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
    </div>
  );
}

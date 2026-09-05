import type { ReactNode } from "react";
import { ClientBack } from "@/components/client-back";
import { SiteHeader } from "@/components/site-header";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientUser, logoutClient } from "@/app/client-actions";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

export default async function MonEspaceLayout({ children }: { children: ReactNode }) {
  const user = await getClientUser();
  if (!user) redirect("/connexion");

  return (
    <div className="min-h-full">
      <SiteHeader />
      {/* Barre espace client : retour, mon espace, déconnexion */}
      <div className="border-b border-border bg-background/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3 text-sm">
            <ClientBack />
            <Link
              href="/mon-espace"
              className="font-medium text-accent transition-colors hover:text-accent/80"
            >
              Mon espace
            </Link>
          </div>
          <form action={logoutClient}>
            <SubmitButton
              pendingLabel="…"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Déconnexion
            </SubmitButton>
          </form>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
    </div>
  );
}

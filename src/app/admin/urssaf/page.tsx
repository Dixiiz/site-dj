import { isAdmin } from "@/lib/admin-auth";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UrssafDashboard } from "@/components/urssaf-dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "CA URSSAF — Admin" };

// Rubrique dédiée « CA URSSAF » : dashboard détaillé des encaissements
// (rattachement au mois réel d'encaissement, filtres DJ / Menuiserie).
export default async function UrssafPage() {
  if (!(await isAdmin())) {
    return <p className="p-8 text-sm text-muted-foreground">Accès refusé.</p>;
  }
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Retour au tableau de bord
      </Link>
      <UrssafDashboard />
    </main>
  );
}
import Link from "next/link";
import { AdminQuoteCreateForm } from "@/components/admin-quote-create";

export const dynamic = "force-dynamic";

export const metadata = { title: "Nouveau devis sur mesure" };

// Création d'un devis sur mesure côté admin : client, date, pack, options FX,
// montants libres. Contrairement à l'import (devis papier déjà signé), le
// devis créé ici vit comme les autres dans le parcours de réservation.
export default function NouveauDevisAdminPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Nouveau devis sur mesure</h1>
        <Link
          href="/admin/devis"
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Retour aux devis
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Créez un devis personnalisé pour un client (montants libres, options au choix). Le client
        le retrouvera dans son espace client dès qu&apos;un compte existe avec cet e-mail, et vous
        pourrez ensuite générer devis/contrat/facture comme pour les demandes du site.
      </p>
      <AdminQuoteCreateForm />
    </main>
  );
}

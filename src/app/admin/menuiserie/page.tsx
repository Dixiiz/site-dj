import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin-auth";
import { MenuiserieAdmin, type MenuiserieClient, type MenuiserieDoc } from "@/components/menuiserie-admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Menuiserie — Admin" };

export default async function MenuiseriePage() {
  if (!(await isAdmin())) {
    return <p className="p-8 text-sm text-muted-foreground">Accès refusé.</p>;
  }

  const supabase = createAdminClient();
  const [docsRes, clientsRes] = await Promise.all([
    supabase
      .from("menuiserie_docs")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("menuiserie_clients").select("*").order("nom", { ascending: true }),
  ]);

  if (docsRes.error || clientsRes.error) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <h1 className="text-2xl font-medium">Menuiserie</h1>
        <div className="rounded-xl border border-orange-500/50 bg-orange-500/10 p-4 text-sm">
          <p className="font-medium text-orange-300">Tables menuiserie introuvables.</p>
          <p className="mt-1 text-muted-foreground">
            Exécute d&apos;abord la migration SQL{" "}
            <code className="rounded bg-white/10 px-1">supabase/migrations/2026-02-16-Date-heure-remise.sql</code>{" "}
            dans le SQL Editor de Supabase (tables <code>menuiserie_clients</code> et{" "}
            <code>menuiserie_docs</code>), puis recharge cette page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Menuiserie — Devis &amp; Factures</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crée un devis ou une facture et génère le PDF (charte Propul&apos;Sound — Atelier
          Soulaine). À toi de l&apos;imprimer ou de l&apos;envoyer au client : il imprime et signe.
          Numérotation indépendante : DEV-2026-001 / FAC-2026-001.
        </p>
      </div>
      <MenuiserieAdmin
        docsInitial={(docsRes.data ?? []) as unknown as MenuiserieDoc[]}
        clientsInitial={(clientsRes.data ?? []) as unknown as MenuiserieClient[]}
      />
    </main>
  );
}

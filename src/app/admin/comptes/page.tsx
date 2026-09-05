import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Comptes clients — Admin Propul'Sound DJ" };
export const dynamic = "force-dynamic";

type Compte = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignIn: string | null;
  devisTotal: number;
  devisEnCours: number;
  devisConfirmes: number;
};

export default async function AdminComptesPage() {
  const supabase = createAdminClient();

  const [{ data: usersData }, { data: quotes }] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.from("quotes").select("id, customer_email, status"),
  ]);

  const byEmail = new Map<string, { total: number; enCours: number; confirmes: number }>();
  for (const q of quotes ?? []) {
    const email = String(q.customer_email ?? "").toLowerCase();
    if (!email) continue;
    const entry = byEmail.get(email) ?? { total: 0, enCours: 0, confirmes: 0 };
    entry.total += 1;
    if (q.status === "confirme") entry.confirmes += 1;
    else entry.enCours += 1;
    byEmail.set(email, entry);
  }

  const comptes: Compte[] = (usersData?.users ?? [])
    .map((u) => {
      const stats = byEmail.get(String(u.email ?? "").toLowerCase());
      const meta = (u.user_metadata ?? {}) as { name?: string };
      return {
        id: u.id,
        email: u.email ?? "—",
        name: meta.name ?? "—",
        createdAt: u.created_at ?? "",
        lastSignIn: u.last_sign_in_at ?? null,
        devisTotal: stats?.total ?? 0,
        devisEnCours: stats?.enCours ?? 0,
        devisConfirmes: stats?.confirmes ?? 0,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Comptes clients ({comptes.length})</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tous les comptes créés sur l’espace client, avec leurs devis.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Compte créé le</th>
              <th className="px-4 py-3">Dernière connexion</th>
              <th className="px-4 py-3 text-center">Devis</th>
              <th className="px-4 py-3 text-center">En cours</th>
              <th className="px-4 py-3 text-center">Confirmés</th>
            </tr>
          </thead>
          <tbody>
            {comptes.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/devis?q=${encodeURIComponent(c.email)}`}
                    className="text-accent underline-offset-2 hover:underline"
                  >
                    {c.email}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString("fr-FR") : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.lastSignIn ? new Date(c.lastSignIn).toLocaleDateString("fr-FR") : "Jamais"}
                </td>
                <td className="px-4 py-3 text-center font-semibold">{c.devisTotal}</td>
                <td className="px-4 py-3 text-center">{c.devisEnCours}</td>
                <td className="px-4 py-3 text-center">{c.devisConfirmes}</td>
              </tr>
            ))}
            {comptes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun compte client pour le moment.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

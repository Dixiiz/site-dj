import Link from "next/link";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { resendFirstLoginLink, deleteClientAccount } from "@/app/client-actions";
import { SubmitButton } from "@/components/submit-button";

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

  // Message flash du bouton « Envoyer / Renvoyer un accès » (cookie posé par
  // resendFirstLoginLink) : confirme l'envoi ou signale l'échec — un envoi
  // raté ne doit jamais passer inaperçu.
  let flash: { ok: boolean; msg: string } | null = null;
  try {
    const raw = (await cookies()).get("dj_admin_flash")?.value;
    flash = raw ? (JSON.parse(raw) as { ok: boolean; msg: string }) : null;
  } catch {
    flash = null;
  }

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

      {flash ? (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            flash.ok
              ? "border-green-500/40 bg-green-500/10 text-green-300"
              : "border-destructive/50 bg-destructive/10 text-destructive"
          }`}
        >
          {flash.ok ? "✓ " : "⚠ "}
          {flash.msg}
        </div>
      ) : null}

      {/* Cartes responsive : chaque compte est une carte autonome — les actions
          « Accès » et « Supprimer » restent toujours visibles, sans scroll
          horizontal quel que soit l'écran. */}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {comptes.map((c) => (
          <article
            key={c.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
          >
            {/* Identité */}
            <div className="min-w-0">
              <p className="truncate font-medium">{c.name}</p>
              <Link
                href={`/admin/devis?q=${encodeURIComponent(c.email)}`}
                className="block truncate text-sm text-accent underline-offset-2 hover:underline"
              >
                {c.email}
              </Link>
            </div>

            {/* Infos + devis */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>Créé le {c.createdAt ? new Date(c.createdAt).toLocaleDateString("fr-FR") : "—"}</span>
              <span>
                ·{" "}
                {c.lastSignIn
                  ? `Connecté le ${new Date(c.lastSignIn).toLocaleDateString("fr-FR")}`
                  : "Jamais connecté"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-full border border-border px-2 py-0.5">
                {c.devisTotal} devis{c.devisTotal > 1 ? "s" : ""}
              </span>
              <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-yellow-300">
                {c.devisEnCours} en cours
              </span>
              <span className="rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-green-300">
                {c.devisConfirmes} confirmé{c.devisConfirmes > 1 ? "s" : ""}
              </span>
            </div>

            {/* Actions : toujours visibles, côte à côte */}
            <div className="mt-auto flex flex-wrap gap-2 border-t border-border/60 pt-3">
              {/* Renvoie au client un e-mail « première connexion » : il ne lui
                  reste que son mot de passe à choisir (utile pour les comptes
                  jamais connectés). */}
              <form action={resendFirstLoginLink}>
                <input type="hidden" name="email" value={c.email} />
                <SubmitButton
                  pendingLabel="Envoi…"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {c.lastSignIn ? "Renvoyer un accès" : "Envoyer un accès"}
                </SubmitButton>
              </form>
              {/* Supprime le compte Auth : messages, playlists et fichiers du
                  client partent en cascade ; les devis restent (ils sont
                  rattachés par e-mail) — le client peut recréer un compte. */}
              <form action={deleteClientAccount}>
                <input type="hidden" name="user_id" value={c.id} />
                <input type="hidden" name="email" value={c.email} />
                <SubmitButton
                  pendingLabel="…"
                  confirm={`Supprimer définitivement le compte de ${c.name} (${c.email}) ?\n\nSes messages, playlists et fichiers seront perdus ; ses devis seront conservés. Il pourra recréer un compte avec le même e-mail.`}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-destructive hover:text-destructive disabled:opacity-50"
                >
                  Supprimer
                </SubmitButton>
              </form>
            </div>
          </article>
        ))}
        {comptes.length === 0 ? (
          <p className="rounded-xl border border-border px-4 py-8 text-center text-muted-foreground md:col-span-2">
            Aucun compte client pour le moment.
          </p>
        ) : null}
      </div>
    </main>
  );
}

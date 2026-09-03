import { createAuthClient } from "@/lib/supabase/server";
import { getClientUser } from "@/app/client-actions";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = {
  title: "Nouveau mot de passe — Propul'Sound DJ",
  description: "Définissez un nouveau mot de passe pour votre espace client.",
};

export default async function ReinitialiserPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Le lien e-mail contient un code PKCE : on l'échange contre une session.
  const { code } = await searchParams;
  if (code) {
    const supabase = await createAuthClient();
    await supabase.auth.exchangeCodeForSession(code).catch(() => {});
  }

  const user = await getClientUser();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="mb-6 text-center text-2xl font-semibold">Nouveau mot de passe</h1>
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="space-y-4 rounded-xl border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Ce lien est invalide ou a expiré. Faites une nouvelle demande depuis la page de
            connexion (« Mot de passe oublié ? »).
          </p>
          <a
            href="/connexion"
            className="inline-block rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:brightness-110"
          >
            Retour à la connexion
          </a>
        </div>
      )}
    </main>
  );
}

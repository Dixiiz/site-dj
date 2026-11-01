// Le client clique sur le lien enveloppe reçu par e-mail (« première
// connexion ») : on génère ICI un lien Supabase frais (recovery ou invite
// selon que le compte existe déjà) et on y redirige. C'est ce clic qui lance
// le décompte de 1 h du token Supabase — l'enveloppe elle-même (signée HMAC)
// reste valable 7 jours.
import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifierLienPremiereConnexion } from "@/lib/lien-premiere-connexion";
import { findOwnerUserId } from "@/app/client-actions";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("q") ?? "";

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const site = `${proto}://${host}`;
  const redirectTo = `${site}/connexion/reinitialiser`;

  const envelope = verifierLienPremiereConnexion(token);
  if (!envelope) {
    // Enveloppe expirée (> 7 jours) ou corrompue → formulaire de renvoi.
    return NextResponse.redirect(`${site}/connexion/reinitialiser`);
  }

  const { email } = envelope;
  const admin = createAdminClient();
  let actionLink: string | null = null;

  if (await findOwnerUserId(admin, email)) {
    // Compte existant : lien de récupération (définition d'un nouveau mdp).
    const { data } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    actionLink = data?.properties?.action_link ?? null;
  } else {
    // Pas de compte : on n'en crée un que si un devis porte cet e-mail.
    const { data: quote } = await admin
      .from("quotes")
      .select("customer_name")
      .eq("customer_email", email)
      .limit(1)
      .maybeSingle();
    if (!quote) {
      // Ni compte ni devis (ex : e-mail modifié) → page de connexion.
      return NextResponse.redirect(`${site}/connexion`);
    }
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { data: { name: String(quote.customer_name ?? "") }, redirectTo },
    });
    if (data?.properties?.action_link) {
      actionLink = data.properties.action_link;
    } else if (error && /already|exist|registered|duplicate/i.test(error.message)) {
      // Course entre deux clics : le compte vient d'être créé → recovery.
      const { data: data2 } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
      actionLink = data2?.properties?.action_link ?? null;
    }
  }

  if (!actionLink) {
    return NextResponse.redirect(`${site}/connexion/reinitialiser`);
  }
  // Redirection 302 vers le lien Supabase frais : le navigateur enchaîne vers
  // /verify, puis revient avec les tokens (gérés par RecoveryHashHandler).
  return NextResponse.redirect(actionLink);
}

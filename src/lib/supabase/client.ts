import { createBrowserClient } from "@supabase/ssr";

// Client Supabase côté navigateur basé sur @supabase/ssr : à la différence du
// client supabase-js brut (persistSession → localStorage), celui-ci écrit la
// session dans les COOKIES sb-*. C'est indispensable pour les liens
// d'activation / de récupération : le RecoveryHashHandler appelle setSession
// ici, puis redirige vers /connexion/reinitialiser — une page SERVEUR qui relit
// les cookies pour décider d'afficher le formulaire ou « lien invalide ». Sans
// cookies, le serveur ne voyait jamais la session et les clients recevaient
// « Ce lien est invalide ou a expiré » alors même que leur token était bon.
export function createBrowserAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase n'est pas encore configuré.");
  }
  // isSingleton (défaut) : une seule instance GoTrueClient dans l'app, les
  // rafraîchissements et événements d'auth sont partagés partout.
  return createBrowserClient(url, key);
}

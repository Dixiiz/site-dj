"use client";

// Les liens d'activation / de récupération générés via l'API admin (envoyés
// par Resend) reviennent de Supabase avec les tokens de session dans le
// fragment d'URL (#access_token=…) — invisible côté serveur. Supabase peut de
// plus écraser le redirect_to vers la racine du site quand l'URL demandée
// n'est pas dans ses « Redirect URLs ». Ce composant, monté globalement,
// établit la session dans le navigateur (cookies sb-*), nettoie l'URL, puis
// envoie l'utilisateur vers la bonne page selon le type de lien.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserAuthClient } from "@/lib/supabase/client";

export function RecoveryHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash.includes("access_token=")) return;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    const type = params.get("type");
    const supabase = createBrowserAuthClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .catch(() => null)
      .then(() => {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        const cible = type === "signup" ? "/mon-espace" : "/connexion/reinitialiser";
        // CAS CRITIQUE : si le navigateur est DÉJÀ sur la page cible (atterrissage
        // direct depuis Supabase quand redirect_to est accepté), router.replace()
        // vers la même URL est un no-op — le rendu serveur ne relit jamais les
        // cookies tout juste écrits et le client voit « lien invalide » alors
        // que sa session est active. Un paramètre anti-cache force une vraie
        // navigation (requête RSC fraîche qui porte les cookies de session).
        if (window.location.pathname === cible) {
          router.replace(`${cible}?_r=${Date.now()}`);
        } else {
          router.replace(cible);
        }
      });
  }, [router]);

  return null;
}

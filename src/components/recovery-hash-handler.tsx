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
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(() => {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      // Récupération de mot de passe → formulaire de nouveau mot de passe.
      // Activation de compte → espace client (le lien atterrit parfois sur la
      // racine du site à cause du redirect_to écrasé par Supabase).
      if (type === "recovery") {
        router.replace("/connexion/reinitialiser");
      } else if (type === "signup") {
        router.replace("/mon-espace");
      } else {
        router.refresh();
      }
    });
  }, [router]);

  return null;
}

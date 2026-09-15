import { createClient } from "@supabase/supabase-js";

// Client Supabase côté navigateur : écrit les cookies de session (sb-*) que le
// client serveur relit ensuite. Utilisé pour valider les liens d'activation /
// de récupération qui reviennent avec des tokens dans le fragment d'URL (#).
export function createBrowserAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase n'est pas encore configuré.");
  }
  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}
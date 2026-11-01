import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rafraîchit la session Supabase à chaque requête (convention Next 16 : proxy).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Déclenche le rafraîchissement du token si nécessaire.
  // Garde-fou : si l'API auth de Supabase rame (incident, latence), on ne
  // bloque JAMAIS la requête plus de 3 s — la page se servira de la session
  // existante, le rafraîchissement se refera à la requête suivante.
  await Promise.race([
    supabase.auth.getUser(),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);

  return response;
}

export const config = {
  matcher: [
    // L'admin utilise son propre cookie de session (dj_admin) : pas besoin de
    // rafraîchir la session Supabase sur ces routes (ni de la subir).
    "/((?!admin(?:/|$)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};

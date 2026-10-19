// Lien enveloppe « première connexion » : le mail envoyé au client ne contient
// PAS le token Supabase (qui expire 1 h après sa génération), mais un lien
// signé vers /connexion/demarrer. Ce n'est qu'au clic que le serveur génère un
// lien Supabase frais — le décompte de 1 h démarre donc au clic, pas à l'envoi.
//
// Format : <payload base64url>.<signature HMAC-SHA256 base64url>
// Payload : { email, iat } — la clé de signature est SUPABASE_SERVICE_ROLE_KEY
// (jamais exposée au client : ce module ne doit être importé que côté serveur).
import { createHmac, timingSafeEqual } from "node:crypto";

// L'enveloppe elle-même reste valable 7 jours ; au-delà, le client doit
// redemander un lien (formulaire de renvoi sur /connexion/reinitialiser).
const VALIDITE_ENVELOPPE_MS = 7 * 24 * 60 * 60 * 1000;

function secretSignature(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante (signature des liens).");
  return secret;
}

/** Génère le token enveloppe pour un e-mail donné. */
export function signerLienPremiereConnexion(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email: email.toLowerCase(), iat: Date.now() })
  ).toString("base64url");
  const signature = createHmac("sha256", secretSignature()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

/** Vérifie un token enveloppe : signature intègre et moins de 7 jours. */
export function verifierLienPremiereConnexion(token: string): { email: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const attendue = createHmac("sha256", secretSignature()).update(payload).digest();
  let recue: Buffer;
  try {
    recue = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (recue.length !== attendue.length || !timingSafeEqual(recue, attendue)) return null;
  try {
    const { email, iat } = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      email?: unknown;
      iat?: unknown;
    };
    if (typeof email !== "string" || typeof iat !== "number") return null;
    if (Date.now() - iat > VALIDITE_ENVELOPPE_MS) return null;
    return { email: email.toLowerCase() };
  } catch {
    return null;
  }
}

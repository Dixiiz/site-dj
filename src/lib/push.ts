// Notifications push de l'admin (Web Push / VAPID).
// Si les clés VAPID ne sont pas configurées, tout est silencieux (no-op).
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured: boolean | null = null;

function isConfigured(): boolean {
  if (configured === null) {
    configured = Boolean(
      process.env.VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.VAPID_SUBJECT
    );
    if (configured) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT!,
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
      );
    }
  }
  return configured;
}

export function getVapidPublicKey(): string {
  return isConfigured() ? process.env.VAPID_PUBLIC_KEY! : "";
}

type AdminPushPayload = { title: string; body: string; url?: string };

/**
 * Envoie une notification push à tous les appareils admin abonnés.
 * Jamais d'exception vers l'appelant : le push ne doit jamais faire
 * échouer une action métier. Les abonnements morts (404/410) sont purgés.
 */
export async function notifyAdminPush(payload: AdminPushPayload): Promise<void> {
  try {
    if (!isConfigured()) return;
    const supabase = createAdminClient();
    const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
    if (!subs || subs.length === 0) return;

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/admin",
    });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          // Abonnement expiré ou révoqué : on le retire de la base.
          if (status === 404 || status === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          } else {
            console.error("[push] Echec envoi:", status ?? err);
          }
        }
      })
    );
  } catch (err) {
    console.error("[push] Erreur inattendue:", err);
  }
}

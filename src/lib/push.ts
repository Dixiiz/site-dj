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

export type PushResult = {
  configured: boolean;
  subs: number;
  delivered: number;
  failed: number;
};

// ── Alerte e-mail de secours ────────────────────────────────────────────────
// Si le push est inopérant (clés manquantes, aucun appareil abonné, envois en
// échec), on prévient l'admin PAR E-MAIL pour qu'aucune notification ne passe
// inaperçue comme ça a été le cas. Une seule alerte par type de panne et par
// tranche de 24 h pour ne pas spammer.
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const lastAlertAt = new Map<string, number>();

async function alertPushOutage(reason: string, detail: string): Promise<void> {
  const to = process.env.NOTIF_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!to || !apiKey) {
    // Pas de canal e-mail disponible : au minimum, log visible dans Vercel.
    console.error(`[push] PANNE PUSH (${reason}) — alerte e-mail impossible (${detail})`);
    return;
  }
  const now = Date.now();
  const last = lastAlertAt.get(reason) ?? 0;
  if (now - last < ALERT_COOLDOWN_MS) return;
  lastAlertAt.set(reason, now);
  try {
    const { EMAIL_FROM } = await import("@/lib/emails");
    const { Resend } = await import("resend");
    await new Resend(apiKey).emails.send({
      from: EMAIL_FROM,
      to,
      subject: `⚠️ Notifications push inopérantes — ${reason}`,
      html: `<p>Les <strong>notifications push</strong> du site ne fonctionnent pas : tu risques de manquer des devis, messages ou paiements (tu reçois encore les e-mails, mais pas les push).</p>
<p><strong>Cause détectée :</strong> ${detail}</p>
<ul>
<li>Clés VAPID manquantes → vérifie les variables <code>VAPID_PUBLIC_KEY</code>, <code>VAPID_PRIVATE_KEY</code>, <code>VAPID_SUBJECT</code> sur Vercel puis redéploie.</li>
<li>Aucun appareil abonné → ouvre <a href="https://propulsounddj.fr/admin">l'admin</a> et clique sur « 🔔 Activer les notifications push ».</li>
<li>Envois en échec → teste avec <code>node scripts/test-push.mjs</code> et consulte les logs Vercel.</li>
</ul>
<p><em>(Alerte envoyée une fois maximum toutes les 24 h tant que le problème persiste.)</em></p>`,
    });
    console.error(`[push] PANNE PUSH (${reason}) — alerte e-mail envoyée à l'admin (${detail})`);
  } catch (err) {
    console.error(`[push] PANNE PUSH (${reason}) — echec envoi alerte:`, err);
  }
}

/**
 * Envoie une notification push à tous les appareils admin abonnés.
 * Jamais d'exception vers l'appelant : le push ne doit jamais faire
 * échouer une action métier. Les abonnements morts (404/410) sont purgés.
 * Retourne un résultat détaillé et déclenche une alerte e-mail si le push
 * est inopérant (voir alertPushOutage).
 */
export async function notifyAdminPush(payload: AdminPushPayload): Promise<PushResult> {
  const base: PushResult = { configured: true, subs: 0, delivered: 0, failed: 0 };
  try {
    if (!isConfigured()) {
      base.configured = false;
      await alertPushOutage(
        "clés VAPID manquantes",
        "les variables VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT ne sont pas configurées sur cet environnement."
      );
      return base;
    }
    const supabase = createAdminClient();
    const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
    base.subs = subs?.length ?? 0;
    if (!subs || subs.length === 0) {
      await alertPushOutage(
        "aucun appareil abonné",
        "aucun appareil n'est abonné aux notifications (table push_subscriptions vide) — réactive les notifications depuis l'admin (bouton 🔔)."
      );
      return base;
    }

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/admin",
    });

    const failures: number[] = [];
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body
          );
          base.delivered += 1;
        } catch (err) {
          base.failed += 1;
          const status = (err as { statusCode?: number }).statusCode;
          // Abonnement expiré ou révoqué : on le retire de la base.
          if (status === 404 || status === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          } else {
            failures.push(status ?? -1);
            console.error("[push] Echec envoi:", status ?? err);
          }
        }
      })
    );

    if (base.delivered === 0 && base.failed > 0) {
      await alertPushOutage(
        "échec d'envoi",
        `${base.failed} envoi(s) de push ont échoué (codes ${failures.join(", ")}) sur ${base.subs} appareil(s) abonné(s).`
      );
    }
    return base;
  } catch (err) {
    base.failed += 1;
    console.error("[push] Erreur inattendue:", err);
    await alertPushOutage("erreur inattendue", String(err instanceof Error ? err.message : err));
    return base;
  }
}

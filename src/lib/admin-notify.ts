// Notification admin centralisée : push (Web Push) + e-mail optionnel.
// Jamais d'exception vers l'appelant : une notification ne doit jamais faire
// échouer une action métier (signature, paiement, demande…).
import { EMAIL_FROM } from "@/lib/emails";

type AdminNotification = {
  title: string;
  body: string;
  url?: string;
  // E-mail optionnel vers NOTIF_EMAIL (l'admin).
  email?: { subject: string; html: string };
};

export async function notifyAdmin(n: AdminNotification): Promise<void> {
  try {
    const { notifyAdminPush } = await import("@/lib/push");
    await notifyAdminPush({ title: n.title, body: n.body, url: n.url ?? "/admin" });
  } catch {
    // push best effort
  }

  try {
    const to = process.env.NOTIF_EMAIL;
    const apiKey = process.env.RESEND_API_KEY;
    if (n.email && apiKey && to) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject: n.email.subject,
        html: n.email.html,
        text: n.email.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
      });
    }
  } catch {
    // e-mail best effort
  }
}

import { sendScheduledEmails } from "@/lib/email-jobs";

// Tâche planifiée (Cron Vercel, 9h chaque jour) :
//  - relance J+10 des devis non confirmés
//  - demande d'avis après les soirées
// Protégée par CRON_SECRET si défini (Bearer token).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }
  }
  const result = await sendScheduledEmails();
  return Response.json({ ok: true, ...result });
}

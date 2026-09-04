import { sendScheduledEmails, backupSignedDocuments } from "@/lib/email-jobs";

// Tâche planifiée (Cron Vercel, 9h chaque jour) :
//  - relance J+10 des devis non confirmés
//  - relance acompte J+5 après signature
//  - rappel J-7 avant les soirées confirmées
//  - demande d'avis après les soirées
//  - sauvegarde des documents signés récents (bucket « backups »)
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
  const backup = await backupSignedDocuments();
  return Response.json({ ok: true, ...result, backup });
}

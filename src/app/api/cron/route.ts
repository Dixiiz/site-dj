import { sendScheduledEmails, backupSignedDocuments, runEcheanceReminders } from "@/lib/email-jobs";

// Tâche planifiée (Cron Vercel, 9h chaque jour) :
//  - relance J+10 des devis non confirmés
//  - relance acompte J+5 après signature
//  - rappel J-30 playlist vide (avant les soirées confirmées)
//  - rappel J-7 avant les soirées confirmées (renforcé si playlist vide)
//  - demande d'avis après les soirées
//  - rappels d'échéances J-3 (paiement en plusieurs fois)
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
  const echeances = await runEcheanceReminders();
  const backup = await backupSignedDocuments();
  return Response.json({ ok: true, ...result, echeances, backup });
}

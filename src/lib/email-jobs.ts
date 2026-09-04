// Tâches e-mail planifiées (exécutées chaque jour via le Cron Vercel,
// et en secours à l'ouverture de l'admin) :
//  1. J+10 : relance aux clients dont le devis est toujours en cours,
//     avec rappel de validité (15 jours) et lien pour demander plus de temps.
//  2. Après la soirée : demande d'avis Google / Mariages.net.
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml, buildEmailText, stepsSection, EMAIL_FROM } from "@/lib/emails";
import { SITE_URL as SITE } from "@/lib/site-url";

const MARK_RELANCE = "[[relance-10j:";
const MARK_AVIS = "[[demande-avis:";
const MARK_ACOMPTE = "[[relance-acompte:";

async function sendEmail(to: string, subject: string, emailData: Parameters<typeof buildEmailHtml>[0]) {
  const { Resend } = await import("resend");
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIF_EMAIL;
  if (!apiKey || !from) return false;
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    replyTo: to,
    to,
    subject,
    html: buildEmailHtml(emailData),
    text: buildEmailText(emailData),
  });
  if (error) {
    console.error("[email-jobs] Echec envoi:", error);
    return false;
  }
  return true;
}

function addMarker(notes: string | null, marker: string): string {
  const stamp = `${marker}${new Date().toISOString().slice(0, 10)}]]`;
  return stamp + (notes ? `\n${notes}` : "");
}

export async function sendScheduledEmails(): Promise<{ relances: number; avis: number; acomptes: number }> {
  const supabase = createAdminClient();
  let relances = 0;
  let avis = 0;
  let acomptes = 0;

  const now = Date.now();
  const tenDaysAgo = new Date(now - 10 * 86400_000).toISOString();

  // ---------- 1. Relance J+10 ----------
  const { data: toRemind } = await supabase
    .from("quotes")
    .select("id, customer_name, customer_email, event_date, formula_name, status, notes")
    .in("status", ["nouveau", "contacte", "attente_signature", "attente_acompte"])
    .lt("created_at", tenDaysAgo)
    .limit(20);

  for (const q of toRemind ?? []) {
    if ((q.notes ?? "").includes(MARK_RELANCE)) continue;
    if (!q.customer_email) continue;
    if (q.event_date && new Date(q.event_date).getTime() < now) continue;

    const eventFr = q.event_date
      ? new Date(q.event_date).toLocaleDateString("fr-FR", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        })
      : null;
    const ok = await sendEmail(q.customer_email, "⏳ Votre devis Propul'Sound DJ — pensez à valider !", {
      title: "Votre devis vous attend toujours",
      emoji: "⏳",
      intro: `Bonjour ${q.customer_name ?? ""},<br/><br/>Il y a maintenant <strong>10 jours</strong>, vous nous avez fait part de votre projet${eventFr ? ` pour le <strong>${eventFr}</strong>` : ""} (${q.formula_name ?? "prestation"}).<br/><br/><strong>Votre devis est valable 15 jours</strong> après la demande : passé ce délai, les tarifs et la disponibilité pourraient être réévalués.`,
      sections: [
        {
          title: "Important",
          lines: [
            "La <strong>date peut partir à tout moment</strong> pour quelqu'un d'autre : elle n'est réservée qu'à la <strong>signature des documents</strong>.",
            "Besoin d'un peu plus de temps ? <strong>Cliquez sur le bouton ci-dessous</strong> : un e-mail pré-rempli s'ouvre, vous n'avez qu'à l'envoyer.",
          ],
        },
        stepsSection(q.status ?? "contacte"),
      ],
      button: {
        label: "Demander un peu plus de temps",
        href: `mailto:contact@propulsounddj.fr?subject=${encodeURIComponent("Demande de prolongation de devis")}&body=${encodeURIComponent(`Bonjour,\n\nNous sommes toujours intéressés par notre devis${eventFr ? ` pour le ${eventFr}` : ""}, mais nous aurions besoin de quelques jours de plus pour nous décider.\n\nMerci d'avance !\n\n${q.customer_name ?? ""}`)}`,
      },
      footer: "Une question ? Répondez à cet e-mail, je vous réponds rapidement. — Maxime",
    });
    if (ok) {
      relances++;
      await supabase
        .from("quotes")
        .update({ notes: addMarker(q.notes, MARK_RELANCE) })
        .eq("id", q.id);
    }
  }

  // ---------- 1 bis. Relance acompte J+5 après signature ----------
  const fiveDaysAgo = new Date(now - 5 * 86400_000).toISOString();

  const { data: awaitingDeposit } = await supabase
    .from("quotes")
    .select("id, customer_name, customer_email, event_date, notes")
    .eq("status", "attente_acompte")
    .limit(50);

  for (const q of awaitingDeposit ?? []) {
    if ((q.notes ?? "").includes(MARK_ACOMPTE)) continue;
    if (!q.customer_email) continue;

    // Date de référence : la dernière signature de document (devis/contrat)
    const { data: signedFiles } = await supabase
      .from("quote_files")
      .select("signed_at")
      .eq("quote_id", q.id)
      .eq("doc_kind", "a_signer")
      .not("signed_at", "is", null)
      .order("signed_at", { ascending: false })
      .limit(1);
    const signedAt = signedFiles?.[0]?.signed_at as string | undefined;
    if (!signedAt || signedAt > fiveDaysAgo) continue;

    const eventFr = q.event_date
      ? new Date(q.event_date).toLocaleDateString("fr-FR", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        })
      : null;

    const ok = await sendEmail(q.customer_email, "💳 Dernière étape : l'acompte de réservation", {
      title: "Il ne manque plus que l'acompte !",
      emoji: "💳",
      intro: `Bonjour ${q.customer_name ?? ""},<br/><br/>Vos documents sont signés${eventFr ? ` pour le <strong>${eventFr}</strong>` : ""}, il ne reste qu'<strong>une seule chose</strong> à faire : l'<strong>acompte de réservation (20 %)</strong>.<br/><br/>C'est lui qui <strong>verrouille définitivement votre date</strong> : tant qu'il n'est pas reçu, la soirée peut malheureusement être <strong>attribuée à quelqu'un d'autre</strong>.`,
      sections: [
        {
          title: "Comment faire (2 minutes)",
          lines: [
            "1. Connectez-vous à votre <strong>espace client</strong>",
            "2. Cliquez sur le bouton <strong style=\"color:#219653;\">« ✅ J'ai envoyé l'acompte »</strong> (l'IBAN pour le virement y est indiqué)",
            "3. C'est tout : votre date est <strong>bloquée pour vous</strong> !",
          ],
        },
        stepsSection("attente_acompte"),
      ],
      button: { label: "Régler mon acompte maintenant", href: `${SITE}/connexion?next=${encodeURIComponent(`/mon-espace/devis/${q.id}#acompte`)}` },
      footer: "Un souci ou une question ? Répondez à cet e-mail, on trouve une solution ensemble. — Maxime",
    });
    if (ok) {
      acomptes++;
      await supabase
        .from("quotes")
        .update({ notes: addMarker(q.notes, MARK_ACOMPTE) })
        .eq("id", q.id);
    }
  }

  // ---------- 2. Demande d'avis après la soirée ----------
  const yesterday = new Date(now - 1 * 86400_000).toISOString().slice(0, 10);
  const monthAgo = new Date(now - 30 * 86400_000).toISOString().slice(0, 10);

  const { data: toReview } = await supabase
    .from("quotes")
    .select("id, customer_name, customer_email, event_date, notes")
    .eq("status", "confirme")
    .gte("event_date", monthAgo)
    .lte("event_date", yesterday)
    .limit(20);

  for (const q of toReview ?? []) {
    if ((q.notes ?? "").includes(MARK_AVIS)) continue;
    if (!q.customer_email) continue;

    const eventFr = q.event_date
      ? new Date(q.event_date).toLocaleDateString("fr-FR")
      : null;
    const ok = await sendEmail(q.customer_email, "🌟 Merci pour cette soirée ! Votre avis compte énormément", {
      title: "Merci pour cette soirée !",
      emoji: "🌟",
      intro: `Bonjour ${q.customer_name ?? ""},<br/><br/>J'espère que cette soirée${eventFr ? ` du <strong>${eventFr}</strong>` : ""} restera un beau souvenir !<br/><br/>Ce fut un plaisir d'animer votre événement. <strong>Votre avis compte énormément</strong> pour un DJ indépendant comme moi : c'est ce qui permet aux futurs mariés et organisateurs de me faire confiance.`,
      sections: [
        {
          title: "2 minutes pour m'aider",
          lines: [
            `⭐ <a href="https://g.page/r/CYgCQMSAgDcWEAE/review" style="color:#21619A;"><strong>Laisser un avis Google</strong></a> — le plus utile pour me faire connaître`,
            `⭐ <a href="https://www.mariages.net/musique-mariage/propulsound-dj--e366139" style="color:#21619A;"><strong>Laisser un avis Mariages.net</strong></a> — pour les couples en préparation`,
            "🎬 Et si vous avez des photos ou vidéos de la piste de danse, je suis preneur !",
          ],
        },
      ],
      button: { label: "Laisser un avis Google (2 min)", href: "https://g.page/r/CYgCQMSAgDcWEAE/review" },
      footer: "Encore merci pour votre confiance, et à une prochaine soirée peut-être ! — Maxime, Propul'Sound DJ",
    });
    if (ok) {
      avis++;
      await supabase
        .from("quotes")
        .update({ notes: addMarker(q.notes, MARK_AVIS) })
        .eq("id", q.id);
    }
  }

  return { relances, avis, acomptes };
}

// One-off : renvoie la demande d'avis post-soirée à un client précis
// (le cron ne renvoie jamais si le marqueur [[avis-ok]] / [[demande-avis:…]]
// est déjà dans les notes). Réutilise les vrais gabarits de src/lib/emails.
// Usage : npx tsx scripts/resend-avis.ts <quote-id>
import { buildEmailHtml, buildEmailText, EMAIL_FROM } from "../src/lib/emails";

// Chargement manuel de .env.local (tsx ne le fait pas).
import { readFileSync } from "node:fs";
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const t = line.trim();
  if (t && !t.startsWith("#") && t.includes("=")) {
    const [k, ...rest] = t.split("=");
    process.env[k.trim()] ??= rest.join("=").replace(/^"|"$/g, "");
  }
}

const quoteId = process.argv[2];
if (!quoteId) throw new Error("Usage : npx tsx scripts/resend-avis.ts <quote-id>");

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

const qRes = await fetch(
  `${SB}/rest/v1/quotes?id=eq.${quoteId}&select=id,customer_name,customer_email,event_date,notes`,
  { headers: sbHeaders }
);
if (!qRes.ok) throw new Error(`Supabase ${qRes.status} : ${await qRes.text()}`);
const q = (await qRes.json())[0] as
  | { customer_name: string | null; customer_email: string | null; event_date: string | null; notes: string | null }
  | undefined;
if (!q) throw new Error("Devis introuvable.");
if (!q.customer_email) throw new Error("Devis sans e-mail client.");

const eventFr = q.event_date ? new Date(q.event_date).toLocaleDateString("fr-FR") : null;

const emailData = {
  title: "Merci pour cette soirée !",
  emoji: "",
  intro: `Bonjour ${q.customer_name ?? ""},<br/><br/>J'espère que cette soirée${eventFr ? ` du <strong>${eventFr}</strong>` : ""} restera un beau souvenir !<br/><br/>Ce fut un plaisir d'animer votre événement. <strong>Votre avis compte énormément</strong> pour un DJ indépendant comme moi : c'est ce qui permet aux futurs mariés et organisateurs de me faire confiance.`,
  sections: [
    {
      title: "2 minutes pour m'aider",
      lines: [
        `<a href="https://g.page/r/CYgCQMSAgDcWEAE/review" style="color:#21619A;"><strong>Laisser un avis Google</strong></a> — le plus utile pour me faire connaître`,
        `<a href="https://www.mariages.net/musique-mariage/propulsound-dj--e366139" style="color:#21619A;"><strong>Laisser un avis Mariages.net</strong></a> — pour les couples en préparation`,
        "Et si vous avez des photos ou vidéos de la piste de danse, je suis preneur !",
      ],
    },
  ],
  button: { label: "Laisser un avis Google (2 min)", href: "https://g.page/r/CYgCQMSAgDcWEAE/review" },
  footer: "Encore merci pour votre confiance, et à une prochaine soirée peut-être ! — Maxime, Propul'Sound DJ",
};

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: EMAIL_FROM,
    reply_to: q.customer_email,
    to: q.customer_email,
    subject: "Merci pour cette soirée ! Votre avis compte énormément",
    html: buildEmailHtml(emailData),
    text: buildEmailText(emailData),
  }),
});
const out = (await res.json()) as { id?: string; message?: string; name?: string };
if (!res.ok) throw new Error(`Resend ${res.status} : ${JSON.stringify(out)}`);
console.log(`E-mail envoyé à ${q.customer_email} ✓ (id ${out.id})`);

// Traçabilité dans les notes (même convention que addMarker du cron).
const stamp = `[[avis-renvoye:${new Date().toISOString().slice(0, 10)}]]`;
const newNotes = q.notes?.includes("[[avis-renvoye:")
  ? q.notes
  : stamp + (q.notes ? `\n${q.notes}` : "");
if (newNotes !== q.notes) {
  const patch = await fetch(`${SB}/rest/v1/quotes?id=eq.${quoteId}`, {
    method: "PATCH",
    headers: { ...sbHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ notes: newNotes }),
  });
  if (!patch.ok) throw new Error(`Notes non mises à jour : ${patch.status}`);
  console.log("Notes mises à jour (marqueur [[avis-renvoye]]) ✓");
}

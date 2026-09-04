// Gabarits e-mail HTML Propul'Sound DJ — utilisés avec Resend.
// Table-based (compatible Gmail / Outlook), images inline, boutons CTA.
import { SITE_URL } from "@/lib/site-url";

const LOGO_URL = `${SITE_URL}/logo-bleu-transparent.png`;

// Expéditeur unique de tous les e-mails : le domaine du site (vérifié sur
// Resend). Ne JAMAIS utiliser une adresse gmail.com comme expéditeur :
// Resend refuse (domaine non vérifiable).
export const EMAIL_FROM = "Propul'Sound DJ <contact@propulsounddj.fr>";

// Couleurs de la charte (cf. devis PDF)
const COLORS = {
  anthracite: "#2E363D",
  bleu: "#21619A",
  cyan: "#4AB8D9",
  fond: "#F5F7FA",
  texte: "#1A1A1F",
  gris: "#737880",
  vert: "#219653",
  rouge: "#BF3333",
};

type Button = { label: string; href: string };

type Section = {
  title?: string;
  lines: string[]; // HTML simple autorisé : <strong>, <em>, <br>
  color?: string; // couleur des puces d'icône/titre
};

/**
 * Construit un e-mail HTML complet à partir de blocs simples.
 * Compatible clients mail conservateurs (tables + styles inline).
 */
export function buildEmailHtml(opts: {
  title: string; // gros titre sous le logo
  emoji?: string;
  intro: string; // paragraphe d'introduction
  sections?: Section[]; // blocs « carte » (infos, options…)
  button?: Button; // gros bouton d'action
  footer?: string; // ligne de rappel après le bouton
}): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const sectionsHtml = (opts.sections ?? [])
    .map(
      (s) => `
      <tr><td style="padding:0 0 14px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #E3E7EB;border-radius:12px;">
          ${s.title ? `<tr><td style="padding:14px 18px 2px 18px;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1px;color:${COLORS.bleu};text-transform:uppercase;">${esc(s.title)}</td></tr>` : ""}
          <tr><td style="padding:8px 18px 16px 18px;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:${COLORS.texte};">
            ${s.lines.map((l) => `<p style="margin:6px 0;">${l}</p>`).join("\n")}
          </td></tr>
        </table>
      </td></tr>`
    )
    .join("\n");

  const buttonHtml = opts.button
    ? `
    <tr><td align="center" style="padding:6px 0 20px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td align="center" bgcolor="${COLORS.bleu}" style="border-radius:10px;">
          <a href="${esc(opts.button.href)}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">
            ${esc(opts.button.label)} &nbsp;&rarr;
          </a>
        </td>
      </tr></table>
    </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title>
<!-- Police du site (Fjalla One) : les clients qui la bloquent retombent sur Arial Narrow -->
<link href="https://fonts.googleapis.com/css2?family=Fjalla+One&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:${COLORS.fond};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.fond};">
<tr><td align="center" style="padding:24px 12px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
    <!-- Bandeau logo + nom (anthracite, police du site Fjalla One) -->
    <tr><td align="center" bgcolor="${COLORS.anthracite}" style="padding:24px 0 22px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
        <td style="vertical-align:middle;padding-right:14px;">
          <img src="${LOGO_URL}" alt="Propul'Sound DJ" width="64" style="display:block;border:0;" />
        </td>
        <td style="vertical-align:middle;font-family:'Fjalla One','Arial Narrow',Arial,sans-serif;font-size:30px;letter-spacing:1px;color:#FFFFFF;">
          Propul&apos;Sound <span style="color:${COLORS.cyan};">DJ</span>
        </td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="${COLORS.cyan}" style="height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- Titre -->
    <tr><td align="center" style="padding:28px 30px 6px 30px;font-family:Arial,sans-serif;">
      <h1 style="margin:0;font-size:23px;line-height:30px;color:${COLORS.anthracite};font-weight:bold;">
        ${opts.emoji ? `${opts.emoji} ` : ""}${esc(opts.title)}
      </h1>
    </td></tr>

    <!-- Intro -->
    <tr><td style="padding:8px 30px 4px 30px;font-family:Arial,sans-serif;font-size:15px;line-height:24px;color:${COLORS.texte};">
      ${opts.intro}
    </td></tr>

    <!-- Sections -->
    ${sectionsHtml}

    <!-- Bouton -->
    ${buttonHtml}

    <!-- Une question ? -->
    <tr><td align="center" style="padding:4px 30px 26px 30px;font-family:Arial,sans-serif;font-size:13px;line-height:20px;color:${COLORS.gris};">
      <strong style="color:${COLORS.texte};">Une question ?</strong>
      Répondez simplement à cet e-mail, ou écrivez-nous à
      <a href="mailto:contact@propulsounddj.fr" style="color:${COLORS.bleu};">contact@propulsounddj.fr</a>.
    </td></tr>
  </table>

  <!-- Pied hors carte -->
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td align="center" style="padding:16px 10px 6px 10px;font-family:Arial,sans-serif;font-size:11px;line-height:17px;color:${COLORS.gris};">
      ${opts.footer ? `${esc(opts.footer)}<br/>` : ""}
      Propul'Sound DJ — DJ &amp; animations événementielles<br/>
      <a href="${SITE_URL}" style="color:${COLORS.bleu};text-decoration:none;">${SITE_URL.replace("https://", "")}</a>
      &nbsp;·&nbsp; Huisseau-sur-Cosson (41350)
    </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;
}

/** Version texte brut de secours, dérivée des mêmes données. */
export function buildEmailText(opts: {
  intro: string;
  sections?: Section[];
  button?: Button;
}): string {
  const strip = (s: string) => s.replace(/<[^>]*>/g, "");
  const parts: string[] = [strip(opts.intro), ""];
  for (const s of opts.sections ?? []) {
    if (s.title) parts.push(s.title.toUpperCase());
    for (const l of s.lines) parts.push("- " + strip(l));
    parts.push("");
  }
  if (opts.button) parts.push(`${opts.button.label} : ${opts.button.href}`, "");
  parts.push("Une question ? Répondez simplement à cet e-mail.");
  return parts.join("\n");
}

// ---------- Parcours de réservation ----------

export const QUOTE_STEPS: { key: string; label: string }[] = [
  { key: "nouveau", label: "Réception de votre demande de devis" },
  { key: "contacte", label: "Échange & devis personnalisé" },
  { key: "attente_signature", label: "Signature du devis et du contrat (déblocage de votre playlist)" },
  { key: "attente_acompte", label: "Acompte de réservation (20 %)" },
  { key: "confirme", label: "Devis confirmé — date bloquée, préparation de la soirée !" },
];

/**
 * Section « étapes » avec coche verte pour les étapes passées, la pastille
 * colorée pour l'étape en cours, et les suivantes en gris.
 * current : statut du devis APRÈS la transition (ex : "attente_acompte").
 */
export function stepsSection(current: string): Section {
  const idx = QUOTE_STEPS.findIndex((s) => s.key === current);
  return {
    title: "Votre parcours de réservation",
    lines: QUOTE_STEPS.map((step, i) => {
      const done = i < idx;
      const active = i === idx;
      if (done) return `<span style="color:${COLORS.vert};">✔</span> ${step.label} — <strong style="color:${COLORS.vert};">fait</strong>`;
      if (active) return `<strong style="color:${COLORS.bleu};">➜ ${step.label} — <span style="color:${COLORS.bleu};">en cours</span></strong>`;
      return `<span style="color:${COLORS.gris};">○ ${step.label}</span>`;
    }),
  };
}


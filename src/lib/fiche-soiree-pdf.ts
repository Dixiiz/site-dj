// Fiche soirée Propul'Sound DJ — récapitulatif PDF pour l'admin :
// événement, client, options, musiques par temps fort, blacklist et
// conversation client. Même charte que le devis / contrat / facture.
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFImage } from "pdf-lib";

export type FicheTrack = {
  moment: string;
  title: string;
  artist: string | null;
  kind: string; // "souhait" | "blacklist"
};

export type FicheMessage = {
  sender: string; // "client" | "admin"
  body: string;
  created_at: string;
};

export type FicheOption = {
  name: string;
  qty?: number | null;
  price_cents: number;
};

export type FicheSoireeData = {
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  event_type?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  event_location?: string | null;
  formula_name?: string | null;
  total_cents?: number | null;
  travel_distance_km?: number | null;
  travel_fee_cents?: number | null;
  extra_fee_cents?: number | null;
  notes?: string | null;
  timeline?: { time: string; label: string }[] | null;
  options?: FicheOption[] | null;
  tracks?: FicheTrack[] | null;
  messages?: FicheMessage[] | null;
};

const C = {
  anthracite: rgb(0.18, 0.21, 0.24),
  bleu: rgb(0.13, 0.38, 0.6),
  bleuPale: rgb(0.9, 0.94, 0.97),
  cyan: rgb(0.29, 0.72, 0.85),
  gris: rgb(0.45, 0.47, 0.5),
  grisLigne: rgb(0.8, 0.82, 0.84),
  rouge: rgb(0.75, 0.2, 0.2),
  texte: rgb(0.1, 0.1, 0.12),
  blanc: rgb(1, 1, 1),
};

const M = 50;
const W = 595.28, H = 841.89;
const CW = W - 2 * M;

// Les polices standard PDF encodent en WinAnsi : on retire emojis et
// caractères hors Latin-1 pour éviter un crash de génération.
const clean = (s: string) =>
  s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[^\u0000-\u00FF\u20AC\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC]/g, "");

const DANCE = "Soirée / Piste de danse";

export async function buildFicheSoireePdf(data: FicheSoireeData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Fiche soirée — ${data.customer_name ?? ""} ${data.event_date ?? ""}`);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const r = await doc.embedFont(StandardFonts.Helvetica);

  let page = doc.addPage([W, H]);
  let y = 0; // position courante (bord bas du contenu)

  const newPage = () => {
    page = doc.addPage([W, H]);
    y = H - M;
  };

  // Logo (fichier statique du projet)
  let logo: PDFImage | null = null;
  try {
    logo = await doc.embedPng(fs.readFileSync(path.join(process.cwd(), "public", "logo.png")));
  } catch { logo = null; }

  // ---- En-tête (première page uniquement) ----
  page.drawRectangle({ x: 0, y: H - 110, width: W, height: 110, color: C.anthracite });
  page.drawRectangle({ x: 0, y: H - 114, width: W, height: 4, color: C.cyan });
  if (logo) {
    const lw = 58;
    const lh = (logo.height / logo.width) * lw;
    page.drawImage(logo, { x: M, y: H - 96, width: lw, height: Math.min(lh, 76) });
  }
  const t = (txt: string, x: number, yy: number, size: number, font: PDFFont, color = C.texte) =>
    page.drawText(clean(txt), { x, y: yy, size, font, color });

  t("FICHE SOIREE", M + 76, H - 52, 22, b, C.blanc);
  t("Recapitulatif de la soiree - document interne", M + 76, H - 70, 9, r, rgb(0.75, 0.78, 0.8));
  t(`Genere le ${new Date().toLocaleDateString("fr-FR")}`, M + 76, H - 84, 8, r, C.cyan);

  const width = (txt: string, size: number, font: PDFFont) => font.widthOfTextAtSize(clean(txt), size);

  // Ligne « label : valeur » avec retour à la ligne si trop long.
  const line = (label: string, value: string, indent = M) => {
    const size = 9.5;
    const maxW = CW - (indent - M) - width(label, size, b) - 8;
    let text = value;
    let lab = label;
    while (width(text, size, r) > maxW && text.includes(" ")) {
      let cut = text.length;
      while (cut > 0 && width(text.slice(0, cut), size, r) > maxW) cut--;
      const space = text.lastIndexOf(" ", cut);
      const head = space > 0 ? text.slice(0, space) : text.slice(0, cut);
      t(`${lab} ${head}`, indent, y, size, r);
      y -= 13;
      text = space > 0 ? text.slice(space + 1) : text.slice(cut);
      lab = " ";
    }
    t(`${lab} ${text}`, indent, y, size, r);
    y -= 13;
  };

  // Titre de section barré, avec saut de page si nécessaire.
  const section = (title: string) => {
    if (y < M + 90) newPage();
    y -= 10;
    page.drawRectangle({ x: M, y: y - 4, width: CW, height: 18, color: C.bleuPale });
    t(title.toUpperCase(), M + 8, y, 10, b, C.bleu);
    y -= 26;
  };

  // Puce texte multi-lignes.
  const bullet = (text: string, opts: { color?: ReturnType<typeof rgb>; bold?: boolean; indent?: number } = {}) => {
    const size = 9.5;
    const indent = opts.indent ?? M + 14;
    const maxW = CW - (indent - M) - 4;
    const font = opts.bold ? b : r;
    let rest = text.replace(/\r/g, "");
    while (rest.length > 0) {
      if (y < M + 40) newPage();
      let cut = rest.length;
      while (cut > 0 && width(rest.slice(0, cut), size, font) > maxW) cut--;
      const space = rest.lastIndexOf(" ", cut);
      const head = cut === rest.length ? rest : space > 0 ? rest.slice(0, space) : rest.slice(0, cut);
      t(head, indent, y, size, font, opts.color ?? C.texte);
      y -= 13;
      rest = cut === rest.length ? "" : rest.slice(head.length).replace(/^ +/, "");
    }
  };

  const fmtE = (cents: number | null | undefined) =>
    ((cents ?? 0) / 100).toFixed(2).replace(".", ",") + " EUR";

  y = H - 140;

  // ================= ÉVÉNEMENT =================
  section("Evenement");
  const dateFmt = data.event_date
    ? new Date(data.event_date).toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : null;
  if (dateFmt) line("Date :", dateFmt);
  if (data.event_location) line("Lieu :", data.event_location);
  if (data.start_time || data.end_time) {
    line("Horaires :", `${data.start_time ?? "?"} - ${data.end_time ?? "?"}`);
  }
  if (data.formula_name) line("Formule :", data.formula_name);
  if (data.event_type) line("Type :", data.event_type);
  if (data.travel_distance_km) line("Deplacement :", `${data.travel_distance_km} km aller-retour`);
  if (data.total_cents) line("Total de la prestation :", fmtE(data.total_cents));

  // ================= CLIENT =================
  section("Client");
  if (data.customer_name) line("Nom :", data.customer_name);
  if (data.customer_phone) line("Telephone :", data.customer_phone);
  if (data.customer_email) line("E-mail :", data.customer_email);

  // ================= OPTIONS =================
  if (data.options && data.options.length > 0) {
    section("Options retenues");
    for (const opt of data.options) {
      bullet(`${opt.name}${opt.qty && opt.qty > 1 ? ` x${opt.qty}` : ""} (${fmtE(opt.price_cents)})`);
    }
  }

  // ================= TIMELINE DE LA SOIRÉE =================
  const timeline = (data.timeline ?? []).filter((r) => r.label.trim());
  if (timeline.length > 0) {
    section("Timeline de la soiree");
    for (const row of timeline) {
      bullet(`${row.time ? row.time : "--:--"} - ${row.label}`);
    }
  }

  // ================= MUSIQUES =================
  const tracks = data.tracks ?? [];
  if (tracks.length > 0) {
    const danceWish = tracks.filter((tr) => tr.moment === DANCE && tr.kind === "souhait");
    const blacklist = tracks.filter((tr) => tr.kind === "blacklist");

    // Temps forts : tous les moments sauf la piste de danse, dans l'ordre
    // d'apparition, y compris les moments personnalisés du client.
    const moments = [...new Set(
      tracks.map((tr) => tr.moment).filter((m) => m !== DANCE)
    )];

    section("Musiques - temps forts");
    let anyMoment = false;
    for (const moment of moments) {
      const list = tracks.filter((tr) => tr.moment === moment && tr.kind === "souhait");
      if (list.length === 0) continue;
      anyMoment = true;
      if (y < M + 80) newPage();
      t(moment, M + 4, y, 10, b, C.bleu);
      y -= 15;
      for (const tr of list) {
        bullet(`- ${tr.title}${tr.artist ? ` - ${tr.artist}` : ""}`);
      }
      y -= 4;
    }
    if (!anyMoment) bullet("Aucun souhait renseigne pour les temps forts.");

    section(`Piste de danse - a passer (${danceWish.length})`);
    if (danceWish.length === 0) bullet("Aucun titre renseigne.");
    for (const tr of danceWish) {
      bullet(`- ${tr.title}${tr.artist ? ` - ${tr.artist}` : ""}`);
    }

    if (blacklist.length > 0) {
      section(`A ne PAS passer (${blacklist.length})`);
      for (const tr of blacklist) {
        bullet(`- ${tr.title}${tr.artist ? ` - ${tr.artist}` : ""}`, { color: C.rouge });
      }
    }
  } else {
    section("Musiques");
    bullet("Le client n'a pas encore renseigne sa playlist.");
  }

  // ================= MESSAGE DU DEVIS =================
  const noteMessage = (data.notes ?? "").match(/Message : ([\s\S]*)$/)?.[1]?.trim();
  if (noteMessage) {
    section("Message du client (devis)");
    bullet(noteMessage);
  }

  // ================= CONVERSATION =================
  const messages = data.messages ?? [];
  if (messages.length > 0) {
    section("Echanges client / admin");
    for (const msg of messages) {
      if (y < M + 80) newPage();
      const who = msg.sender === "client" ? "CLIENT" : "ADMIN";
      const when = new Date(msg.created_at).toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
      });
      t(`${who} - ${when}`, M + 4, y, 8, b, msg.sender === "client" ? C.bleu : C.gris);
      y -= 13;
      bullet(msg.body, { indent: M + 16 });
      y -= 5;
    }
  }

  // ================= PIED DE PAGE =================
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(
      `Propul'Sound DJ - Fiche soiree interne - page ${i + 1}/${pages.length}`,
      { x: M, y: 24, size: 8, font: r, color: C.gris }
    );
    p.drawRectangle({ x: 0, y: 12, width: W, height: 3, color: C.cyan });
  });

  return doc.save();
}

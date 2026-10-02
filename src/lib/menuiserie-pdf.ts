// ============================================================
// PDF MENUISERIE — charte propre au domaine menuiserie
// (volontairement DIFFÉRENTE de la charte DJ : bandeau brun/bois
// pleine largeur, tableau encadré, total dans un pavé sombre)
// ============================================================
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

export type MenuiserieLine = {
  designation: string;
  quantite: number;
  prixUnitaireCents: number;
};

export type MenuiserieDocData = {
  type: "devis" | "facture";
  numero: string;
  dateEdition: string; // AAAA-MM-JJ
  dateValidite?: string | null;
  clientNom: string;
  clientAdresse: string;
  clientCp: string;
  clientVille: string;
  clientEmail?: string | null;
  clientTelephone?: string | null;
  lignes: MenuiserieLine[];
};

// ===== Identité de l'entreprise (menuiserie) — personnalise ici =====
const ENTREPRISE = {
  nom: "Soulaine Menuiserie",
  activite: "Menuiserie & Agencement sur mesure",
  adresse: "5 Clos de la Salamandre",
  ville: "41350 Huisseau-sur-Cosson",
  telephone: "06 74 85 07 69",
  email: "propulsounddj@gmail.com",
  siret: "93222079100010",
  iban: "FR76 1027 8374 6200 0110 8580 173",
  bic: "CMCIFR2A",
};

const C = {
  brun: rgb(0.29, 0.19, 0.11), // brun bois foncé
  brunClair: rgb(0.92, 0.87, 0.8), // beige clair
  accent: rgb(0.62, 0.4, 0.18), // brun caramel
  gris: rgb(0.45, 0.45, 0.47),
  grisLigne: rgb(0.78, 0.74, 0.68),
  texte: rgb(0.12, 0.11, 0.1),
  blanc: rgb(1, 1, 1),
};

const M = 42;
const W = 595.28, H = 841.89;
const CW = W - 2 * M;

const fmt = (n: number) =>
  n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0") + " €";

export async function buildMenuiseriePdf(doc: MenuiserieDocData): Promise<Uint8Array> {
  const titre = doc.type === "facture" ? "FACTURE" : "DEVIS";
  const doc1 = await PDFDocument.create();
  doc1.setTitle(`${titre} ${ENTREPRISE.nom} — ${doc.numero}`);
  let page = doc1.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.blanc });
  const b = await doc1.embedFont(StandardFonts.HelveticaBold);
  const r = await doc1.embedFont(StandardFonts.Helvetica);

  // Helpers liés à la page courante
  const t = (txt: string, x: number, y: number, size: number, font: PDFFont, color = C.texte) =>
    page.drawText(txt, { x, y, size, font, color });
  const tw = (txt: string, size: number, font: PDFFont) => font.widthOfTextAtSize(txt, size);
  const right = (txt: string, xRight: number, size: number, font: PDFFont) =>
    xRight - tw(txt, size, font);

  // ============ BANDEAU D'EN-TÊTE (pleine largeur, brun bois) ============
  const headH = 96;
  page.drawRectangle({ x: 0, y: H - headH, width: W, height: headH, color: C.brun });
  t(ENTREPRISE.nom, M, H - 38, 20, b, C.blanc);
  t(ENTREPRISE.activite, M, H - 56, 9.5, r, C.brunClair);
  t(`${ENTREPRISE.adresse} · ${ENTREPRISE.ville}`, M, H - 72, 8.5, r, C.brunClair);
  t(
    `${ENTREPRISE.telephone} · ${ENTREPRISE.email} · SIRET ${ENTREPRISE.siret}`,
    M, H - 84, 8.5, r, C.brunClair,
  );
  // Logo éventuel (public/logo-menuiserie.png) — ignoré silencieusement s'il est absent
  try {
    const logoBytes = fs.readFileSync(path.join(process.cwd(), "public", "logo-menuiserie.png"));
    const logo = await doc1.embedPng(logoBytes);
    const ls = 62;
    page.drawImage(logo, { x: W - M - ls - 90, y: H - headH + (headH - ls) / 2, width: ls, height: ls });
  } catch {
    // pas de logo menuiserie : on affiche juste la pastille du type
  }
  // Pastille du type de document
  const label = titre;
  const lw = tw(label, 20, b);
  page.drawRectangle({
    x: W - M - lw - 26, y: H - headH + 22, width: lw + 26, height: 30,
    color: C.accent,
  });
  t(label, W - M - lw - 13, H - headH + 31, 20, b, C.blanc);

  let y = H - headH - 30;

  // ============ BLOC CLIENT + INFOS DOCUMENT ============
  const boxH = 92;
  page.drawRectangle({
    x: M, y: y - boxH, width: CW * 0.52, height: boxH,
    borderColor: C.grisLigne, borderWidth: 0.8, color: C.brunClair,
  });
  t("CLIENT", M + 12, y - 16, 8, b, C.accent);
  t(doc.clientNom || "-", M + 12, y - 34, 11, b, C.texte);
  t(doc.clientAdresse || "-", M + 12, y - 50, 9, r, C.texte);
  t(`${doc.clientCp || ""} ${doc.clientVille || ""}`.trim() || "-", M + 12, y - 63, 9, r, C.texte);
  const contact = [doc.clientEmail, doc.clientTelephone].filter(Boolean).join("  ·  ");
  if (contact) t(contact, M + 12, y - 78, 8.5, r, C.gris);

  const xInfo = M + CW * 0.52 + 14;
  const wInfo = CW - CW * 0.52 - 14;
  page.drawRectangle({
    x: xInfo, y: y - boxH, width: wInfo, height: boxH,
    borderColor: C.grisLigne, borderWidth: 0.8,
  });
  const info = (label2: string, val: string, dy: number) => {
    t(label2, xInfo + 12, y - dy, 8, b, C.accent);
    t(val, right(val, xInfo + wInfo - 12, 9.5, r), y - dy, 9.5, r, C.texte);
  };
  info("N° de document", doc.numero, 18);
  const dateFr = doc.dateEdition
    ? new Date(doc.dateEdition + "T12:00:00").toLocaleDateString("fr-FR")
    : new Date().toLocaleDateString("fr-FR");
  info("Date d'édition", dateFr, 38);
  if (doc.type === "devis") {
    const valFr = doc.dateValidite
      ? new Date(doc.dateValidite + "T12:00:00").toLocaleDateString("fr-FR")
      : "-";
    info("Valable jusqu'au", valFr, 58);
  } else {
    info("Document", "Facture de travaux", 58);
  }

  y -= boxH + 26;


  // ============ TABLEAU DES LIGNES ============
  const drawTableHead = (p: PDFPage) => {
    p.drawRectangle({ x: M, y: y - 20, width: CW, height: 20, color: C.brun });
    p.drawText("DÉSIGNATION", { x: M + 10, y: y - 14, size: 8.5, font: b, color: C.blanc });
    const qte = "QTÉ";
    p.drawText(qte, { x: M + CW - 190 - tw(qte, 8.5, b), y: y - 14, size: 8.5, font: b, color: C.blanc });
    const pu = "PRIX UNITAIRE";
    p.drawText(pu, { x: M + CW - 100 - tw(pu, 8.5, b), y: y - 14, size: 8.5, font: b, color: C.blanc });
    const tot = "TOTAL HT";
    p.drawText(tot, { x: M + CW - 10 - tw(tot, 8.5, b), y: y - 14, size: 8.5, font: b, color: C.blanc });
    y -= 20;
  };
  drawTableHead(page);

  let total = 0;
  for (const ligne of doc.lignes) {
    // Saut de page propre si le tableau déborde
    if (y < 210) {
      page.drawRectangle({ x: 0, y: 12, width: W, height: 3, color: C.brun });
      page = doc1.addPage([W, H]);
      y = H - M - 40;
      page.drawText(`Suite — ${doc.numero}`, { x: M, y: H - 24, size: 10, font: b, color: C.brun });
      drawTableHead(page);
    }
    const qteTxt = String(ligne.quantite).replace(".", ",");
    const puTxt = fmt(ligne.prixUnitaireCents / 100);
    const lineTotal = Math.round(ligne.quantite * ligne.prixUnitaireCents);
    total += lineTotal;
    const totalTxt = fmt(lineTotal / 100);

    // Désignation sur plusieurs lignes si nécessaire
    const maxW = CW - 210;
    const words = ligne.designation.split(" ");
    const rows: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (tw(test, 9.5, r) > maxW) { rows.push(cur); cur = w; } else cur = test;
    }
    if (cur) rows.push(cur);
    if (rows.length === 0) rows.push("-");

    const rowH = Math.max(rows.length * 13 + 8, 24);
    page.drawLine({
      start: { x: M, y: y - rowH }, end: { x: M + CW, y: y - rowH },
      thickness: 0.5, color: C.grisLigne,
    });
    rows.forEach((rowTxt, i) => {
      page.drawText(rowTxt, { x: M + 10, y: y - 14 - i * 13, size: 9.5, font: r, color: C.texte });
    });
    page.drawText(qteTxt, { x: M + CW - 190 - tw(qteTxt, 9.5, r), y: y - 14, size: 9.5, font: r, color: C.texte });
    page.drawText(puTxt, { x: M + CW - 100 - tw(puTxt, 9.5, r), y: y - 14, size: 9.5, font: r, color: C.texte });
    page.drawText(totalTxt, { x: M + CW - 10 - tw(totalTxt, 9.5, b), y: y - 14, size: 9.5, font: b, color: C.texte });
    y -= rowH;
  }

  y -= 14;
  const tvaTxt = "TVA non applicable, article 293 B du CGI";
  page.drawText(tvaTxt, { x: M + CW - 10 - tw(tvaTxt, 8, r), y, size: 8, font: r, color: C.gris });
  y -= 26;

  // ============ TOTAL (pavé sombre) ============
  const bx = M + CW - 260;
  page.drawRectangle({ x: bx, y: y - 10, width: 260, height: 34, color: C.brun });
  const totLabel = doc.type === "facture" ? "TOTAL À RÉGLER" : "TOTAL HT";
  page.drawText(totLabel, { x: bx + 12, y: y + 1, size: 11, font: b, color: C.brunClair });
  const totalTxt2 = fmt(total / 100);
  page.drawText(totalTxt2, { x: bx + 260 - 12 - tw(totalTxt2, 11.5, b), y: y + 1, size: 11.5, font: b, color: C.blanc });
  y -= 44;

  // ============ CONDITIONS ============
  const section = () => {
    page.drawRectangle({ x: M, y: y - 3, width: 3, height: 11, color: C.accent });
    page.drawText(
      doc.type === "devis" ? "CONDITIONS" : "RÈGLEMENT",
      { x: M + 10, y, size: 10.5, font: b, color: C.brun },
    );
    y -= 17;
  };
  section();
  const wrap = (txt: string, size: number, font: PDFFont, maxW: number) => {
    const wordsL = txt.split(" ");
    const lines: string[] = [];
    let curL = "";
    for (const w of wordsL) {
      const test = curL ? curL + " " + w : w;
      if (tw(test, size, font) > maxW) { lines.push(curL); curL = w; } else curL = test;
    }
    if (curL) lines.push(curL);
    return lines;
  };
  const conditionsTxt =
    doc.type === "devis"
      ? "Devis valable jusqu'à la date indiquée ci-dessus. Acompte de 30 % à la commande, solde à la réception des travaux. Prix ferme et définitif, TVA non applicable (art. 293 B du CGI)."
      : "Facture payable par virement bancaire à réception. En cas de retard de paiement, pénalités au taux légal en vigueur et indemnité forfaitaire de recouvrement de 40 € (art. L441-10 du code de commerce). TVA non applicable (art. 293 B du CGI).";
  for (const l of wrap(conditionsTxt, 9, r, CW - 20)) {
    page.drawText(l, { x: M + 10, y, size: 9, font: r, color: C.texte });
    y -= 12;
  }
  y -= 6;

  // ============ COORDONNÉES BANCAIRES ============
  const boxB = 48;
  const yTopB = y - boxB;
  page.drawRectangle({
    x: M, y: yTopB, width: CW, height: boxB,
    borderColor: C.grisLigne, borderWidth: 0.8, color: C.brunClair,
  });
  page.drawText("COORDONNÉES BANCAIRES", { x: M + 12, y: yTopB + boxB - 14, size: 8, font: b, color: C.accent });
  page.drawText("Titulaire : SOULAINE Maxime", { x: M + 12, y: yTopB + boxB - 28, size: 8.5, font: b, color: C.texte });
  page.drawText(`IBAN : ${ENTREPRISE.iban}`, { x: M + 12, y: yTopB + boxB - 40, size: 8.5, font: r, color: C.texte });
  const bicTxt = `BIC : ${ENTREPRISE.bic}`;
  page.drawText(bicTxt, { x: M + CW - 12 - tw(bicTxt, 8.5, r), y: yTopB + boxB - 40, size: 8.5, font: r, color: C.texte });

  y = yTopB - 20;
  const villeNom = ENTREPRISE.ville.replace(/^\d+\s*/, "");
  page.drawText(
    `${titre === "FACTURE" ? "Facture" : "Devis"} établi à ${villeNom}, le ${new Date().toLocaleDateString("fr-FR")}.`,
    { x: M, y, size: 8, font: r, color: C.gris },
  );

  // Pied de page
  page.drawRectangle({ x: 0, y: 12, width: W, height: 3, color: C.brun });

  return doc1.save();
}

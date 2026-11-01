// Devis Propul'Sound DJ — mise en page soignée, charte anthracite / bleu / cyan
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

// Palette
const C = {
  anthracite: rgb(0.18, 0.21, 0.24),
  anthraciteClair: rgb(0.93, 0.94, 0.95),
  bleu: rgb(0.13, 0.38, 0.60),
  bleuPale: rgb(0.90, 0.94, 0.97),
  cyan: rgb(0.29, 0.72, 0.85),
  gris: rgb(0.45, 0.47, 0.50),
  grisLigne: rgb(0.80, 0.82, 0.84),
  texte: rgb(0.10, 0.10, 0.12),
  blanc: rgb(1, 1, 1),
};

// Grille
const M = 50;                 // marge gauche/droite
const W = 595.28, H = 841.89; // A4
const CW = W - 2 * M;         // largeur utile

  (async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([W, H]);
  // Fond blanc (utile pour l'impression et la conversion en image)
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.blanc });
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const r = await doc.embedFont(StandardFonts.Helvetica);
  // Signature du prestataire (copiée dans le projet)
  const sigPath = path.join(__dirname, "..", "public", "images", "signature-soulaine.jpg");
  let sigImg = null;
  if (fs.existsSync(sigPath)) sigImg = await doc.embedJpg(fs.readFileSync(sigPath));
  const logo = await doc.embedPng(
    fs.readFileSync(path.join(__dirname, "..", "public", "logo.png"))
  );

  const t = (txt, x, y, size, font, color) => page.drawText(txt, { x, y, size, font, color });
  const tw = (txt, size, font) => font.widthOfTextAtSize(txt, size);
  const right = (txt, xRight, size, font) => xRight - tw(txt, size, font);

  // ============ EN-TÊTE (bandeau gris clair, aéré) ============
  const headH = 130;
  page.drawRectangle({ x: 0, y: H - headH, width: W, height: headH, color: C.anthraciteClair });
  // Émetteur à gauche
  t("Propul'Sound DJ", M, H - 30, 13, b, C.texte);
  let ey = H - 48;
  for (const l of [
    "5 Clos de la Salamandre",
    "41350 Huisseau-sur-Cosson",
    "06 74 85 07 69  ·  propulsounddj@gmail.com",
    "SIRET : 932 220 791 00010",
  ]) {
    t(l, M, ey, 8.5, r, C.gris);
    ey -= 13;
  }
  // Logo au centre
  const ls = 100;
  page.drawImage(logo, { x: W / 2 - ls / 2, y: H - headH + (headH - ls) / 2, width: ls, height: ls });
  // DEVIS à droite
  t("DEVIS", right("DEVIS", W - M, 32, b), H - 62, 32, b, C.anthracite);
  // Liseré sous l'en-tête (dans le bandeau, jamais sur le logo)
  page.drawRectangle({ x: 0, y: H - headH - 4, width: W, height: 4, color: C.cyan });

  // Curseur vertical, départ sous l'en-tête
  let y = H - headH - 26;

  // Titre de section : petit trait cyan + texte bleu, très lisible
  const section = (title) => {
    page.drawRectangle({ x: M, y: y - 3, width: 3, height: 11, color: C.cyan });
    t(title, M + 10, y, 11, b, C.bleu);
    y -= 19;
  };

  // ============ CLIENT (gauche) / CONTRAT (droite) ============
  const y0 = y;
  // colonne gauche : client
  t("À l'attention de", M + 10, y, 8, b, C.gris);
  t("Famille DUPONT", M + 10, y - 16, 10.5, b, C.texte);
  t("dupont@example.fr  ·  06 12 34 56 78", M + 10, y - 32, 9, r, C.gris);
  // colonne droite : infos (libellé et valeur rapprochés, groupés à droite)
  const rx = M + CW / 2 + 20;
  const info = (label, val) => {
    const vx = right(val, W - M, 9, r);
    t(label, right(label, vx - 8, 9, b), y, 9, b, C.bleu);
    t(val, vx, y, 9, r, C.texte);
    y -= 15;
  };
  info("N° de contrat", "20260903-01");
  info("Date d'émission", "3 septembre 2026");
  info("Validité du devis", "15 jours");
  y = Math.min(y, y0 - 46) - 12;

  // ============ PRESTATION ============
  section("DÉTAILS DE LA PRESTATION");
  const p = (label, val) => {
    t(label, M + 10, y, 9.5, b, C.anthracite);
    t(val, M + 165, y, 9.5, r, C.texte);
    y -= 17;
  };
  p("Type de prestation", "Animation DJ Mariage");
  p("Date et heure", "Samedi 15 octobre 2026, de 18h00 à 04h00");
  p("Lieu", "Salle des Fêtes, 12 rue des Lilas, 41000 Blois");
  y -= 8;

  // ============ TABLEAU (lignes hautes = aérées) ============
  section("DÉTAIL DE LA FACTURATION");
  const cDesc = M + 10, cQte = M + 300, cTaux = M + CW - 190, cMont = M + CW - 10;
  const rowH = 22;
  // entête
  page.drawRectangle({ x: M, y: y - 15, width: CW, height: 20, color: C.bleu });
  t("DÉSIGNATION", cDesc, y - 9, 9, b, C.blanc);
  t("QTÉ", right("QTÉ", cQte + 20, 9, b), y - 9, 9, b, C.blanc);
  t("TAUX", right("TAUX", cTaux + 60, 9, b), y - 9, 9, b, C.blanc);
  t("MONTANT", right("MONTANT", cMont, 9, b), y - 9, 9, b, C.blanc);
  y -= 15 + rowH;
  const rows = [
    ["Déplacement (frais de route, livraison) — 30 km offerts", "", "0,80 € / km", "24,00 €"],
    ["Forfait installation & démontage (~3h30)", "1", "100,00 €", "100,00 €"],
    ["Prestation musicale (10 heures)", "10", "85,00 €", "850,00 €"],
    ["Option : machine à fumée lourde", "1", "60,00 €", "60,00 €"],
    ["Option : machine à étincelles", "1", "120,00 €", "120,00 €"],
    ["Option : pistolet à confettis", "1", "40,00 €", "40,00 €"],
  ];
  rows.forEach((row, i) => {
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - 6, width: CW, height: rowH, color: C.bleuPale });
    t(row[0], cDesc, y + 2, 9, r, C.texte);
    if (row[1]) t(row[1], right(row[1], cQte + 20, 9, r), y + 2, 9, r, C.texte);
    t(row[2], right(row[2], cTaux + 60, 9, r), y + 2, 9, r, C.texte);
    t(row[3], right(row[3], cMont, 9, b), y + 2, 9, b, C.texte);
    if (i < rows.length - 1)
      page.drawLine({ start: { x: M, y: y - 6 }, end: { x: W - M, y: y - 6 }, thickness: 0.4, color: C.grisLigne });
    y -= rowH;
  });
  y -= 6;
  // TVA + TOTAL, alignés à droite du tableau
  t("T.V.A non applicable, Article 293B du C.G.I", right("T.V.A non applicable, Article 293B du C.G.I", cMont, 8, r), y, 8, r, C.gris);
  y -= 28;
  const bx = M + CW - 250;
  // Montants cohérents : solde rond à la dizaine, acompte = total - solde (environ 20 %)
  const TOTAL = 1194.0;
  const soldeVal = Math.floor((TOTAL * 0.8) / 10) * 10;   // 950
  const acompteVal = TOTAL - soldeVal;                     // 244
  const fmt = (n) => n.toFixed(2).replace(".", ",") + " €";
  const soldeTxt = fmt(soldeVal);
  const acompteTxt = fmt(acompteVal);
  // Récapitulatif à gauche du total (pour équilibrer la ligne)
  const bandX = M, bandW = CW - 260;
  page.drawRectangle({ x: bandX, y: y - 9, width: bandW, height: 30, color: C.anthraciteClair });
  const lblSolde = "Solde à payer au début de la prestation :";
  const lblW = b.widthOfTextAtSize(lblSolde, 8.5);
  const amtW = b.widthOfTextAtSize(soldeTxt, 8.5);
  t(lblSolde, bandX + 12, y + 1, 8.5, b, C.gris);
  // montant centré entre la fin du libellé (+18 d'écart mini) et le bord droit de la bande
  const amtX = Math.max(bandX + 12 + lblW + 18, bandX + bandW - 12 - amtW);
  t(soldeTxt, amtX, y + 1, 8.5, b, C.texte);
  page.drawRectangle({ x: bx, y: y - 9, width: 250, height: 30, color: C.anthracite });
  t("TOTAL TTC", bx + 12, y, 11.5, b, C.cyan);
  t("1 194,00 €", right("1 194,00 €", bx + 250 - 12, 11.5, b), y, 11.5, b, C.cyan);
  y -= 34;

  // ============ ACOMPTE (encadré bleu clair) ============
  page.drawRectangle({ x: M, y: y - 28, width: CW, height: 32, color: C.bleuPale });
  t("Montant de l'acompte de réservation (environ 20 %)", M + 12, y - 10, 9.5, b, C.bleu);
  t(acompteTxt, right(acompteTxt, M + CW - 12, 9.5, b), y - 10, 9.5, b, C.bleu);
  y -= 44;
  // Note SACEM, discrète en dessous
  t("SACEM à déclarer par l'organisateur (sauf soirées privées).", M + 12, y, 7.5, r, C.gris);
  y -= 16;

  // ============ CONDITIONS ============
  section("CONDITIONS DE RÈGLEMENT");
  const wrap = (txt, size, font, maxW) => {
    const words = txt.split(" "), lines = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (tw(test, size, font) > maxW) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  for (const l of wrap(
    "Afin de confirmer votre réservation, merci de retourner le devis daté et signé accompagné d'un acompte de 20 % " +
    "par virement (libellé : nom de l'organisateur, numéro de contrat), chèque ou espèces. " +
    "Possibilité de paiement total sans acompte par virement, chèque ou espèces.",
    9, r, CW - 20
  )) {
    t(l, M + 10, y, 9, r, C.texte);
    y -= 12;
  }

  // ============ IBAN + SIGNATURES côte à côte ============
  const half = (CW - 20) / 2;
  const boxH2 = 54;
  const yTop = y - boxH2;        // bas des deux encadrés
  // gauche : IBAN (textes centrés horizontalement + verticalement)
  page.drawRectangle({ x: M, y: yTop, width: half, height: boxH2, borderColor: C.grisLigne, borderWidth: 0.8 });
  const cxB = M + half / 2;
  const cT = (txt, dy, size, font, color) => {
    const w = font.widthOfTextAtSize(txt, size);
    t(txt, cxB - w / 2, yTop + dy, size, font, color);
  };
  cT("COORDONNÉES BANCAIRES", 44, 8, b, C.gris);
  cT("Titulaire : SOULAINE Maxime", 33.5, 8.5, b, C.texte);
  cT("IBAN : FR76 1027 8374 6200 0110 8580 173", 23, 8.5, r, C.texte);
  cT("BIC : CMCIFR2A", 12.5, 8.5, r, C.texte);
  // droite : prestataire (même centrage)
  const rx2 = M + half + 20;
  page.drawRectangle({ x: rx2, y: yTop, width: half, height: boxH2, borderColor: C.grisLigne, borderWidth: 0.8 });
  const cxP = rx2 + half / 2;
  const cP = (txt, dy, size, font, color) => {
    const w = font.widthOfTextAtSize(txt, size);
    t(txt, cxP - w / 2, yTop + dy, size, font, color);
  };
  cP("PRESTATAIRE", 44, 8, b, C.gris);
  cP("SOULAINE Maxime — Propul'Sound DJ", 33.5, 8.5, b, C.texte);
  if (sigImg) {
    const sigW = 110, sigH = (sigImg.height / sigImg.width) * sigW;
    page.drawImage(sigImg, { x: cxP - sigW / 2, y: yTop + 2, width: sigW, height: Math.min(sigH, 22) });
  } else {
    cP("Signature :", 15, 8.5, r, C.gris);
  }

  y = yTop - 12;

  // ============ BON POUR ACCORD (pleine largeur) ============
  page.drawRectangle({ x: M, y: y - 56, width: CW, height: 56, borderColor: C.grisLigne, borderWidth: 0.8 });
  t("ORGANISATEUR — BON POUR ACCORD", M + 12, y - 13, 9, b, C.anthracite);
  t("Signature et mention « Bon pour accord le **/**/**** » :", M + 12, y - 25, 8.5, r, C.gris);
  t("Date : ____ / ____ / ________", right("Date : ____ / ____ / ________", M + CW - 12, 8.5, r), y - 25, 8.5, r, C.gris);
  page.drawLine({ start: { x: M + 12, y: y - 47 }, end: { x: M + 250, y: y - 47 }, thickness: 0.6, color: C.grisLigne });

  // Mention légale + liseré de fin (sous les encadrés, sans chevauchement)
  y -= 68;
  t("Fait en deux exemplaires, à Huisseau-sur-Cosson, le 3 septembre 2026.", M, y, 8, r, C.gris);
  page.drawRectangle({ x: 0, y: 12, width: W, height: 3, color: C.cyan });

  const out = "/Users/maximesoulaine/Desktop/Devis-PropulSound-exemple.pdf";
  fs.writeFileSync(out, await doc.save());
  console.log("OK ->", out);
})();


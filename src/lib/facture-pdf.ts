// Facture Propul'Sound DJ — même charte que le devis, sans signature
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFImage } from "pdf-lib";
import type { DevisQuoteData } from "./devis-pdf";

export type FactureQuoteData = DevisQuoteData;

const C = {
  anthracite: rgb(0.18, 0.21, 0.24),
  anthraciteClair: rgb(0.93, 0.94, 0.95),
  bleu: rgb(0.13, 0.38, 0.6),
  bleuPale: rgb(0.9, 0.94, 0.97),
  cyan: rgb(0.29, 0.72, 0.85),
  gris: rgb(0.45, 0.47, 0.5),
  grisLigne: rgb(0.8, 0.82, 0.84),
  texte: rgb(0.1, 0.1, 0.12),
  blanc: rgb(1, 1, 1),
};

const M = 50;
const W = 595.28, H = 841.89;
const CW = W - 2 * M;

const fmt = (n: number) =>
  n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0") + " €";

export type InvoiceAdjustment = { label: string; amount_cents: number };

export async function buildFacturePdf(
  quote: FactureQuoteData,
  opts: { invoiceNumber: string; adjustments?: InvoiceAdjustment[] }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Facture Propul'Sound DJ — ${opts.invoiceNumber}`);
  const page = doc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.blanc });
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const r = await doc.embedFont(StandardFonts.Helvetica);

  const load = (p: string) => {
    try { return fs.readFileSync(path.join(process.cwd(), "public", p)); } catch { return null; }
  };
  let logo: PDFImage | null = null;
  const logoBytes = load("logo.png");
  if (logoBytes) logo = await doc.embedPng(logoBytes);

  const t = (txt: string, x: number, y: number, size: number, font: PDFFont, color = C.texte) =>
    page.drawText(txt, { x, y, size, font, color });
  const tw = (txt: string, size: number, font: PDFFont) => font.widthOfTextAtSize(txt, size);
  const right = (txt: string, xRight: number, size: number, font: PDFFont) =>
    xRight - tw(txt, size, font);

  // ============ EN-TÊTE ============
  const headH = 130;
  page.drawRectangle({ x: 0, y: H - headH, width: W, height: headH, color: C.anthraciteClair });
  t("Propul'Sound DJ", M, H - 30, 13, b, C.texte);
  let ey = H - 48;
  for (const l of [
 "5 Clos de la Salamandre",
 "41350 Huisseau-sur-Cosson",
 "06 74 85 07 69  ·  propulsounddj@gmail.com",
 "SIRET : 93222079100010",
  ]) {
    t(l, M, ey, 8.5, r, C.gris);
    ey -= 13;
  }
  if (logo) {
    const ls = 100;
    page.drawImage(logo, { x: W / 2 - ls / 2, y: H - headH + (headH - ls) / 2, width: ls, height: ls });
  }
  t("FACTURE", right("FACTURE", W - M, 32, b), H - 62, 32, b, C.anthracite);
  page.drawRectangle({ x: 0, y: H - headH - 4, width: W, height: 4, color: C.cyan });

  let y = H - headH - 26;
  const section = (title: string) => {
    page.drawRectangle({ x: M, y: y - 3, width: 3, height: 11, color: C.cyan });
    t(title, M + 10, y, 11, b, C.bleu);
    y -= 19;
  };

  // ============ CLIENT / FACTURE ============
  const y0 = y;
  t("À l'attention de", M + 10, y, 8, b, C.gris);
  t(quote.customer_name ?? "-", M + 10, y - 16, 10.5, b, C.texte);
  const contact = [quote.customer_email, quote.customer_phone].filter(Boolean).join("  · ");
  t(contact || "-", M + 10, y - 32, 9, r, C.gris);
  const info = (label: string, val: string) => {
    const vx = right(val, W - M, 9, r);
    t(label, right(label, vx - 8, 9, b), y, 9, b, C.bleu);
    t(val, vx, y, 9, r, C.texte);
    y -= 15;
  };
  info("N° de facture", opts.invoiceNumber);
  info("Date d'émission", new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }));
  const dateEvt = quote.event_date
    ? new Date(quote.event_date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "-";
  info("Date de l'événement", dateEvt);
  y = Math.min(y, y0 - 46) - 12;

  // ============ PRESTATION ============
  section("DÉTAILS DE LA PRESTATION");
  const p = (label: string, val: string) => {
    t(label, M + 10, y, 9.5, b, C.anthracite);
    t(val, M + 165, y, 9.5, r, C.texte);
    y -= 17;
  };
  const n = (quote.formula_name ?? "").toLowerCase();
  const eventKind = n.includes("mariage") || n.includes("essential") || n.includes("deluxe") || n.includes("ultime")
    ? "Mariage"
    : n.includes("set dj") || n.includes("clé en main") || n.includes("club") || n.includes("afterwork")
      ? "Bar / Club"
      : "Anniversaire / Privé";
  p("Type de prestation", quote.event_type || eventKind);
  const dateLong = quote.event_date
    ? new Date(quote.event_date + "T12:00:00").toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : null;
  const heure = (hhmm: string | null | undefined) =>
    hhmm ? hhmm.replace(":", "h") : null;
  const dateHeure = dateLong
    ? `${dateLong.charAt(0).toUpperCase() + dateLong.slice(1)}` +
      (heure(quote.start_time) ? `, de ${heure(quote.start_time)} à ${heure(quote.end_time) ?? "?"}` : "")
    : "-";
  p("Date et heure", dateHeure);
  p("Lieu", quote.event_location ?? "-");
  y -= 8;

  // ============ TABLEAU ============
  const cDesc = M + 10, cQte = M + 265, cTaux = M + CW - 185, cMont = M + CW - 10;
  const rowH = 22;
  page.drawRectangle({ x: M, y: y - 15, width: CW, height: 20, color: C.bleu });
  t("DÉSIGNATION", cDesc, y - 9, 9, b, C.blanc);
  t("QTÉ", right("QTÉ", cQte + 20, 9, b), y - 9, 9, b, C.blanc);
  t("TAUX", right("TAUX", cTaux + 60, 9, b), y - 9, 9, b, C.blanc);
  t("MONTANT", right("MONTANT", cMont, 9, b), y - 9, 9, b, C.blanc);
  y -= 15 + rowH;
  const rows: [string, string, string, string][] = [];
  const fPrice = (quote.formula_price_cents ?? 0) / 100;
  rows.push([quote.formula_name ?? "Prestation", "1", fmt(fPrice), fmt(fPrice)]);
  for (const o of quote.selected_options ?? []) {
    const unit = o.price_cents / 100;
    const qty = o.qty && o.qty > 0 ? o.qty : 1;
    rows.push([`Option : ${o.name}`, String(qty), fmt(unit), fmt(unit * qty)]);
  }
  if ((quote.travel_fee_cents ?? 0) > 0) {
    const km = quote.travel_distance_km;
    const fee = quote.travel_fee_cents! / 100;
    rows.push([
      `Déplacement${km ? ` (${km} km × 0,80 €, 30 km offerts)` : ""}`,
 "1", fmt(fee), fmt(fee),
    ]);
  }
  if ((quote.extra_fee_cents ?? 0) > 0) {
    const fee = quote.extra_fee_cents! / 100;
    rows.push([
      `Heures supplémentaires${quote.extra_hours ? ` (${quote.extra_hours} h)` : ""}`,
 "1", fmt(fee), fmt(fee),
    ]);
  }
  for (const adj of opts.adjustments ?? []) {
    if (!adj.label || !adj.amount_cents) continue;
    const v = adj.amount_cents / 100;
    rows.push([adj.label, "1", fmt(v), fmt(v)]);
  }
  rows.forEach(([d, q, tx, mnt], i) => {
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - 6, width: CW, height: rowH, color: C.bleuPale });
    t(d, cDesc, y, 9, r, C.texte);
    t(q, right(q, cQte + 20, 9, r), y, 9, r, C.texte);
    t(tx, right(tx, cTaux + 60, 9, r), y, 9, r, C.texte);
    t(mnt, right(mnt, cMont, 9, r), y, 9, r, C.texte);
    y -= rowH;
  });
  y -= 6;
  const tvaTxt = "TVA non applicable, article 293 B du CGI";
  t(tvaTxt, right(tvaTxt, M + CW - 10, 8, r), y, 8, r, C.gris);
  y -= 26;

  // TOTAL + décompte acompte / solde (mêmes montants que le devis, ajustés)
  const adjSum = (opts.adjustments ?? []).reduce((s, a) => s + (a.amount_cents || 0), 0);
  const total = (quote.total_cents ?? 0) / 100 + adjSum / 100;
  const soldeVal = Math.floor((total * 0.8) / 10) * 10;
  const acompteVal = total - soldeVal;
  const bx = M + CW - 250;
  page.drawRectangle({ x: bx, y: y - 9, width: 250, height: 30, color: C.anthracite });
  t("TOTAL TTC", bx + 12, y, 11.5, b, C.cyan);
  t(fmt(total), right(fmt(total), bx + 250 - 12, 11.5, b), y, 11.5, b, C.cyan);
  y -= 34;

  page.drawRectangle({ x: M, y: y - 28, width: CW, height: 32, color: C.bleuPale });
  t("Acompte de réservation versé", M + 12, y - 10, 9.5, b, C.bleu);
  t(fmt(acompteVal), right(fmt(acompteVal), M + CW / 2 - 12, 9.5, b), y - 10, 9.5, b, C.bleu);
  t("Solde à régler", M + CW / 2 + 12, y - 10, 9.5, b, C.bleu);
  t(fmt(soldeVal), right(fmt(soldeVal), M + CW - 12, 9.5, b), y - 10, 9.5, b, C.bleu);
  y -= 44;
  t("SACEM à déclarer par l'organisateur (sauf soirées privées).", M + 12, y, 7.5, r, C.gris);
  y -= 16;

  // ============ CONDITIONS ============
  section("CONDITIONS DE RÈGLEMENT");
  const wrap = (txt: string, size: number, font: PDFFont, maxW: number) => {
    const words = txt.split(" "), lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (tw(test, size, font) > maxW) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const conditionsTxt =
 "Facture payable par virement (libellé : nom de l'organisateur, numéro de contrat), chèque ou espèces. " +
 "L'acompte de réservation reste acquis en cas d'annulation par le client, sauf force majeure. " +
 "Merci de votre confiance !";
  for (const l of wrap(conditionsTxt, 9, r, CW - 20)) {
    t(l, M + 10, y, 9, r, C.texte);
    y -= 12;
  }
  y -= 4;

  // ============ COORDONNÉES BANCAIRES + PRESTATAIRE ============
  const half = (CW - 20) / 2;
  const boxH2 = 54;
  const yTop = y - boxH2;
  page.drawRectangle({ x: M, y: yTop, width: half, height: boxH2, borderColor: C.grisLigne, borderWidth: 0.8 });
  const cxB = M + half / 2;
  const cT = (txt: string, dy: number, size: number, font: PDFFont, color = C.texte) => {
    t(txt, cxB - tw(txt, size, font) / 2, yTop + dy, size, font, color);
  };
  cT("COORDONNÉES BANCAIRES", 44, 8, b, C.gris);
  cT("Titulaire : SOULAINE Maxime", 33.5, 8.5, b);
  cT("IBAN : FR76 1027 8374 6200 0110 8580 173", 23, 8.5, r);
  cT("BIC : CMCIFR2A", 12.5, 8.5, r);
  const rx2 = M + half + 20;
  page.drawRectangle({ x: rx2, y: yTop, width: half, height: boxH2, borderColor: C.grisLigne, borderWidth: 0.8 });
  const cxP = rx2 + half / 2;
  const cP = (txt: string, dy: number, size: number, font: PDFFont, color = C.texte) => {
    t(txt, cxP - tw(txt, size, font) / 2, yTop + dy, size, font, color);
  };
  cP("PRESTATAIRE", 44, 8, b, C.gris);
  cP("SOULAINE Maxime — Propul'Sound DJ", 33.5, 8.5, b);
  cP("SIRET : 93222079100010", 23, 8.5, r);
  cP("propulsounddj@gmail.com", 12.5, 8.5, r);

  y = yTop - 16;
  t(`Facture établie à Huisseau-sur-Cosson, le ${new Date().toLocaleDateString("fr-FR")}.`,
    M, y, 8, r, C.gris);
  page.drawRectangle({ x: 0, y: 12, width: W, height: 3, color: C.cyan });

  return doc.save();
}

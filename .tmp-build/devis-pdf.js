"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDevisPdf = buildDevisPdf;
// Devis Propul'Sound DJ — génération du PDF avec la charte validée
// (mise en page issue de scripts/devis-exemple.js, alimentée dynamiquement)
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdf_lib_1 = require("pdf-lib");
const C = {
    anthracite: (0, pdf_lib_1.rgb)(0.18, 0.21, 0.24),
    anthraciteClair: (0, pdf_lib_1.rgb)(0.93, 0.94, 0.95),
    bleu: (0, pdf_lib_1.rgb)(0.13, 0.38, 0.6),
    bleuPale: (0, pdf_lib_1.rgb)(0.9, 0.94, 0.97),
    cyan: (0, pdf_lib_1.rgb)(0.29, 0.72, 0.85),
    gris: (0, pdf_lib_1.rgb)(0.45, 0.47, 0.5),
    grisLigne: (0, pdf_lib_1.rgb)(0.8, 0.82, 0.84),
    texte: (0, pdf_lib_1.rgb)(0.1, 0.1, 0.12),
    blanc: (0, pdf_lib_1.rgb)(1, 1, 1),
};
const M = 50;
const W = 595.28, H = 841.89;
const CW = W - 2 * M;
const fmt = (n) => n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0") + " €";
// Type de prestation déduit du nom de la formule :
//  Mariage → Essential, Deluxe, L'Ultime Show
//  Bar/Club → Set DJ, Clé en main (Standard/Premium), Club, Afterwork
//  Anniversaire/Privé → Pack Standard, Pack Premium
function eventKind(formulaName) {
    const n = formulaName.toLowerCase();
    if (n.includes("mariage") || n.includes("essential") || n.includes("deluxe") || n.includes("ultime"))
        return "Mariage";
    if (n.includes("set dj") || n.includes("clé en main") || n.includes("club") || n.includes("afterwork"))
        return "Bar / Club";
    return "Anniversaire / Privé";
}
async function buildDevisPdf(quote, opts) {
    const doc = await pdf_lib_1.PDFDocument.create();
    doc.setTitle(`Devis Propul'Sound DJ — ${quote.formula_name ?? ""}`);
    const page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.blanc });
    const b = await doc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
    const r = await doc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    // Logo + signature (fichiers statiques du projet)
    const load = (p) => {
        try {
            return fs_1.default.readFileSync(path_1.default.join(process.cwd(), "public", p));
        }
        catch {
            return null;
        }
    };
    let logo = null;
    let sigImg = null;
    const logoBytes = load("logo.png");
    if (logoBytes)
        logo = await doc.embedPng(logoBytes);
    const sigBytes = load(path_1.default.join("images", "signature-soulaine.jpg"));
    if (sigBytes)
        sigImg = await doc.embedJpg(sigBytes);
    const t = (txt, x, y, size, font, color = C.texte) => page.drawText(txt, { x, y, size, font, color });
    const tw = (txt, size, font) => font.widthOfTextAtSize(txt, size);
    const right = (txt, xRight, size, font) => xRight - tw(txt, size, font);
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
    t("DEVIS", right("DEVIS", W - M, 32, b), H - 62, 32, b, C.anthracite);
    page.drawRectangle({ x: 0, y: H - headH - 4, width: W, height: 4, color: C.cyan });
    let y = H - headH - 26;
    const section = (title) => {
        page.drawRectangle({ x: M, y: y - 3, width: 3, height: 11, color: C.cyan });
        t(title, M + 10, y, 11, b, C.bleu);
        y -= 19;
    };
    // ============ CLIENT / CONTRAT ============
    const y0 = y;
    t("À l'attention de", M + 10, y, 8, b, C.gris);
    t(quote.customer_name ?? "-", M + 10, y - 16, 10.5, b, C.texte);
    const contact = [quote.customer_email, quote.customer_phone].filter(Boolean).join("  ·  ");
    t(contact || "-", M + 10, y - 32, 9, r, C.gris);
    const info = (label, val) => {
        const vx = right(val, W - M, 9, r);
        t(label, right(label, vx - 8, 9, b), y, 9, b, C.bleu);
        t(val, vx, y, 9, r, C.texte);
        y -= 15;
    };
    info("N° de contrat", opts.contractNumber);
    info("Date d'émission", new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }));
    info("Validité du devis", `${opts.validityDays} jours`);
    y = Math.min(y, y0 - 46) - 12;
    // ============ PRESTATION ============
    section("DÉTAILS DE LA PRESTATION");
    const p = (label, val) => {
        t(label, M + 10, y, 9.5, b, C.anthracite);
        t(val, M + 165, y, 9.5, r, C.texte);
        y -= 17;
    };
    p("Type de prestation", quote.event_type || eventKind(quote.formula_name ?? ""));
    const dateLong = quote.event_date
        ? new Date(quote.event_date + "T12:00:00").toLocaleDateString("fr-FR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
        })
        : null;
    const heure = (hhmm) => hhmm ? hhmm.replace(":", "h") : null;
    const dateHeure = dateLong
        ? `${dateLong.charAt(0).toUpperCase() + dateLong.slice(1)}` +
            (heure(quote.start_time) ? `, de ${heure(quote.start_time)} à ${heure(quote.end_time) ?? "?"}` : "")
        : "-";
    p("Date et heure", dateHeure);
    p("Lieu", quote.event_location ?? "-");
    y -= 8;
    // ============ TABLEAU ============
    section("DÉTAIL DE LA FACTURATION");
    const cDesc = M + 10, cQte = M + 265, cTaux = M + CW - 185, cMont = M + CW - 10;
    const rowH = 22;
    page.drawRectangle({ x: M, y: y - 15, width: CW, height: 20, color: C.bleu });
    t("DÉSIGNATION", cDesc, y - 9, 9, b, C.blanc);
    t("QTÉ", right("QTÉ", cQte + 20, 9, b), y - 9, 9, b, C.blanc);
    t("TAUX", right("TAUX", cTaux + 60, 9, b), y - 9, 9, b, C.blanc);
    t("MONTANT", right("MONTANT", cMont, 9, b), y - 9, 9, b, C.blanc);
    y -= 15 + rowH;
    const rows = [];
    const fPrice = (quote.formula_price_cents ?? 0) / 100;
    rows.push([quote.formula_name ?? "Prestation", "1", fmt(fPrice), fmt(fPrice)]);
    for (const o of quote.selected_options ?? []) {
        const unit = o.price_cents / 100;
        const qty = o.qty && o.qty > 0 ? o.qty : 1;
        rows.push([`Option : ${o.name}`, String(qty), fmt(unit), fmt(unit * qty)]);
    }
    if ((quote.travel_fee_cents ?? 0) > 0) {
        const km = quote.travel_distance_km;
        const fee = quote.travel_fee_cents / 100;
        rows.push([
            `Déplacement${km ? ` (${km} km aller-retour)` : ""}`,
            "",
            "0,80 € / km",
            fmt(fee),
        ]);
    }
    if ((quote.extra_fee_cents ?? 0) > 0) {
        rows.push([
            `Heures supplémentaires${quote.extra_hours ? ` (${quote.extra_hours} h)` : ""}`,
            quote.extra_hours ? String(quote.extra_hours) : "",
            fmt(quote.extra_fee_cents / 100 / (quote.extra_hours || 1)),
            fmt(quote.extra_fee_cents / 100),
        ]);
    }
    rows.forEach((row, i) => {
        if (i % 2 === 1)
            page.drawRectangle({ x: M, y: y - 6, width: CW, height: rowH, color: C.bleuPale });
        t(row[0], cDesc, y + 2, 9, r, C.texte);
        if (row[1])
            t(row[1], right(row[1], cQte + 20, 9, r), y + 2, 9, r, C.texte);
        t(row[2], right(row[2], cTaux + 60, 9, r), y + 2, 9, r, C.texte);
        t(row[3], right(row[3], cMont, 9, b), y + 2, 9, b, C.texte);
        if (i < rows.length - 1)
            page.drawLine({ start: { x: M, y: y - 6 }, end: { x: W - M, y: y - 6 }, thickness: 0.4, color: C.grisLigne });
        y -= rowH;
    });
    y -= 6;
    t("T.V.A non applicable, Article 293B du C.G.I", right("T.V.A non applicable, Article 293B du C.G.I", cMont, 8, r), y, 8, r, C.gris);
    // Note déplacement, en petit, à position fixe (juste sous la ligne TVA)
    t("Déplacement : 0,80 € / km, 30 km offerts.", M + 10, y, 7.5, r, C.gris);
    // Espace libre : on répartit le vide entre le tableau et le bloc prix
    // (au lieu de tout laisser en bas de page), pour un devis aéré quelle
    // que soit la longueur du tableau.
    const conditionsTxt = opts.conditions ??
        "Afin de confirmer votre réservation, merci de retourner le devis daté et signé accompagné d'un acompte de 20 % " +
            "par virement (libellé : nom de l'organisateur, numéro de contrat), chèque ou espèces. " +
            "Possibilité de paiement total sans acompte par virement, chèque ou espèces.";
    const wrapCount = (txt, size, font, maxW) => {
        const words = txt.split(" ");
        let n = 1, cur = "";
        for (const w of words) {
            const test = cur ? cur + " " + w : w;
            if (tw(test, size, font) > maxW) {
                n++;
                cur = w;
            }
            else
                cur = test;
        }
        return n;
    };
    const restH = 28 + // après TVA
        30 + 34 + // bande TOTAL
        32 + 44 + // encadré acompte
        16 + // note SACEM
        19 + wrapCount(conditionsTxt, 9, r, CW - 20) * 12 + // conditions
        54 + 12 + // encadrés IBAN / prestataire
        56 + // bon pour accord
        68 + 10; // mention finale + marge
    const gap = Math.max(0, y - 30 - restH); // 30 = position basse cible
    y -= 28 + gap;
    // TOTAL + solde (solde rond à la dizaine ≈ 80 %, acompte = le reste ≈ 20 %)
    const bx = M + CW - 250;
    const total = (quote.total_cents ?? 0) / 100;
    const soldeVal = Math.floor((total * 0.8) / 10) * 10;
    const acompteVal = total - soldeVal;
    const bandX = M, bandW = CW - 260;
    page.drawRectangle({ x: bandX, y: y - 9, width: bandW, height: 30, color: C.anthraciteClair });
    const lblSolde = "Solde à payer au début de la prestation :";
    const lblW = b.widthOfTextAtSize(lblSolde, 8.5);
    const soldeTxt = fmt(soldeVal);
    const amtW = b.widthOfTextAtSize(soldeTxt, 8.5);
    t(lblSolde, bandX + 12, y + 1, 8.5, b, C.gris);
    t(soldeTxt, Math.max(bandX + 12 + lblW + 18, bandX + bandW - 12 - amtW), y + 1, 8.5, b, C.texte);
    page.drawRectangle({ x: bx, y: y - 9, width: 250, height: 30, color: C.anthracite });
    t("TOTAL TTC", bx + 12, y, 11.5, b, C.cyan);
    t(fmt(total), right(fmt(total), bx + 250 - 12, 11.5, b), y, 11.5, b, C.cyan);
    y -= 34;
    // ============ ACOMPTE ============
    page.drawRectangle({ x: M, y: y - 28, width: CW, height: 32, color: C.bleuPale });
    t("Montant de l'acompte de réservation (environ 20 %)", M + 12, y - 10, 9.5, b, C.bleu);
    t(fmt(acompteVal), right(fmt(acompteVal), M + CW - 12, 9.5, b), y - 10, 9.5, b, C.bleu);
    y -= 44;
    t("SACEM à déclarer par l'organisateur (sauf soirées privées).", M + 12, y, 7.5, r, C.gris);
    y -= 16;
    // ============ CONDITIONS ============
    section("CONDITIONS DE RÈGLEMENT");
    const wrap = (txt, size, font, maxW) => {
        const words = txt.split(" "), lines = [];
        let cur = "";
        for (const w of words) {
            const test = cur ? cur + " " + w : w;
            if (tw(test, size, font) > maxW) {
                lines.push(cur);
                cur = w;
            }
            else
                cur = test;
        }
        if (cur)
            lines.push(cur);
        return lines;
    };
    const conditionsList = wrap(conditionsTxt, 9, r, CW - 20);
    for (const l of conditionsList) {
        t(l, M + 10, y, 9, r, C.texte);
        y -= 12;
    }
    // ============ IBAN + SIGNATURES ============
    const half = (CW - 20) / 2;
    const boxH2 = 54;
    const yTop = y - boxH2;
    page.drawRectangle({ x: M, y: yTop, width: half, height: boxH2, borderColor: C.grisLigne, borderWidth: 0.8 });
    const cxB = M + half / 2;
    const cT = (txt, dy, size, font, color = C.texte) => {
        t(txt, cxB - tw(txt, size, font) / 2, yTop + dy, size, font, color);
    };
    cT("COORDONNÉES BANCAIRES", 44, 8, b, C.gris);
    cT("Titulaire : SOULAINE Maxime", 33.5, 8.5, b);
    cT("IBAN : FR76 1027 8374 6200 0110 8580 173", 23, 8.5, r);
    cT("BIC : CMCIFR2A", 12.5, 8.5, r);
    const rx2 = M + half + 20;
    page.drawRectangle({ x: rx2, y: yTop, width: half, height: boxH2, borderColor: C.grisLigne, borderWidth: 0.8 });
    const cxP = rx2 + half / 2;
    const cP = (txt, dy, size, font, color = C.texte) => {
        t(txt, cxP - tw(txt, size, font) / 2, yTop + dy, size, font, color);
    };
    cP("PRESTATAIRE", 44, 8, b, C.gris);
    cP("SOULAINE Maxime — Propul'Sound DJ", 33.5, 8.5, b);
    if (sigImg) {
        const sigW = 110, sigH = Math.min((sigImg.height / sigImg.width) * sigW, 22);
        page.drawImage(sigImg, { x: cxP - sigW / 2, y: yTop + 2, width: sigW, height: sigH });
    }
    else {
        cP("Signature :", 15, 8.5, r, C.gris);
    }
    y = yTop - 12;
    // ============ BON POUR ACCORD ============
    const sig = opts.signature;
    // Badge « SIGNÉ » sous DEVIS (en-tête) quand le devis est signé
    if (sig) {
        const vert = (0, pdf_lib_1.rgb)(0.13, 0.5, 0.25);
        const label = "SIGNÉ";
        const bw = b.widthOfTextAtSize(label, 11);
        const bx0 = W - M - bw - 34;
        page.drawRectangle({
            x: bx0, y: H - 86, width: bw + 42, height: 20,
            color: (0, pdf_lib_1.rgb)(0.85, 0.95, 0.88), borderColor: (0, pdf_lib_1.rgb)(0.2, 0.65, 0.35), borderWidth: 1,
        });
        // coche dessinée (le caractère ✔ n'est pas encodable en WinAnsi)
        page.drawLine({ start: { x: bx0 + 10, y: H - 77 }, end: { x: bx0 + 14, y: H - 82 }, thickness: 1.6, color: vert });
        page.drawLine({ start: { x: bx0 + 14, y: H - 82 }, end: { x: bx0 + 22, y: H - 71 }, thickness: 1.6, color: vert });
        t(label, bx0 + 28, H - 81, 11, b, vert);
    }
    page.drawRectangle({ x: M, y: y - 56, width: CW, height: 56, borderColor: C.grisLigne, borderWidth: 0.8 });
    t("ORGANISATEUR — BON POUR ACCORD", M + 12, y - 13, 9, b, C.anthracite);
    t(sig ? "Signature :" : "Signature et mention « Bon pour accord le **/**/**** » :", M + 12, y - 25, 8.5, r, C.gris);
    if (sig) {
        // Signature dessinée par le client (PNG) sinon nom en italique
        let drawn = null;
        if (sig.drawnPng?.startsWith("data:image/png;base64,")) {
            try {
                const b64 = sig.drawnPng.split(",")[1];
                const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
                drawn = await doc.embedPng(raw);
            }
            catch {
                drawn = null;
            }
        }
        if (drawn) {
            const w = 120, h = Math.min((drawn.height / drawn.width) * w, 30);
            // ancrée sur la ligne de signature (ligne à y - 47)
            page.drawImage(drawn, { x: M + 24, y: y - 47, width: w, height: h });
        }
        else {
            const italic = await doc.embedFont(pdf_lib_1.StandardFonts.TimesRomanItalic);
            t(sig.name, M + 30, y - 43, 14, italic, (0, pdf_lib_1.rgb)(0.1, 0.25, 0.55));
        }
        const d = new Date(sig.dateIso).toLocaleDateString("fr-FR");
        t(`Bon pour accord le ${d}`, right(`Bon pour accord le ${d}`, M + CW - 12, 8.5, r), y - 25, 8.5, r, C.texte);
        t("Signature électronique nominative (espace client)", M + 12, y - 51, 7, r, C.gris);
    }
    else {
        t("Date : ____ / ____ / ________", right("Date : ____ / ____ / ________", M + CW - 12, 8.5, r), y - 25, 8.5, r, C.gris);
    }
    page.drawLine({ start: { x: M + 12, y: y - 47 }, end: { x: M + 250, y: y - 47 }, thickness: 0.6, color: C.grisLigne });
    y -= 68;
    t(`Fait en deux exemplaires, à Huisseau-sur-Cosson, le ${new Date().toLocaleDateString("fr-FR")}.`, M, y, 8, r, C.gris);
    page.drawRectangle({ x: 0, y: 12, width: W, height: 3, color: C.cyan });
    return doc.save();
}

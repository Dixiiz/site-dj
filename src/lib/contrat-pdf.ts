// Contrat Propul'Sound DJ — PDF multi-pages, même charte que le devis
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFImage } from "pdf-lib";
import type { DevisQuoteData } from "./devis-pdf";

export type ContratQuoteData = DevisQuoteData;

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

// Articles du contrat (texte validé par le prestataire)
const ARTICLES: { titre: string; paragraphes: string[] }[] = [
  {
    titre: "Article 1 - Objet du contrat et choix du forfait",
    paragraphes: [
      "Le client a souhaité faire appel à Propul'Sound pour l'animation musicale de leur évènement, dont la date est précisée sur le devis joint au présent contrat.",
    ],
  },
  {
    titre: "Article 2 - Transport - Modalités de paiement",
    paragraphes: [
      "1. Transport, Déplacement & Hébergement",
      "• Les frais de déplacement non inclus dans le forfait (frais de train, avion, bateau, voiture) et d'hébergement sont à la charge du Client.",
      "2. Modalité de paiement",
      "• Un acompte précisé sur le devis est demandé lors de la signature du contrat, fixant ainsi définitivement la date.",
      "• Après déduction de l'acompte, le solde restant devra être réglé au plus tard le jour du montage du matériel.",
      "• Le montant du paiement final peut changer avant la prestation si certaines options sont souscrites. Chaque supplément fera l'objet d'une facture séparée. Toutes les options sont soumises à la disponibilité de Propul'Sound.",
    ],
  },
  {
    titre: "Article 3 - Paiement et prix",
    paragraphes: [
      "Pour réserver la prestation de DJ pour la date de son évènement, l'organisateur doit signer le présent contrat et payer l'acompte précisé sur le devis.",
      "Les prix indiqués dans ce contrat sont garantis pour une durée de 15 jours à compter de son envoi.",
      "L'acompte versé à la signature du contrat est le témoin d'un engagement ferme et définitif. Aucune annulation ne pourra intervenir, sauf en cas de force majeure, tel que défini ci-après.",
      "L'acompte est un premier versement sur la prestation de services. Il implique une obligation pour Propul'Sound de fournir la prestation de services et une obligation d'achat pour le Client, sauf accord contraire entre les parties. Les deux parties sont engagées et peuvent être condamnées à payer des dommages-intérêts si l'une ou l'autre se rétracte.",
      "Tout défaut de paiement autorisera Propul'Sound à cesser toute prestation et pourra donner lieu à des poursuites. Tout retard de paiement entraînera le paiement d'intérêts au taux minimal prévu par l'article L441-6 du Code de Commerce (intérêt légal multiplié par trois), exigibles de plein droit et sans rappel.",
    ],
  },
  {
    titre: "Article 4 - Obligations",
    paragraphes: [
      "Le client s'engage à fournir l'emplacement nécessaire à l'installation du matériel de sonorisation et éclairages, une puissance électrique suffisante à proximité du matériel (prises de courant 220 V, 16/20 ampères - 4 prises disponibles à moins de 10 mètres de la disco-mobile).",
      "Le Client s'engage à laisser l'accès libre au DJ 2 heures à l'avance pour l'installation du matériel et les réglages, ainsi qu'une place de parking à proximité de la manifestation.",
      "Le Client est responsable de tout le matériel (sonorisation, éclairages, platines, ordinateurs) entreposé dans les locaux mis à disposition par Propul'Sound, et prendra toutes mesures nécessaires à la sécurité de la disco-mobile dès son arrivée et jusqu'à son départ. Pour cela, il est obligatoire d'avoir souscrit, auprès d'une compagnie d'assurance, un contrat de responsabilité civile.",
      "Le Client doit prévoir, pour le DJ, un repas pendant la manifestation.",
      "En aucun cas, le DJ et son matériel ne seront soumis aux intempéries : froid, chaleur, pluie, neige, grêle ou autres. Propul'Sound s'engage à fournir une animation de soirée conforme à la demande du Client.",
    ],
  },
];
const ARTICLES_2: { titre: string; paragraphes: string[] }[] = [
  {
    titre: "Article 5 - Responsabilités",
    paragraphes: [
      "Le Client est seul responsable de la soirée. Il se charge de toutes les déclarations et demandes d'autorisations administratives en temps opportun. (SACEM et SPRE si évènement public)",
      "Le Client assume l'entière responsabilité du comportement et des actes de ses invités. Il sera responsable de tous les dégâts qui pourraient être causés au matériel et/ou au prestataire par les invités.",
      "Dans le cas où le lieu choisi par le Client ne serait pas équipé de limiteur de pression acoustique, Propul'Sound n'est pas tenu responsable en cas d'acouphènes ou de nuisances auditives que le Client et/ou ses convives pourraient subir. De même, en cas de nuisances sonores auprès du voisinage, et sans que le Client puisse prétendre à un remboursement de la prestation, le prestataire n'est pas responsable en cas de coupure du son par les pouvoirs publics. Tout dégât électrique dû à une non-conformité du réseau électrique de la salle ou du lieu de la prestation entraînera la responsabilité du Client et celui-ci devra participer aux réparations du matériel.",
      "En cas de litige mettant en cause notre responsabilité, notre assurance professionnelle prendra en charge le dossier.",
      "En cas de dégradation du matériel par une tierce personne, les frais de remise en état seront à la charge de cette dernière ; il en va de même pour les frais de location engagés jusqu'à réception du matériel réparé, afin de ne pas compromettre les engagements à venir. Si le matériel n'est pas réparable, le responsable des dégâts sera facturé du prix du matériel neuf suivant les tarifs en cours.",
      "La responsabilité de Propul'Sound ne pourra être mise en cause qu'en cas de manquement à son obligation de moyens. En outre, le Client ne pourra pas l'invoquer dans les cas suivants :",
      "• S'il a omis de remettre à Propul'Sound un document ou une information nécessaire pour la mission.",
      "• En cas de force majeure ou d'autres causes indépendantes de la volonté du DJ.",
      "• En cas de dysfonctionnement du matériel.",
      "• Le prestataire ne saurait être engagé suite au non ou mauvais fonctionnement de ses appareils installés, lié à une installation électrique défectueuse ou un manque de puissance électrique du site de réception.",
    ],
  },
  {
    titre: "Article 6 - Validation du contrat",
    paragraphes: [
      "Le contrat sera validé pour la prestation réservée à la date indiquée sur celui-ci, lorsque le contrat sera retourné, signé par les deux parties avec un acompte par chèque, virement bancaire ou espèce selon le montant précisé sur le devis associé à l'évènement.",
      "La loi autorise le Client à se rétracter pendant 14 jours à compter de la signature (Art. L121-29 du Code de la Consommation). En cas de rétractation dans le délai légal, l'acompte sera intégralement restitué.",
    ],
  },
  {
    titre: "Article 7 - Annulation du contrat & Changement de date - Cas de force majeure",
    paragraphes: [
      "Aucune annulation ne pourra intervenir du fait de Propul'Sound, excepté les cas de force majeure dûment justifiés.",
      "En cas de force majeure, Propul'Sound s'engage à prendre contact avec un autre DJ partenaire pour réaliser la prestation. Cependant, il peut être difficile de trouver, à qualité égale et dans un délai parfois court, un DJ professionnel de remplacement au même tarif et au même niveau de qualité. En cas d'impossibilité de trouver une alternative, et sous réserve de démontrer le cas de force majeure qui empêche l'exécution de sa prestation, aucune indemnisation ne pourra être réclamée à Propul'Sound.",
      "Tout changement de date de la prestation fait office d'annulation. Si le DJ est disponible pour la nouvelle date fixée, il proposera un nouveau contrat. Le prestataire ne pourra pas être tenu pour responsable s'il se trouve dans l'impossibilité d'assurer la prestation à la date finalement fixée. Si l'annulation est due à un cas de force majeure dûment démontré par le Client, l'acompte et les éventuelles pénalités prévues seront restitués au Client.",
      "Ne sont considérés comme « cas de force majeure » que les événements extérieurs, indépendants de la volonté de Propul'Sound et du Client, imprévisibles et insurmontables rendant impossible l'exécution des obligations. La partie qui invoque un cas de force majeure devra en rapporter la preuve.",
    ],
  },
  {
    titre: "Article 8 - La SACEM",
    paragraphes: [
      "La SACEM est à charge du Client qui organise l'événement.",
      "Dans le cas d'une manifestation familiale - privée - (Mariage, Anniversaire, Baptême…), la prestation est exonérée des droits de SACEM.",
    ],
  },
];
const ARTICLES_3: { titre: string; paragraphes: string[] }[] = [
  {
    titre: "Article 9 - Dispositions diverses",
    paragraphes: [
      "• Le DJ n'ouvre ni ne ferme les lieux de réception.",
      "• Les jeux, même définis, peuvent être modifiés ou enlevés par l'animateur selon l'ambiance de la soirée.",
      "• Le Client s'engage à informer le DJ de la présence de caméras et/ou de photographes professionnels durant la prestation. Propul'Sound décline toute responsabilité en cas de mauvaise qualité des photos ou vidéos réalisées par des professionnels en raison de l'éclairage ou des effets spéciaux utilisés.",
    ],
  },
  {
    titre: "Article 10 - Rupture du contrat",
    paragraphes: [
      "Le DJ pourra quitter les lieux de la prestation sans qu'il ne soit question de remboursement d'aucune sorte et le Client lui restera redevable des sommes éventuellement dues dans les cas suivants :",
      "• En cas de mauvais traitements, insultes, ou comportement anormal de la part du Client, de ses représentants ou invités.",
      "• En cas de dégradation volontaire du matériel fourni par le prestataire.",
      "• En cas de mise en péril de l'intégrité physique et/ou morale du prestataire.",
      "• En cas de mise en péril de l'intégrité du matériel.",
      "• En cas de non-respect par le Client des clauses du présent contrat.",
      "En cas de litige, les deux parties se soumettront à la juridiction des tribunaux compétents du lieu de conclusion du contrat.",
    ],
  },
];
const ARTICLES_4: { titre: string; paragraphes: string[] }[] = [
  {
    titre: "Article 11 - Droit à l'image",
    paragraphes: [
      "• Consentement : Le Client consent à ce que le DJ puisse prendre des photographies et des vidéos de l'événement pour des fins promotionnelles, y compris mais sans s'y limiter, l'utilisation sur le site internet, les réseaux sociaux et le matériel publicitaire Propul'Sound.",
      "• Droits des Invités : Le Client est responsable d'informer ses invités de la présence de caméras et/ou de photographes professionnels pendant l'événement et d'obtenir leur consentement à être photographiés ou filmés.",
      "• Utilisation des Images : Les photographies et les vidéos prises par le prestataire ne seront utilisées qu'à des fins promotionnelles et commerciales et ne seront pas vendues à des tiers sans le consentement du Client.",
      "• Opposition : Si le Client ou un invité ne souhaite pas apparaître sur les photographies ou les vidéos, il est de la responsabilité du Client d'informer le prestataire par écrit avant l'événement.",
      "• Durée et Révocation : Le consentement donné pour l'utilisation des images est valable pour une durée de cinq ans à compter de la date de l'événement. Le Client peut révoquer ce consentement à tout moment par écrit, auquel cas le prestataire s'engage à cesser l'utilisation des images concernées dans les meilleurs délais.",
    ],
  },
  {
    titre: "Article 12 - Confidentialité",
    paragraphes: [
      "Les informations échangées entre les parties dans le cadre de ce contrat sont strictement confidentielles. Aucune des parties ne divulguera ces informations à des tiers sans le consentement écrit préalable de l'autre partie, sauf si la loi l'exige.",
    ],
  },
];

const ALL_ARTICLES = [...ARTICLES, ...ARTICLES_2, ...ARTICLES_3, ...ARTICLES_4];
// Détection du type d'évènement à partir du nom de la formule
// (même logique que le devis).
function eventKind(formulaName: string): string {
  const n = formulaName.toLowerCase();
  if (n.includes("mariage") || n.includes("essential") || n.includes("deluxe") || n.includes("ultime"))
    return "Mariage";
  if (n.includes("set dj") || n.includes("clé en main") || n.includes("club") || n.includes("afterwork"))
    return "Bar / Club";
  return "Anniversaire / Privé";
}

export async function buildContratPdf(
  quote: ContratQuoteData,
  opts: {
    contractNumber: string;
    validityDays?: number;
    signature?: {
      name: string;
      dateIso: string;
      ip?: string | null;
      drawnPng?: string | null;
    };
  }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Contrat Propul'Sound DJ — ${opts.contractNumber}`);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const r = await doc.embedFont(StandardFonts.Helvetica);

  const load = (p: string) => {
    try { return fs.readFileSync(path.join(process.cwd(), "public", p)); } catch { return null; }
  };
  let logo: PDFImage | null = null;
  let sigImg: PDFImage | null = null;
  const logoBytes = load("logo.png");
  if (logoBytes) logo = await doc.embedPng(logoBytes);
  const sigBytes = load(path.join("images", "signature-soulaine.jpg"));
  if (sigBytes) sigImg = await doc.embedJpg(sigBytes);

  const tw = (txt: string, size: number, font: PDFFont) => font.widthOfTextAtSize(txt, size);
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

  let page = doc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.blanc });

  const t = (txt: string, x: number, yy: number, size: number, font: PDFFont, color = C.texte) =>
    page.drawText(txt, { x, y: yy, size, font, color });
  const right = (txt: string, xRight: number, size: number, font: PDFFont) =>
    xRight - tw(txt, size, font);
  let y = 0;

  // Nouvelle page avec bandeau réduit + pied de page
  const newPage = () => {
    page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.blanc });
    const hh = 40;
    page.drawRectangle({ x: 0, y: H - hh, width: W, height: hh, color: C.anthraciteClair });
    t("Contrat Propul'Sound DJ", M, H - 25, 9, b, C.anthracite);
    t(opts.contractNumber, right(opts.contractNumber, W - M, 9, r), H - 25, 9, r, C.gris);
    page.drawRectangle({ x: 0, y: H - hh - 3, width: W, height: 3, color: C.cyan });
    page.drawRectangle({ x: 0, y: 12, width: W, height: 3, color: C.cyan });
    t(`Page ${doc.getPageCount()}`, right(`Page ${doc.getPageCount()}`, W - M, 8, r), 20, 8, r, C.gris);
    y = H - hh - 26;
  };

  // ============ EN-TÊTE (page 1, identique au devis) ============
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
  t("CONTRAT", right("CONTRAT", W - M, 30, b), H - 60, 30, b, C.anthracite);
  page.drawRectangle({ x: 0, y: H - headH - 4, width: W, height: 4, color: C.cyan });
  y = H - headH - 26;

  const section = (title: string) => {
    if (y < 90) newPage();
    page.drawRectangle({ x: M, y: y - 3, width: 3, height: 11, color: C.cyan });
    t(title, M + 10, y, 11, b, C.bleu);
    y -= 19;
  };
  const para = (txt: string) => {
    for (const l of wrap(txt, 9, r, CW - 20)) {
      if (y < 60) newPage();
      t(l, M + 10, y, 9, r, C.texte);
      y -= 12;
    }
    y -= 4;
  };
  // ============ RÉCAPITULATIF ============
  section("RÉCAPITULATIF DE LA PRESTATION");
  const dateLong = quote.event_date
    ? new Date(quote.event_date + "T12:00:00").toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : "-";
  const rows: [string, string][] = [
    ["Client", `${quote.customer_name ?? "-"}  ·  ${quote.customer_email ?? "-"}`],
    ["Type de prestation", quote.event_type || eventKind(quote.formula_name ?? "")],
    ["Date", dateLong],
    ["Lieu", quote.event_location ?? "-"],
    ["Prestation", quote.formula_name ?? "-"],
    ["Montant total", fmt((quote.total_cents ?? 0) / 100)],
  ];
  for (const [k, v] of rows) {
    if (y < 70) newPage();
    t(k, M + 10, y, 9, b, C.anthracite);
    t(v, M + 150, y, 9, r, C.texte);
    y -= 14;
  }
  const total = (quote.total_cents ?? 0) / 100;
  const acompteVal = total - Math.floor((total * 0.8) / 10) * 10;
  if (y < 70) newPage();
  t("Acompte (environ 20 %)", M + 10, y, 9, b, C.bleu);
  t(fmt(acompteVal), right(fmt(acompteVal), W - M - 10, 9, b), y, 9, b, C.bleu);
  y -= 24;

  // ============ ARTICLES ============
  for (const art of ALL_ARTICLES) {
    section(art.titre);
    for (const p of art.paragraphes) para(p);
    y -= 4;
  }
  // ============ SIGNATURES (dernière page, encadré garanti en bas) ============
  if (y < 190) newPage();
  y = 180; // on ancre les signatures en bas de page
  const sig = opts.signature;
  const half = (CW - 20) / 2;
  const boxH = 88;
  const yTop = y - boxH;
  // gauche : organisateur
  page.drawRectangle({ x: M, y: yTop, width: half, height: boxH, borderColor: C.grisLigne, borderWidth: 0.8 });
  t("ORGANISATEUR", M + 12, yTop + 74, 8, b, C.gris);
  t("Signature et mention : Lu et approuvé", M + 12, yTop + 62, 8.5, r, C.gris);
  if (sig) {
    let drawn: PDFImage | null = null;
    if (sig.drawnPng?.startsWith("data:image/png;base64,")) {
      try {
        const b64 = sig.drawnPng.split(",")[1];
        const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        drawn = await doc.embedPng(raw);
      } catch { drawn = null; }
    }
    if (drawn) {
      const w = 150, h2 = Math.min((drawn.height / drawn.width) * w, 44);
      page.drawImage(drawn, { x: M + (half - w) / 2, y: yTop + (62 - 8 - h2) / 2 + 8, width: w, height: h2 });
    } else {
      const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);
      t(sig.name, M + 24, yTop + 20, 15, italic, rgb(0.1, 0.25, 0.55));
    }
    const d = new Date(sig.dateIso).toLocaleDateString("fr-FR");
    t(`Lu et approuvé le ${d}`, right(`Lu et approuvé le ${d}`, M + half - 12, 8, r), yTop + 50, 8, r, C.texte);
  } else {
    page.drawLine({ start: { x: M + 12, y: yTop + 16 }, end: { x: M + half - 30, y: yTop + 16 }, thickness: 0.6, color: C.grisLigne });
  }
  // droite : prestataire
  const rx2 = M + half + 20;
  page.drawRectangle({ x: rx2, y: yTop, width: half, height: boxH, borderColor: C.grisLigne, borderWidth: 0.8 });
  t("PRESTATAIRE", rx2 + 12, yTop + 74, 8, b, C.gris);
  t("SOULAINE Maxime (Propul'Sound DJ)", rx2 + 12, yTop + 62, 8.5, b, C.texte);
  if (sigImg) {
    const sigW = 130, sigH = Math.min((sigImg.height / sigImg.width) * sigW, 50);
    page.drawImage(sigImg, { x: rx2 + (half - sigW) / 2, y: yTop + (62 - 6 - sigH) / 2 + 6, width: sigW, height: sigH });
  } else {
    page.drawLine({ start: { x: rx2 + 12, y: yTop + 16 }, end: { x: rx2 + half - 30, y: yTop + 16 }, thickness: 0.6, color: C.grisLigne });
  }

  y = yTop - 14;
  if (y < 30) newPage();
  t(
    `Fait en deux exemplaires, à Huisseau-sur-Cosson, le ${new Date().toLocaleDateString("fr-FR")}.`,
    M, y, 8, r, C.gris
  );
  page.drawRectangle({ x: 0, y: 12, width: W, height: 3, color: C.cyan });

  return doc.save();
}

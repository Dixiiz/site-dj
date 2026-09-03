import fs from "node:fs";
import path from "node:path";
import type { PDFDocument, PDFForm } from "pdf-lib";

/**
 * Remplit un modèle de devis PDF (créé dans Word avec des champs de formulaire)
 * avec les données du devis. Renvoie null si le modèle est absent ou inexploitable,
 * auquel cas l'application génère le devis PDF par défaut.
 *
 * Noms des champs attendus dans le modèle (tous facultatifs) :
 *   client_name, client_email, client_phone, event_type, event_date,
 *   event_time, event_location, pack_name, pack_price, options,
 *   travel, extra_hours, total, conditions, notes
 */
export async function fillDevisTemplate(
  quote: Record<string, unknown>
): Promise<Uint8Array | null> {
  const templatePath = path.join(process.cwd(), "templates", "devis-template.pdf");
  if (!fs.existsSync(templatePath)) return null;

  try {
    const { PDFDocument } = await import("pdf-lib");
    const doc: PDFDocument = await PDFDocument.load(
      await fs.promises.readFile(templatePath)
    );
    const form: PDFForm = doc.getForm();

    const eur = (cents: unknown) =>
      `${((Number(cents) || 0) / 100).toFixed(2)} EUR`;
    const str = (v: unknown) => (v == null || v === "" ? "-" : String(v));

    const set = (name: string, value: string) => {
      try {
        const field = form.getFieldMaybe(name);
        if (!field) return;
        const text = field as { setText?: (v: string) => void; enableMultiline?: () => void };
        text.enableMultiline?.();
        text.setText?.(value);
      } catch {
        // champ absent ou non textuel : on ignore
      }
    };

    // Date en format français si possible.
    const rawDate = quote.event_date as string | null;
    let dateFr = str(rawDate);
    if (rawDate && /^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
      dateFr = new Date(rawDate).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    const time = quote.start_time
      ? `${quote.start_time}${quote.end_time ? ` à ${quote.end_time}` : ""}`
      : "";

    const options = (quote.selected_options ?? []) as {
      name: string;
      qty?: number;
      price_cents: number;
    }[];
    const optionsText = options
      .map(
        (o) =>
          `- ${o.name}${o.qty && o.qty > 1 ? ` x${o.qty}` : ""} : ${eur(o.price_cents)}`
      )
      .join("\n");

    set("client_name", str(quote.customer_name));
    set("client_email", str(quote.customer_email));
    set("client_phone", str(quote.customer_phone));
    set("event_type", str(quote.event_type));
    set("event_date", dateFr);
    set("event_time", time || "-");
    set("event_location", str(quote.event_location));
    set("pack_name", str(quote.formula_name));
    set("pack_price", eur(quote.formula_price_cents));
    if (optionsText) set("options", optionsText);
    if (Number(quote.travel_fee_cents) > 0)
      set(
        "travel",
        `Déplacement (${str(quote.travel_distance_km)} km A/R) : ${eur(quote.travel_fee_cents)}`
      );
    if (Number(quote.extra_fee_cents) > 0)
      set("extra_hours", `Heures supplémentaires : ${eur(quote.extra_fee_cents)}`);
    set("total", eur(quote.total_cents));
    if (typeof quote.devis_conditions === "string" && quote.devis_conditions)
      set("conditions", quote.devis_conditions);
    if (typeof quote.devis_notes === "string" && quote.devis_notes)
      set("notes", quote.devis_notes);

    form.flatten(); // champs non modifiables dans le PDF final
    return await doc.save();
  } catch {
    // Modèle invalide : on retombe sur la génération par défaut.
    return null;
  }
}

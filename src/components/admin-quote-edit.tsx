"use client";

import { useState } from "react";
import { updateQuoteAdmin } from "@/app/actions";
import type { SelectedOption } from "@/lib/types";

type Quote = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  event_location: string | null;
  event_date: string | null;
  notes: string | null;
  formula_name: string;
  formula_price_cents: number | null;
  travel_distance_km: number | null;
  travel_fee_cents: number | null;
  extra_fee_cents: number | null;
  total_cents: number | null;
  status: string;
};

const euros = (cents: number | null) =>
  ((cents ?? 0) / 100).toFixed(2).replace(".", ",");

export function AdminQuoteEdit({
  quote,
  options,
}: {
  quote: Quote;
  options: SelectedOption[];
}) {
  const [open, setOpen] = useState(false);
  const optionsRaw = options.map((o) => `${o.name} | ${euros(o.price_cents)}`).join("\n");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
      >
        ✎ Modifier
      </button>
    );
  }

  const input =
    "w-full rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent";
  const label = "block text-xs text-muted-foreground mb-1";

  return (
    <form
      action={updateQuoteAdmin}
      className="w-full space-y-3 rounded-xl border border-accent/40 bg-primary/5 p-4"
    >
      <input type="hidden" name="id" value={quote.id} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Nom du client</label>
          <input name="customer_name" defaultValue={quote.customer_name} className={input} required />
        </div>
        <div>
          <label className={label}>E-mail</label>
          <input name="customer_email" type="email" defaultValue={quote.customer_email} className={input} required />
        </div>
        <div>
          <label className={label}>Téléphone</label>
          <input name="customer_phone" defaultValue={quote.customer_phone ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Lieu de réception</label>
          <input name="event_location" defaultValue={quote.event_location ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Date de l&apos;événement</label>
          <input name="event_date" type="date" defaultValue={quote.event_date ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Horaires / notes</label>
          <input name="notes" defaultValue={quote.notes ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Pack</label>
          <input name="formula_name" defaultValue={quote.formula_name} className={input} />
        </div>
        <div>
          <label className={label}>Prix du pack (€)</label>
          <input name="formula_price" defaultValue={euros(quote.formula_price_cents)} className={input} />
        </div>
        <div>
          <label className={label}>Déplacement — distance (km)</label>
          <input name="travel_distance_km" defaultValue={quote.travel_distance_km ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Frais de déplacement (€)</label>
          <input name="travel_fee" defaultValue={euros(quote.travel_fee_cents)} className={input} />
        </div>
        <div>
          <label className={label}>Suppléments (heures supp…) (€)</label>
          <input name="extra_fee" defaultValue={euros(quote.extra_fee_cents)} className={input} />
        </div>
        <div>
          <label className={label}>Total (€)</label>
          <input name="total" defaultValue={euros(quote.total_cents)} className={input} />
        </div>
      </div>
      <div>
        <label className={label}>
          Options — une par ligne, format « Nom | prix »
        </label>
        <textarea name="options_raw" defaultValue={optionsRaw} rows={3} className={input} />
      </div>
      <div>
        <label className={label}>Statut</label>
        <select name="status" defaultValue={quote.status} className={input}>
          <option value="nouveau">Nouveau</option>
          <option value="contacte">Contacté</option>
          <option value="confirme">Confirmé</option>
          <option value="refuse">Refusé</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-90"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { updateQuoteAdmin } from "@/app/actions";
import { ADMIN_PACK_LIST, ADMIN_FX_OPTIONS } from "@/components/pricing-section";
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
  const [packId, setPackId] = useState(
    ADMIN_PACK_LIST.find((p) => p.name === quote.formula_name)?.id ?? "custom"
  );
  const [packPrice, setPackPrice] = useState(euros(quote.formula_price_cents));
  const [checked, setChecked] = useState<string[]>(
    options.map((o) => o.name).filter((n) => ADMIN_FX_OPTIONS.some((f) => f.name === n))
  );
  const [co2Qty, setCo2Qty] = useState(
    options.find((o) => o.name.startsWith("Pistolet"))?.name.includes("× 2") ? 2 : 1
  );
  const [travelDist, setTravelDist] = useState(String(quote.travel_distance_km ?? ""));
  const [travelFee, setTravelFee] = useState(euros(quote.travel_fee_cents));
  const [extraFee, setExtraFee] = useState(euros(quote.extra_fee_cents));

  // Options cochées -> format "Nom | prix"
  const selectedOptions = checked
    .map((name) => {
      const fx = ADMIN_FX_OPTIONS.find((f) => f.name === name);
      if (!fx) return null;
      const qty = name.includes("CO2") ? co2Qty : 1;
      const label = name.includes("CO2") && qty > 1 ? `${name} × ${qty}` : name;
      return { name: label, price: fx.price * qty };
    })
    .filter((o): o is { name: string; price: number } => o !== null);

  const total =
    Math.round(Number.parseFloat(packPrice.replace(",", ".")) * 100 || 0) +
    Math.round(Number.parseFloat(travelFee.replace(",", ".")) * 100 || 0) +
    Math.round(Number.parseFloat(extraFee.replace(",", ".")) * 100 || 0) +
    selectedOptions.reduce((sum, o) => sum + o.price, 0);

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
          <label className={label}>Déplacement — distance (km)</label>
          <input
            name="travel_distance_km"
            value={travelDist}
            onChange={(e) => setTravelDist(e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Frais de déplacement (€)</label>
          <input
            name="travel_fee"
            value={travelFee}
            onChange={(e) => setTravelFee(e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Suppléments (heures supp…) (€)</label>
          <input
            name="extra_fee"
            value={extraFee}
            onChange={(e) => setExtraFee(e.target.value)}
            className={input}
          />
        </div>
      </div>

      {/* Pack : clic pour choisir */}
      <div>
        <label className={label}>Pack (cliquez pour sélectionner)</label>
        <div className="flex flex-wrap gap-2">
          {ADMIN_PACK_LIST.map((p) => {
            const active = packId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPackId(p.id);
                  setPackPrice(euros(p.price));
                }}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${
                  active
                    ? "border-accent bg-accent/15 text-foreground shadow-[0_0_12px_rgba(96,165,250,0.35)] scale-105"
                    : "border-border text-muted-foreground hover:border-accent/60"
                }`}
              >
                {active && <span className="mr-1 text-accent">✓</span>}
                {p.name} · {euros(p.price)} €
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setPackId("custom")}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${
              packId === "custom"
                ? "border-accent bg-accent/15 text-foreground scale-105"
                : "border-border text-muted-foreground hover:border-accent/60"
            }`}
          >
            Autre / prix libre
          </button>
        </div>
        {packId === "custom" && (
          <input
            name="formula_name"
            placeholder="Nom du pack"
            defaultValue={quote.formula_name}
            className={`${input} mt-2`}
          />
        )}
        <input
          name="formula_name_hidden"
          type="hidden"
          value={ADMIN_PACK_LIST.find((p) => p.id === packId)?.name ?? ""}
        />
        <div className="mt-2 w-40">
          <label className={label}>Prix du pack (€)</label>
          <input
            name="formula_price"
            value={packPrice}
            onChange={(e) => setPackPrice(e.target.value)}
            className={input}
          />
        </div>
      </div>

      {/* Options : cases à cocher */}
      <div>
        <label className={label}>Options (cochez / décochez)</label>
        <div className="space-y-1.5">
          {ADMIN_FX_OPTIONS.map((fx) => {
            const active = checked.includes(fx.name);
            return (
              <div key={fx.name} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setChecked((prev) =>
                      active ? prev.filter((n) => n !== fx.name) : [...prev, fx.name]
                    )
                  }
                  className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                    active
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border text-muted-foreground hover:border-accent/60"
                  }`}
                >
                  <span className={`mr-2 ${active ? "text-accent" : "text-transparent"}`}>✓</span>
                  {fx.name} — {euros(fx.price)} €
                </button>
                {fx.name.includes("CO2") && active && (
                  <select
                    value={co2Qty}
                    onChange={(e) => setCo2Qty(Number(e.target.value))}
                    className={`${input} w-36`}
                  >
                    <option value={1}>1 pistolet</option>
                    <option value={2}>2 pistolets</option>
                  </select>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Total auto */}
      <div className="flex items-center justify-between rounded-lg border border-accent/40 bg-primary/10 px-4 py-2">
        <span className="text-sm text-muted-foreground">Total recalculé automatiquement</span>
        <span className="text-lg font-medium text-accent">
          {(total / 100).toFixed(2).replace(".", ",")} €
        </span>
      </div>
      <div>
        <label className={label}>Statut</label>
        <select name="status" defaultValue={quote.status} className={input}>
          <option value="nouveau">Nouveau</option>
          <option value="contacte">Contacté</option>
          <option value="confirme">Confirmé</option>
          <option value="refuse">Refusé</option>
          <option value="annule">Annulé</option>
        </select>
      </div>
      <input type="hidden" name="options_raw" value={selectedOptions.map((o) => `${o.name} | ${(o.price / 100).toFixed(2).replace(".", ",")}`).join("\n")} />
      <input type="hidden" name="total" value={(total / 100).toFixed(2).replace(".", ",")} />
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

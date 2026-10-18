"use client";

import { useEffect, useState } from "react";
import { updateQuoteAdmin, estimateTravelAdmin } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { ADMIN_PACK_LIST, ADMIN_FX_OPTIONS } from "@/components/pricing-section";
import { extraMinutes, formatExtraHours, packBaseMinutes } from "@/lib/booking-extra";
import { EXTRA_HOUR_RATE_CENTS } from "@/lib/booking-rules";
import type { SelectedOption } from "@/lib/types";

type Quote = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  event_location: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  formula_name: string;
  formula_price_cents: number | null;
  travel_distance_km: number | null;
  travel_fee_cents: number | null;
  extra_fee_cents: number | null;
  extra_fee_label?: string | null;
  total_cents: number | null;
  status: string;
  acompte_required?: boolean | null;
};

const euros = (cents: number | null) =>
  ((cents ?? 0) / 100).toFixed(2).replace(".", ",");

// Récupère "Début : 18:00" / "Fin : 04:00" dans les anciennes notes
function parseTime(notes: string | null, key: string) {
  if (!notes) return null;
  const m = notes.match(new RegExp(`${key}\\s*:\\s*(\\d{1,2}:\\d{2})`));
  return m ? m[1] : null;
}

// Extrait uniquement le message client des anciennes notes
function parseMessage(notes: string | null) {
  if (!notes) return "";
  const m = notes.match(/Message\s*:\s*([\s\S]*)$/);
  return m ? m[1].trim() : "";
}

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
  const [checked, setChecked] = useState<string[]>(() => {
    // Round-trip : « Pistolets CO2 × 2 » enregistré → re-coche « Pistolets CO2 »
    // (la quantité, elle, est restaurée par co2Qty ci-dessous).
    const names: string[] = [];
    for (const o of options) {
      const fx = ADMIN_FX_OPTIONS.find(
        (f) => o.name === f.name || o.name.startsWith(`${f.name} ×`)
      );
      if (fx && !names.includes(fx.name)) names.push(fx.name);
    }
    return names;
  });
  const [co2Qty, setCo2Qty] = useState(
    options.find((o) => o.name.startsWith("Pistolet"))?.name.includes("× 2") ? 2 : 1
  );
  // Lignes supplémentaires manuelles (location de matériel, aller-retour RDV…) :
  // tout ce qui n'appartient pas au catalogue FX est repris ici — rien n'est
  // perdu à la ré-édition. Montant = total de la ligne (€).
  const [manualLines, setManualLines] = useState<{ label: string; amount: string }[]>(
    () => {
      const isFx = (name: string) =>
        ADMIN_FX_OPTIONS.some((f) => name === f.name || name.startsWith(`${f.name} ×`));
      return options
        .filter((o) => !isFx(o.name))
        .map((o) => ({ label: o.name, amount: euros(o.price_cents) }));
    }
  );
  const [travelDist, setTravelDist] = useState(String(quote.travel_distance_km ?? ""));
  const [travelFee, setTravelFee] = useState(euros(quote.travel_fee_cents));
  const [extraFee, setExtraFee] = useState(euros(quote.extra_fee_cents));
  const [extraLabel, setExtraLabel] = useState(quote.extra_fee_label ?? "");
  // Horaires contrôlés : le supplément « heures supplémentaires » est
  // recalculé en direct quand ils changent (bug : le prix ne suivait pas).
  const [startTime, setStartTime] = useState(
    quote.start_time ?? parseTime(quote.notes, "Début") ?? ""
  );
  const [endTime, setEndTime] = useState(
    quote.end_time ?? parseTime(quote.notes, "Fin") ?? ""
  );
  // Dès que l'admin écrit dans « Supplément » (péage…), l'auto-remplissage
  // cède la main : la valeur saisie prime.
  const [extraFeeTouched, setExtraFeeTouched] = useState(false);
  const [travelBusy, setTravelBusy] = useState(false);
  const [travelMsg, setTravelMsg] = useState<string | null>(null);

  // Bouton « magique » : géocode l'adresse, calcule la distance réelle,
  // les frais de déplacement et le péage estimé (si TollGuru configuré).
  async function calcTravel() {
    if (!quote.event_location) {
      setTravelMsg("Ajoute d'abord un lieu de réception au devis.");
      return;
    }
    setTravelBusy(true);
    setTravelMsg(null);
    try {
      const fd = new FormData();
      fd.set("location", quote.event_location);
      const res = await estimateTravelAdmin(fd);
      if (res && res.ok) {
        setTravelDist(String(res.distanceKm));
        setTravelFee(euros(res.travelFeeCents));
        setTravelMsg(`Distance ${res.distanceKm} km aller ✓ — pense à ajouter le péage dans « Supplément » si besoin.`);
      } else if (res && !res.ok) {
        setTravelMsg(res.error);
      }
    } catch {
      setTravelMsg("Calcul impossible pour le moment.");
    } finally {
      setTravelBusy(false);
    }
  }

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

  // Somme des lignes supplémentaires manuelles (€)
  const manualLinesTotal = manualLines.reduce((sum, l) => {
    if (!l.label.trim()) return sum;
    const n = Number.parseFloat(l.amount.replace(",", "."));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  // Heures supplémentaires recalculées en direct depuis les horaires et le
  // pack choisi (même règle que le site et la facturation serveur : heures
  // entamées dues). null = indéterminable (pack libre non reconnu, ou
  // libellé personnalisé déjà posé type « Péage ») → on ne touche à rien.
  // ⚠️ extraMinutes distingue « 0 min supp » (durée dans le forfait) de
  // « indéterminable » : c'est ce qui permet de REMETTRE le supplément à zéro
  // quand on passe sous le forfait (ex : 19h-4h → 20h-4h).
  const selectedPack = ADMIN_PACK_LIST.find((p) => p.id === packId);
  const extraRateCents = selectedPack?.extraRateCents ?? EXTRA_HOUR_RATE_CENTS;
  const extraMinutesCalc = extraMinutes({
    formula_name: selectedPack?.name ?? quote.formula_name,
    start_time: startTime,
    end_time: endTime,
    extra_fee_label: extraLabel,
  });
  const autoExtraHours =
    extraMinutesCalc != null ? Math.ceil(Math.max(0, extraMinutesCalc) / 60) : null;
  const autoExtraCents =
    autoExtraHours != null ? autoExtraHours * extraRateCents : null;

  useEffect(() => {
    if (autoExtraCents != null && !extraFeeTouched) {
      setExtraFee(euros(autoExtraCents));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExtraCents, extraFeeTouched]);

  const total =
    Math.round(Number.parseFloat(packPrice.replace(",", ".")) * 100 || 0) +
    Math.round(Number.parseFloat(travelFee.replace(",", ".")) * 100 || 0) +
    Math.round(Number.parseFloat(extraFee.replace(",", ".")) * 100 || 0) +
    selectedOptions.reduce((sum, o) => sum + o.price, 0) +
    // ⚠️ manualLinesTotal est en euros (saisie du formulaire) : on convertit
    // en centimes comme le reste du calcul, sinon une ligne de 250 € ne
    // faisait gagner que 2,50 € au total.
    Math.round(manualLinesTotal * 100);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
      >
        Modifier
      </button>
    );
  }

  const input =
 "w-full rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent";
  const label = "block text-xs text-muted-foreground mb-1";

  return (
    <form
      action={async (formData: FormData) => {
        await updateQuoteAdmin(formData);
      }}
      className="w-full space-y-3 rounded-xl border border-accent/40 bg-primary/5 p-4"
    >
      <input type="hidden" name="id" value={quote.id} />
      <input
        type="hidden"
        name="checked_options"
        value={checked.join("||")}
      />
      <input type="hidden" name="co2_qty" value={co2Qty} />
      {/* Lignes supplémentaires manuelles : libellé + montant libres (JSON) */}
      <input
        type="hidden"
        name="manual_lines"
        value={JSON.stringify(
          manualLines
            .map((l) => ({ label: l.label.trim(), amount: l.amount.trim() }))
            .filter((l) => l.label !== "")
        )}
      />
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
          <label className={label}>Heure de début</label>
          <input
            name="start_time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Heure de fin</label>
          <input
            name="end_time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={input}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Message du client / vos notes</label>
          <input
            name="notes"
            defaultValue={parseMessage(quote.notes)}
            className={input}
            placeholder="Message du client, ambiance souhaitée, contraintes…"
          />
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
          <label className={label}>Supplément (heures supp, péage…) (€)</label>
          <input
            name="extra_fee"
            value={extraFee}
            onChange={(e) => {
              setExtraFee(e.target.value);
              setExtraFeeTouched(true);
            }}
            className={input}
          />
          {extraFeeTouched ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Valeur saisie à la main — elle prime sur le calcul automatique.
            </p>
          ) : null}
        </div>
        <div>
          <label className={label}>Libellé du supplément (visible par le client)</label>
          <input
            name="extra_fee_label"
            value={extraLabel}
            onChange={(e) => setExtraLabel(e.target.value)}
            placeholder="Ex : Péage, Heures supplémentaires…"
            className={input}
          />
        </div>
      </div>
      {/* Rappel en direct : durée vs forfait du pack sélectionné */}
      {autoExtraHours != null ? (
        <p className="text-xs text-muted-foreground">
          {autoExtraHours > 0
            ? `⏱ ${formatExtraHours(autoExtraHours)} supplémentaires au-delà du forfait (${formatExtraHours((packBaseMinutes(selectedPack?.name ?? quote.formula_name) ?? 0) / 60)} incluses) — soit ${euros(autoExtraHours * extraRateCents)} € dans le champ « Supplément ».`
            : `⏱ Durée dans le forfait (${formatExtraHours((packBaseMinutes(selectedPack?.name ?? quote.formula_name) ?? 0) / 60)} incluses) — aucun supplément d'heures.`}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={calcTravel}
          disabled={travelBusy}
          className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-60"
        >
          {travelBusy ? "Calcul en cours…" : "Calculer la distance et les frais de déplacement"}
        </button>
        {travelMsg ? <span className="text-xs text-muted-foreground">{travelMsg}</span> : null}
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

      {/* Lignes supplémentaires manuelles : libellé + montant libres */}
      <div>
        <label className={label}>
          Lignes supplémentaires (location matériel, aller-retour RDV, péage…)
        </label>
        <div className="space-y-1.5">
          {manualLines.map((line, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={line.label}
                onChange={(e) =>
                  setManualLines((prev) =>
                    prev.map((l, i) => (i === index ? { ...l, label: e.target.value } : l))
                  )
                }
                placeholder="Ex : Location matériel"
                className={`${input} flex-1`}
              />
              <div className="relative w-28 shrink-0">
                <input
                  value={line.amount}
                  onChange={(e) =>
                    setManualLines((prev) =>
                      prev.map((l, i) => (i === index ? { ...l, amount: e.target.value } : l))
                    )
                  }
                  placeholder="0,00"
                  inputMode="decimal"
                  className={`${input} pr-7`}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  €
                </span>
              </div>
              <button
                type="button"
                onClick={() => setManualLines((prev) => prev.filter((_, i) => i !== index))}
                aria-label="Retirer cette ligne"
                className="rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-red-400 hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setManualLines((prev) => [...prev, { label: "", amount: "" }])}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
          >
            + Ajouter une ligne
          </button>
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
          <option value="attente_acompte">En attente de l’acompte</option>
          <option value="confirme">Confirmé</option>
          <option value="refuse">Refusé</option>
          <option value="annule">Annulé</option>
        </select>
      </div>
      <label className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm">
        <input
          type="checkbox"
          name="acompte_required"
          defaultChecked={quote.acompte_required !== false}
          className="size-4 accent-[#21619A]"
        />
        <span>
          Acompte de réservation demandé (20 % du total)
          <span className="ml-1 text-xs text-muted-foreground">
            — décoche pour une soirée sans acompte (confirmée dès la signature)
          </span>
        </span>
      </label>
      <input type="hidden" name="options_raw" value={selectedOptions.map((o) => `${o.name} | ${(o.price / 100).toFixed(2).replace(".", ",")}`).join("\n")} />
      <input type="hidden" name="total" value={(total / 100).toFixed(2).replace(".", ",")} />
      <div className="flex gap-2">
        <SubmitButton
          pendingLabel="Enregistrement…"
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-90"
        >
          Enregistrer
        </SubmitButton>
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

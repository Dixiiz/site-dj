"use client";

// Formulaire de création d'un devis sur mesure (admin) : mêmes conventions
// que l'édition de devis (packs, options FX, déplacement calculé, total auto).
import { useState } from "react";
import { createCustomQuote, estimateTravelAdmin } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { ADMIN_PACK_LIST, ADMIN_FX_OPTIONS } from "@/components/pricing-section";

const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function AdminQuoteCreateForm() {
  const [packId, setPackId] = useState(ADMIN_PACK_LIST[0]?.id ?? "custom");
  const [packPrice, setPackPrice] = useState(euros(ADMIN_PACK_LIST[0]?.price ?? 0));
  const [checked, setChecked] = useState<string[]>([]);
  const [co2Qty, setCo2Qty] = useState(1);
  const [travelDist, setTravelDist] = useState("");
  const [travelFee, setTravelFee] = useState("0,00");
  const [startVal, setStartVal] = useState("");
  const [endVal, setEndVal] = useState("");
  const [extraRate, setExtraRate] = useState("55");
  const [otherFee, setOtherFee] = useState("0,00");
  const [otherLabel, setOtherLabel] = useState("");
  const [travelBusy, setTravelBusy] = useState(false);
  const [travelMsg, setTravelMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bouton « magique » : géocode l'adresse, calcule la distance réelle,
  // les frais de déplacement et le péage estimé (si TollGuru configuré).
  async function calcTravel() {
    const location =
      document.querySelector<HTMLInputElement>('[name="event_location"]')?.value.trim() ?? "";
    if (!location) {
      setTravelMsg("Ajoute d'abord le lieu de réception.");
      return;
    }
    setTravelBusy(true);
    setTravelMsg(null);
    try {
      const fd = new FormData();
      fd.set("location", location);
      const res = await estimateTravelAdmin(fd);
      if (res && res.ok) {
        setTravelDist(String(res.distanceKm));
        setTravelFee(euros(res.travelFeeCents));
        setTravelMsg(`Distance ${res.distanceKm} km aller ✓ — pense au péage dans « Supplément » si besoin.`);
      } else if (res && !res.ok) {
        setTravelMsg(res.error);
      }
    } catch {
      setTravelMsg("Calcul impossible pour le moment.");
    } finally {
      setTravelBusy(false);
    }
  }

  // Options cochées -> { name, price }
  const selectedOptions = checked
    .map((name) => {
      const fx = ADMIN_FX_OPTIONS.find((f) => f.name === name);
      if (!fx) return null;
      const qty = name.includes("CO2") ? co2Qty : 1;
      const nameLabel = name.includes("CO2") && qty > 1 ? `${name} × ${qty}` : name;
      return { name: nameLabel, price: fx.price * qty };
    })
    .filter((o): o is { name: string; price: number } => o !== null);

  // Heures facturées : déduites automatiquement des horaires (fin après
  // minuit gérée), moins les minutes incluses dans le pack sélectionné
  // (pack « prix libre » → 0 h incluse, toute la durée est facturée).
  const packBaseMinutes =
    packId === "custom"
      ? 0
      : (ADMIN_PACK_LIST.find((p) => p.id === packId)?.baseMinutes ?? 0);
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const startMin = toMin(startVal);
  const endMinRaw = toMin(endVal);
  const endMin = endMinRaw < 12 * 60 ? endMinRaw + 24 * 60 : endMinRaw;
  const pastBase = startVal && endVal ? endMin - startMin - packBaseMinutes : 0;
  const autoHours = pastBase > 0 ? Math.ceil(pastBase / 60) : 0;

  // Supplément : heures × taux horaire du pack (+ autres frais libres).
  const extraRateNum = Math.max(0, Number.parseFloat(extraRate.replace(",", ".")) || 0);
  const otherFeeCents = Math.round(Number.parseFloat(otherFee.replace(",", ".")) * 100 || 0);
  const extraFeeCents = Math.round(autoHours * extraRateNum * 100) + otherFeeCents;

  // Libellé auto : décrit précisément le calcul pour le client (PDF devis/facture).
  const labelParts: string[] = [];
  if (autoHours > 0 && extraRateNum > 0) {
    labelParts.push(`Heures (${autoHours} h × ${String(extraRateNum).replace(".", ",")} €/h)`);
  }
  if (otherFeeCents > 0) {
    labelParts.push(otherLabel.trim() || "Frais divers");
  }
  const extraFeeLabel = labelParts.join(" · ");

  const total =
    Math.round(Number.parseFloat(packPrice.replace(",", ".")) * 100 || 0) +
    Math.round(Number.parseFloat(travelFee.replace(",", ".")) * 100 || 0) +
    extraFeeCents +
    selectedOptions.reduce((sum, o) => sum + o.price, 0);

  const input =
    "w-full rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent";
  const label = "block text-xs text-muted-foreground mb-1";

  return (
    <form
      action={async (formData: FormData) => {
        setError(null);
        const result = await createCustomQuote(formData);
        if (result && !result.ok) setError(result.error ?? "Erreur inattendue.");
      }}
      className="w-full max-w-3xl space-y-4 rounded-xl border border-accent/40 bg-primary/5 p-4"
    >
      <input type="hidden" name="checked_options" value={checked.join("||")} />
      <input type="hidden" name="co2_qty" value={co2Qty} />
      <input type="hidden" name="total" value={(total / 100).toFixed(2).replace(".", ",")} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Nom du client *</label>
          <input name="customer_name" className={input} required />
        </div>
        <div>
          <label className={label}>E-mail *</label>
          <input name="customer_email" type="email" className={input} required />
        </div>
        <div>
          <label className={label}>Téléphone</label>
          <input name="customer_phone" className={input} />
        </div>
        <div>
          <label className={label}>Type d&apos;événement</label>
          <select name="event_type" className={input} defaultValue="">
            <option value="">—</option>
            <option value="mariage">Mariage</option>
            <option value="anniversaire">Anniversaire</option>
            <option value="soiree_privee">Soirée privée</option>
            <option value="association">Association / comité des fêtes</option>
            <option value="evenement_entreprise">Événement entreprise</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Lieu de réception</label>
          <input name="event_location" className={input} />
        </div>
        <div>
          <label className={label}>Date de l&apos;événement *</label>
          <input name="event_date" type="date" className={input} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Début</label>
            <input name="start_time" type="time" value={startVal} onChange={(e) => setStartVal(e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>Fin</label>
            <input name="end_time" type="time" value={endVal} onChange={(e) => setEndVal(e.target.value)} className={input} />
          </div>
        </div>
        <div>
          <label className={label}>Distance (km)</label>
          <input name="travel_distance_km" value={travelDist} onChange={(e) => setTravelDist(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Frais de déplacement (€)</label>
          <input name="travel_fee" value={travelFee} onChange={(e) => setTravelFee(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Heures (calcul auto)</label>
          <input
            value={autoHours > 0 ? `${autoHours} h` : "—"}
            readOnly
            className={`${input} cursor-default bg-muted/40 text-muted-foreground`}
            title="Calculé depuis les horaires, moins les heures incluses dans le pack"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            {packBaseMinutes > 0
              ? `Forfait : ${Math.floor(packBaseMinutes / 60)} h incluses dans le pack`
              : "Pack prix libre : toute la durée est facturée"}
          </p>
        </div>
        <div>
          <label className={label}>Taux horaire (€/h)</label>
          <input name="extra_rate" value={extraRate} onChange={(e) => setExtraRate(e.target.value)} inputMode="decimal" className={input} />
        </div>
        <div>
          <label className={label}>Autres frais (€)</label>
          <input name="other_fee" value={otherFee} onChange={(e) => setOtherFee(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Libellé des autres frais (péage…)</label>
          <input
            name="other_fee_label"
            value={otherLabel}
            onChange={(e) => setOtherLabel(e.target.value)}
            placeholder="Ex : Péage"
            className={input}
          />
        </div>
      </div>
      <input type="hidden" name="extra_fee" value={(extraFeeCents / 100).toFixed(2).replace(".", ",")} />
      <input type="hidden" name="extra_fee_label" value={extraFeeLabel} />
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
                  setExtraRate(euros(p.extraRateCents));
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
            onClick={() => {
              setPackId("custom");
              setPackPrice("0,00");
            }}
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
          <input name="formula_name" placeholder="Nom du pack (ex : Formule sur mesure)" className={`${input} mt-2`} />
        )}
        <input
          name="formula_name_hidden"
          type="hidden"
          value={ADMIN_PACK_LIST.find((p) => p.id === packId)?.name ?? ""}
        />
        <div className="mt-2 w-40">
          <label className={label}>Prix du pack (€)</label>
          <input name="formula_price" value={packPrice} onChange={(e) => setPackPrice(e.target.value)} className={input} />
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
                  <select value={co2Qty} onChange={(e) => setCo2Qty(Number(e.target.value))} className={`${input} w-36`}>
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
        <span className="text-sm text-muted-foreground">Total (calculé automatiquement)</span>
        <span className="text-lg font-medium text-accent">{(total / 100).toFixed(2).replace(".", ",")} €</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Statut initial</label>
          <select name="status" defaultValue="contacte" className={input}>
            <option value="nouveau">Nouveau</option>
            <option value="contacte">Contacté</option>
            <option value="attente_signature">En attente de signature</option>
            <option value="attente_acompte">En attente de l&apos;acompte</option>
            <option value="confirme">Confirmé</option>
          </select>
        </div>
        <div>
          <label className={label}>Notes internes / message</label>
          <input name="notes" className={input} placeholder="Ex : négocié à X €, options offertes…" />
        </div>
      </div>
      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      ) : null}
      <SubmitButton
        pendingLabel="Création…"
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-primary transition-opacity hover:opacity-90"
      >
        Créer le devis
      </SubmitButton>
    </form>
  );
}

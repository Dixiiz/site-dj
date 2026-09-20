"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import {
  creerEcheancier,
  annulerEcheancier,
  startAcompteCheckout,
  declareAcompteSent,
  chooseSoldeSurPlace,
  chooseSoldeEnLigne,
  declareSoldeSent,
  startSoldeCheckout,
} from "@/app/client-actions";
import {
  acompteCents,
  montantsEcheances,
  montantsEcheancesSolde,
  niveauxDisponibles,
} from "@/lib/installments";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";

// Petit bouton "Payer" qui navigue vers le lien d'échéance en navigation
// classique (full page) : plus fiable qu'un <a> en navigation client, qui
// peut échouer avec "Load failed" quand la route serveur met du temps à
// créer la session Stripe (timeout du prefetch/routeur).
function EcheancePayLink({ href }: { href: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        window.location.assign(href);
      }}
      className="rounded-md bg-[#21619A] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1a4d7a] disabled:opacity-60"
      title="Paiement sécurisé par carte — redirection vers Stripe"
    >
      {loading ? "Redirection…" : "Payer"}
    </button>
  );
}

export type ScheduleRow = {
  numero: number;
  total: number;
  amount_cents: number;
  due_date: string;
  status: "a_payer" | "payee";
};

function euros(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

// Choix du mode de règlement du solde : « payer ici » (carte Stripe ou
// virement à déclarer) ou « payer sur place » (espèces, chèque ou virement
// le jour J). Rendu uniquement tant qu'aucun choix n'est actif.
function ChoixSolde({
  quoteId,
  solde,
  eventDate,
  libelleVirement,
  soldeChoix,
  setSoldeChoix,
  modeSurPlace,
  setModeSurPlace,
}: {
  quoteId: string;
  solde: number;
  eventDate: string | null;
  libelleVirement?: string;
  soldeChoix: "ici" | "surplace" | null;
  setSoldeChoix: (v: "ici" | "surplace" | null) => void;
  modeSurPlace: "especes" | "cheque" | "virement";
  setModeSurPlace: (v: "especes" | "cheque" | "virement") => void;
}) {
  if (soldeChoix === null) {
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setSoldeChoix("ici")}
          className="rounded-lg border border-accent/50 bg-accent/5 px-3 py-2 text-left text-sm font-medium transition-all hover:bg-accent/15"
        >
          Payer ici maintenant
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
            par carte (sécurisé) ou par virement
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSoldeChoix("surplace")}
          className="rounded-lg border border-border px-3 py-2 text-left text-sm font-medium transition-all hover:border-accent/50"
        >
          Payer sur place
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
            espèces, chèque ou virement le jour de la soirée
          </span>
        </button>
      </div>
    );
  }

  if (soldeChoix === "surplace") {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          Comment règleras-tu le solde sur place le jour de la prestation
          {eventDate ? ` (${new Date(`${eventDate}T12:00:00`).toLocaleDateString("fr-FR")})` : ""} ?
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ["especes", "Espèces"],
              ["cheque", "Chèque"],
              ["virement", "Virement"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setModeSurPlace(value)}
              className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-all ${
                modeSurPlace === value
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-border text-muted-foreground hover:border-accent/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          action={async (formData: FormData) => {
            const res = await chooseSoldeSurPlace(formData);
            if (res.ok) toast.success(res.message ?? "Noté ✓");
            else toast.error(res.error ?? "Erreur");
          }}
        >
          <input type="hidden" name="quote_id" value={quoteId} />
          <input type="hidden" name="mode" value={modeSurPlace} />
          <SubmitButton
            pendingLabel="Enregistrement…"
            className="rounded-md border border-accent/40 bg-accent/5 px-4 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/15"
          >
            ✓ Je paierai sur place le jour J
          </SubmitButton>
        </form>
        <button
          type="button"
          onClick={() => setSoldeChoix(null)}
          className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          ← Changer de choix
        </button>
      </div>
    );
  }

  // soldeChoix === "ici"
  return (
    <div className="mt-3 space-y-3">
      <form action={startSoldeCheckout}>
        <input type="hidden" name="quote_id" value={quoteId} />
        <SubmitButton
          pendingLabel="Redirection…"
          className="w-full rounded-md bg-[#21619A] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1a4d7a]"
        >
          <span className="flex items-center justify-center gap-1.5">
            <CreditCard className="size-4" aria-hidden />
            Payer le solde par carte ({euros(solde)})
          </span>
        </SubmitButton>
      </form>
      <p className="text-xs text-muted-foreground">
        Ou par virement — libellé&nbsp;:{" "}
        <span className="font-mono text-foreground">{libelleVirement}</span>
      </p>
      <div className="space-y-0.5 rounded-lg border border-border bg-white/5 p-3 text-xs">
        <p>
          <span className="text-muted-foreground">Titulaire :</span> SOULAINE Maxime
        </p>
        <p className="break-all">
          <span className="text-muted-foreground">IBAN :</span>{" "}
          <span className="font-mono">FR76 1027 8374 6200 0110 8580 173</span>
        </p>
        <p>
          <span className="text-muted-foreground">BIC :</span>{" "}
          <span className="font-mono">CMCIFR2A</span>
        </p>
      </div>
      <form
        action={async (formData: FormData) => {
          const res = await declareSoldeSent(formData);
          if (res.ok) toast.success(res.message ?? "Merci ! ✓");
          else toast.error(res.error ?? "Erreur");
        }}
      >
        <input type="hidden" name="quote_id" value={quoteId} />
        <SubmitButton
          pendingLabel="Envoi…"
          className="rounded-md border border-accent/40 px-4 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/15"
        >
          ✓ J&apos;ai envoyé le solde
        </SubmitButton>
      </form>
      <button
        type="button"
        onClick={() => setSoldeChoix(null)}
        className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        ← Changer de choix
      </button>
    </div>
  );
}

// Dates indicatives d'un échéancier (aperçu avant confirmation).
function datesApercu(eventDate: string | null, n: number): string[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const event = eventDate ? new Date(`${eventDate}T12:00:00`) : null;
  const daysUntil = event
    ? Math.max(10, Math.floor((event.getTime() - today.getTime()) / 86400_000) - 2)
    : 30;
  const firstDue = new Date(today.getTime() + 3 * 86400_000);
  const step = Math.floor(Math.max(7, daysUntil - 3) / Math.max(1, n - 1));
  return Array.from({ length: n }, (_, i) =>
    new Date(firstDue.getTime() + i * step * 86400_000).toISOString().slice(0, 10)
  );
}

export default function PaymentPanel({
  quoteId,
  totalCents,
  eventDate,
  initial,
  acomptePaid = false,
  acompteDeclared = false,
  acompteRequis = true,
  soldePayeLe = null,
  soldeSurPlaceMode = null,
  soldeDeclareLe = null,
  libelleVirement,
  notice,
}: {
  quoteId: string;
  totalCents: number;
  eventDate: string | null;
  initial: ScheduleRow[];
  acomptePaid?: boolean;
  acompteDeclared?: boolean;
  /** false = l'admin a décidé de ne pas demander d'acompte pour ce devis. */
  acompteRequis?: boolean;
  /** Date (AAAA-MM-JJ) si le solde a déjà été réglé en ligne. */
  soldePayeLe?: string | null;
  /** Mode choisi si le client paiera le solde sur place (especes/cheque/virement). */
  soldeSurPlaceMode?: string | null;
  /** Date si le client a déclaré avoir envoyé le solde par virement. */
  soldeDeclareLe?: string | null;
  libelleVirement?: string;
  notice?: string;
}) {
  const [rows, setRows] = useState<ScheduleRow[]>(initial);
  // Sélection en cours (avant confirmation) : nombre d'échéances choisi.
  const [brouillon, setBrouillon] = useState<number | null>(null);
  // Choix du solde ouvert : "ici" (carte/virement) ou "surplace".
  const [soldeChoix, setSoldeChoix] = useState<"ici" | "surplace" | null>(null);
  const [modeSurPlace, setModeSurPlace] = useState<"especes" | "cheque" | "virement">("especes");
  const [pending, startTransition] = useTransition();

  const total = Number.isFinite(totalCents) ? totalCents : 0;
  const acompte = acompteRequis ? acompteCents(total) : 0;
  const solde = Math.max(0, total - acompte);
  const dejaPaye = rows.filter((r) => r.status === "payee").length;
  const payeCents = rows.filter((r) => r.status === "payee").reduce((s, r) => s + r.amount_cents, 0);
  // Le solde est-il réglé, déclaré (virement envoyé) ou choisi « sur place » ?
  const soldeEnLigne = Boolean(soldePayeLe);
  const soldeRegleOuGere =
    soldeEnLigne || Boolean(soldeSurPlaceMode) || Boolean(soldeDeclareLe);
  // L'échéancier inclut-il l'acompte (1ʳᵉ échéance) ou porte-t-il sur le solde ?
  const echeancierAvecAcompte = rows.length > 0 && !acomptePaid && acompteRequis;
  // Bloc acompte : seulement s'il est demandé, non réglé ET pas couvert par
  // l'échéancier.
  const montrerBlocAcompte = acompteRequis && !acomptePaid && !echeancierAvecAcompte && rows.length === 0;

  function confirmerEcheancier(n: number) {
    const fd = new FormData();
    fd.set("quote_id", quoteId);
    fd.set("nombre", String(n));
    startTransition(async () => {
      const res = await creerEcheancier(fd);
      if (res.ok) {
        toast.success(res.message ?? "Échéancier confirmé !");
        setBrouillon(null);
        const { first, rest } = acomptePaid
          ? montantsEcheancesSolde(solde, n)
          : montantsEcheances(total, n, acompteRequis);
        setRows(
          Array.from({ length: n }, (_, i) => ({
            numero: i + 1,
            total: n,
            amount_cents: i === 0 ? first : rest,
            due_date: datesApercu(eventDate, n)[i],
            status: "a_payer" as const,
          }))
        );
      } else {
        toast.error(res.error ?? "Erreur");
      }
    });
  }

  function annulerEcheancierActif() {
    const fd = new FormData();
    fd.set("quote_id", quoteId);
    startTransition(async () => {
      const res = await annulerEcheancier(fd);
      if (res.ok) {
        toast.success(res.message ?? "Échéancier annulé.");
        setRows([]);
        setBrouillon(null);
      } else {
        toast.error(res.error ?? "Erreur");
      }
    });
  }

  // Lignes du brouillon (aperçu avant confirmation).
  const lignesBrouillon = brouillon
    ? (() => {
        const { first, rest } = acomptePaid
          ? montantsEcheancesSolde(solde, brouillon)
          : montantsEcheances(total, brouillon, acompteRequis);
        const dates = datesApercu(eventDate, brouillon);
        return Array.from({ length: brouillon }, (_, i) => ({
          numero: i + 1,
          amount: i === 0 ? first : rest,
          due: dates[i],
        }));
      })()
    : null;
  // Détail des frais de l'aperçu : total payé - montant net (frais Stripe).
  const baseBrouillon = acomptePaid ? solde : total;
  const fraisBrouillon = lignesBrouillon
    ? Math.max(0, lignesBrouillon.reduce((s, l) => s + l.amount, 0) - baseBrouillon)
    : 0;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/50 p-5">
        <h2 className="font-medium">Paiement</h2>
        {notice === "ordre" ? (
          <p className="mt-2 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-600">
            Les échéances se règlent dans l&apos;ordre — réglez d&apos;abord la
            précédente pour débloquer la suivante.
          </p>
        ) : null}
        <p className="mt-1 text-sm text-muted-foreground">
          Carte ou virement, en une fois ou étalé de 2 à 10 fois — tout se
          règle ici, à votre rythme.
        </p>

        {/* ---------- Choix du mode ---------- */}
        {rows.length === 0 ? (
          <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 space-y-4 duration-300">
            {/* Acompte de réservation (carte + virement) */}
            {montrerBlocAcompte ? (
              <div className="rounded-lg border border-accent/40 bg-accent/5 p-4">
                <p className="text-sm font-medium">
                  Acompte de réservation —{" "}
                  <span className="text-accent">{euros(acompte)}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Il verrouille votre date dès réception. Réglez-le par carte
                  (confirmation immédiate) ou par virement.
                </p>
                {acompteDeclared ? (
                  <p className="mt-2 rounded-md bg-orange-100 px-3 py-2 text-xs font-medium text-orange-700">
                    Virement déclaré — en attente de réception.
                  </p>
                ) : null}
                <form action={startAcompteCheckout} className="mt-3">
                  <input type="hidden" name="quote_id" value={quoteId} />
                  <SubmitButton
                    pendingLabel="Redirection…"
                    className="rounded-md bg-[#21619A] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1a4d7a]"
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <CreditCard className="size-4" aria-hidden />
                      Payer l&apos;acompte par carte
                    </span>
                  </SubmitButton>
                </form>
                <p className="mt-3 text-xs text-muted-foreground">
                  Ou par virement — libellé&nbsp;:{" "}
                  <span className="font-mono text-foreground">{libelleVirement}</span>
                </p>
                <div className="mt-2 space-y-0.5 rounded-lg border border-border bg-white/5 p-3 text-xs">
                  <p>
                    <span className="text-muted-foreground">Titulaire :</span> SOULAINE Maxime
                  </p>
                  <p className="break-all">
                    <span className="text-muted-foreground">IBAN :</span>{" "}
                    <span className="font-mono">FR76 1027 8374 6200 0110 8580 173</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">BIC :</span>{" "}
                    <span className="font-mono">CMCIFR2A</span>
                  </p>
                </div>
                <form
                  action={async (formData: FormData) => {
                    await declareAcompteSent(formData);
                  }}
                  className="mt-3"
                >
                  <input type="hidden" name="quote_id" value={quoteId} />
                  <SubmitButton
                    pendingLabel="Envoi…"
                    className="rounded-md border border-accent/40 px-4 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/15"
                  >
                    ✓ J&apos;ai envoyé l&apos;acompte
                  </SubmitButton>
                </form>
              </div>
            ) : acompteRequis ? (
              <p className="rounded-md bg-green-100 px-3 py-2 text-xs font-medium text-green-700">
                ✓ Acompte réglé — merci ! Votre date est verrouillée.
              </p>
            ) : (
              <p className="rounded-md bg-green-100 px-3 py-2 text-xs font-medium text-green-700">
                ✓ Aucun acompte demandé pour ce devis — le règlement (carte ou
                virement, en une fois ou étalé) se fait directement ici.
              </p>
            )}

            {/* ---------- Solde : sur place OU réglé ici (une fois l'acompte
                réglé, ou sans acompte) ---------- */}
            {(acomptePaid || !acompteRequis) && solde > 0 ? (
              <div className="rounded-lg border border-border bg-background p-4">
                {soldeEnLigne ? (
                  <>
                    <p className="text-sm font-medium text-green-700">
                      ✓ Solde réglé le{" "}
                      {new Date(`${soldePayeLe}T12:00:00`).toLocaleDateString("fr-FR")} —
                      tout est payé, merci !
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Il est automatiquement compté dans le CA (URSSAF) du mois
                      de réception.
                    </p>
                  </>
                ) : soldeSurPlaceMode ? (
                  <>
                    <p className="text-sm font-medium">
                      Solde à régler sur place —{" "}
                      <span className="text-accent">{euros(solde)}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tu as choisi de régler le solde{" "}
                      {soldeSurPlaceMode === "especes"
                        ? "en espèces"
                        : soldeSurPlaceMode === "cheque"
                          ? "par chèque"
                          : "par virement"}{" "}
                      le jour de la prestation
                      {eventDate
                        ? ` (${new Date(`${eventDate}T12:00:00`).toLocaleDateString("fr-FR")})`
                        : ""}
                      . Pense à prévoir le montant exact.
                    </p>
                    <form
                      action={async (formData: FormData) => {
                        const res = await chooseSoldeEnLigne(formData);
                        if (res.ok) toast.success(res.message ?? "Noté ✓");
                        else toast.error(res.error ?? "Erreur");
                      }}
                      className="mt-3"
                    >
                      <input type="hidden" name="quote_id" value={quoteId} />
                      <SubmitButton
                        pendingLabel="…"
                        className="rounded-md border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Finalement, je paierai le solde ici
                      </SubmitButton>
                    </form>
                  </>
                ) : soldeDeclareLe ? (
                  <>
                    <p className="text-sm font-medium text-orange-700">
                      Virement du solde déclaré le{" "}
                      {new Date(`${soldeDeclareLe}T12:00:00`).toLocaleDateString("fr-FR")} —
                      en attente de réception.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Dès réception confirmée, le solde est automatiquement
                      compté dans le CA (URSSAF).
                    </p>
                  </>
                ) : null}
                {/* Le choix (payer ici / sur place) est rendu juste en dessous. */}
                {soldeEnLigne || soldeSurPlaceMode || soldeDeclareLe ? null : (
                  <ChoixSolde
                    quoteId={quoteId}
                    solde={solde}
                    eventDate={eventDate}
                    libelleVirement={libelleVirement}
                    soldeChoix={soldeChoix}
                    setSoldeChoix={setSoldeChoix}
                    modeSurPlace={modeSurPlace}
                    setModeSurPlace={setModeSurPlace}
                  />
                )}
              </div>
            ) : null}

            {/* Étaler en plusieurs fois (masqué si le solde est déjà réglé,
                déclaré ou choisi « sur place ») */}
            {!soldeRegleOuGere ? (
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm font-medium">
                {montrerBlocAcompte
                  ? "Ou étalez en plusieurs fois"
                  : acompteRequis
                    ? "Étalez le solde en plusieurs fois"
                    : "Étalez le total en plusieurs fois"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {acomptePaid
                  ? `Répartissez le solde (${euros(solde)}) de 2 à 10 fois, toujours avant la soirée.`
                  : acompteRequis
                    ? `Répartissez le total de 2 à 10 fois — la 1ʳᵉ échéance couvre l'acompte (${euros(acompte)}), les montants affichés ci-dessous sont les échéances suivantes. Toujours avant la soirée.`
                    : `Répartissez le total (${euros(total)}) de 2 à 10 fois, toujours avant la soirée.`}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-5 md:grid-cols-9">
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                  const m = acomptePaid
                    ? montantsEcheancesSolde(solde, n)
                    : montantsEcheances(total, n, acompteRequis);
                  const dispo = niveauxDisponibles(acomptePaid ? solde : total).includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={pending || !dispo}
                      onClick={() => setBrouillon(n)}
                      title={
                        dispo
                          ? `${n} fois : 1ʳᵉ échéance ${euros(m.first)} puis ${n - 1} × ${euros(m.rest)}`
                          : `Non disponible : minimum 150 € par échéance${n > 3 ? " et total de 1 000 € minimum au-delà de x3" : ""}`
                      }
                      style={{ animationDelay: `${(n - 2) * 40}ms` }}
                      className={`animate-in fade-in slide-in-from-bottom-1 fill-mode-both rounded-md border p-2 text-center transition-all duration-300 disabled:opacity-30 ${
                        dispo
                          ? "border-border hover:border-accent hover:shadow-sm hover:-translate-y-0.5"
                          : "border-border/50 cursor-not-allowed"
                      }`}
                    >
                      <span className="block text-sm font-semibold">{n}×</span>
                      <span className="block text-xs text-muted-foreground">
                        {dispo ? `puis ${euros(m.rest)}` : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Cliquez pour voir le détail — rien n&apos;est créé avant votre
                confirmation, et vous pourrez changer d&apos;avis tant qu&apos;aucune
                échéance n&apos;est réglée. Minimum 150 € par échéance ; au-delà
                de x3, total de 1 000 € minimum.
              </p>
        {/* ---------- Brouillon : confirmation avant création ---------- */}
        {rows.length === 0 && brouillon && lignesBrouillon ? (
          <div className="mt-4 animate-in fade-in slide-in-from-bottom-3 space-y-3 rounded-lg border border-accent/40 bg-accent/5 p-4 duration-300">
            <p className="text-sm font-medium">
              Votre échéancier en {brouillon} fois — vérifiez avant de confirmer :
            </p>
            <ul className="divide-y divide-border rounded-lg border border-border bg-background text-sm">
              {lignesBrouillon.map((l) => (
                <li key={l.numero} className="flex items-center justify-between gap-3 p-2.5">
                  <div>
                    <span className="font-medium">
                      Échéance {l.numero}/{brouillon}
                    </span>
                    {l.numero === 1 && !acomptePaid && acompteRequis ? (
                      <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                        Acompte
                      </span>
                    ) : null}
                    <span className="ml-2 text-xs text-muted-foreground">
                      avant le {new Date(`${l.due}T12:00:00`).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <span className="font-medium">{euros(l.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Total payé :{" "}
              <span className="font-medium text-foreground">
                {euros(lignesBrouillon.reduce((s, l) => s + l.amount, 0))}
              </span>{" "}
              — dont{" "}
              <span className="font-medium text-foreground">
                {euros(fraisBrouillon)}
              </span>{" "}
              de frais de paiement en ligne (1,5 % + 0,25 € par échéance), soit
              {euros(baseBrouillon)} nets pour le prestataire. Rappels par
              e-mail 3 jours avant chaque échéance.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => confirmerEcheancier(brouillon)}
                disabled={pending}
                className="rounded-md bg-[#21619A] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1a4d7a] disabled:opacity-50"
              >
                {pending ? "Création…" : "✓ Je confirme cet échéancier"}
              </button>
              <button
                type="button"
                onClick={() => setBrouillon(null)}
                disabled={pending}
                className="rounded-md border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                ✕ Annuler la sélection
              </button>
            </div>
          </div>
        ) : null}
            </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 space-y-3 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {dejaPaye}/{rows.length} échéance(s) réglée(s)
              </span>
              <span className="font-medium">
                {euros(payeCents)} / {euros(rows.reduce((s, r) => s + r.amount_cents, 0))}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-[#21619A] transition-all"
                style={{ width: `${(dejaPaye / rows.length) * 100}%` }}
              />
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border bg-background">
              {rows.map((r) => {
                // Paiement dans l'ordre : seule la PREMIÈRE échéance non
                // réglée est payable, les suivantes sont verrouillées.
                const premiereAPayer = rows.find((x) => x.status === "a_payer");
                const payable = r.status === "a_payer" && premiereAPayer?.numero === r.numero;
                return (
                <li key={r.numero} className={`flex items-center justify-between gap-3 p-3 text-sm ${r.status === "a_payer" && !payable ? "opacity-60" : ""}`}>
                  <div>
                    <span className="font-medium">
                      Échéance {r.numero}/{r.total}
                    </span>
                    {r.numero === 1 && echeancierAvecAcompte ? (
                      <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                        Acompte inclus
                      </span>
                    ) : null}
                    <span className="ml-2 text-muted-foreground">
                      avant le {new Date(`${r.due_date}T12:00:00`).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{euros(r.amount_cents)}</span>
                    {r.status === "payee" ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        ✓ Payée
                      </span>
                    ) : payable ? (
                      <EcheancePayLink href={`/paiement/${quoteId}/${r.numero}`} />
                    ) : (
                      <span
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground"
                        title={`Payez d'abord l'échéance ${premiereAPayer?.numero ?? 1}`}
                      >
                        après l&apos;échéance {premiereAPayer?.numero ?? 1}
                      </span>
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
            {dejaPaye === 0 ? (
              <button
                type="button"
                onClick={annulerEcheancierActif}
                disabled={pending}
                className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
              >
                Changer de mode de paiement (annuler cet échéancier)
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
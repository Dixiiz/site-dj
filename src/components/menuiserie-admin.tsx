"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatEuros } from "@/lib/money";

// Interface admin « Menuiserie » : onglets Devis / Factures / Clients,
// création de documents et génération PDF (envoi et signature gérés
// manuellement par l'admin — aucun e-mail automatique).

export type MenuiserieLine = {
  designation: string;
  quantite: number;
  prixUnitaireCents: number;
};

export type MenuiserieDoc = {
  id: string;
  type: "devis" | "facture";
  numero: string;
  client_nom: string;
  client_adresse: string;
  client_cp: string;
  client_ville: string;
  client_email: string | null;
  client_telephone: string | null;
  date_edition: string;
  date_validite: string | null;
  lignes: MenuiserieLine[];
  total_cents: number;
  statut: string;
  devis_source: string | null;
  facture_lien: string | null;
  created_at: string;
  /** Suivi URSSAF : encaissement déclaré ? + mois de déclaration (AAAA-MM). */
  urssaf_declare?: boolean;
  urssaf_mois?: string | null;
};

export type MenuiserieClient = {
  id: string;
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  email: string | null;
  telephone: string | null;
};

const STATUTS: Record<string, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "border-zinc-500/60 text-zinc-400" },
  envoye: { label: "Envoyé", className: "border-cyan-500/60 text-cyan-400" },
  accepte: { label: "Accepté", className: "border-green-500/60 text-green-400" },
  refuse: { label: "Refusé", className: "border-red-500/60 text-red-400" },
  paye: { label: "Payé", className: "border-green-500/60 text-green-400" },
};
const STATUTS_DEVIS = ["brouillon", "envoye", "accepte", "refuse"];
const STATUTS_FACTURE = ["brouillon", "envoye", "paye"];

type LigneForm = { designation: string; quantite: string; prix: string };

function eurosToCents(v: string): number {
  const n = parseFloat(v.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function quantiteNombre(v: string): number {
  const n = parseFloat(v.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-accent";
const btnCls =
  "rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50";
const btnDangerCls =
  "rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50";

const MOIS_NOMS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
/** « 2026-09 » → « sept. 2026 ». */
function libelleMois(mois: string) {
  const [a, m] = mois.split("-");
  const nom = MOIS_NOMS[Number(m) - 1];
  return nom ? `${nom.slice(0, 4)}. ${a}` : mois;
}

export function MenuiserieAdmin({
  docsInitial,
  clientsInitial,
}: {
  docsInitial: MenuiserieDoc[];
  clientsInitial: MenuiserieClient[];
}) {
  const [onglet, setOnglet] = useState<"devis" | "factures" | "clients">("devis");
  const [docs, setDocs] = useState(docsInitial);
  const [clients, setClients] = useState(clientsInitial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [montreForm, setMontreForm] = useState(false);
  const [typeForm, setTypeForm] = useState<"devis" | "facture">("devis");
  const [clientId, setClientId] = useState("");
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [cp, setCp] = useState("");
  const [ville, setVille] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [dateEdition, setDateEdition] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateValidite, setDateValidite] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [lignes, setLignes] = useState<LigneForm[]>([
    { designation: "", quantite: "1", prix: "" },
  ]);

  // Formulaire d'ajout de client (onglet Clients).
  const [cNom, setCNom] = useState("");
  const [cAdresse, setCAdresse] = useState("");
  const [cCp, setCCp] = useState("");
  const [cVille, setCVille] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cTel, setCTel] = useState("");

  // Total en direct : quantité × prix unitaire, en centimes.
  const totalForm = useMemo(
    () =>
      lignes.reduce(
        (s, l) => s + Math.round(quantiteNombre(l.quantite) * eurosToCents(l.prix)),
        0,
      ),
    [lignes],
  );

  const devis = docs.filter((d) => d.type === "devis");
  const factures = docs.filter((d) => d.type === "facture");

  function majLigne(index: number, champ: keyof LigneForm, valeur: string) {
    setLignes((cur) => cur.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)));
  }

  function ajouterLigne() {
    setLignes((cur) => [...cur, { designation: "", quantite: "1", prix: "" }]);
  }

  function retirerLigne(index: number) {
    setLignes((cur) => (cur.length > 1 ? cur.filter((_, i) => i !== index) : cur));
  }

  function appliquerClient(id: string) {
    setClientId(id);
    const c = clients.find((cl) => cl.id === id);
    if (c) {
      setNom(c.nom);
      setAdresse(c.adresse);
      setCp(c.code_postal);
      setVille(c.ville);
      setEmail(c.email ?? "");
      setTel(c.telephone ?? "");
    } else {
      setNom("");
      setAdresse("");
      setCp("");
      setVille("");
      setEmail("");
      setTel("");
    }
  }

  async function api(url: string, init?: RequestInit) {
    const res = await fetch(url, init);
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json } as { ok: boolean; json: Record<string, unknown> };
  }

  function fermerFormulaire() {
    setMontreForm(false);
    setClientId("");
    setTypeForm("devis");
    setNom("");
    setAdresse("");
    setCp("");
    setVille("");
    setEmail("");
    setTel("");
    setDateEdition(new Date().toISOString().slice(0, 10));
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDateValidite(d.toISOString().slice(0, 10));
    setLignes([{ designation: "", quantite: "1", prix: "" }]);
  }

  async function creerDocument() {
    if (!nom.trim() || !adresse.trim() || !cp.trim() || !ville.trim()) {
      toast.error("Nom, adresse, code postal et ville du client sont obligatoires.");
      return;
    }
    const lignesValides = lignes
      .map((l) => ({
        designation: l.designation.trim(),
        quantite: quantiteNombre(l.quantite),
        prixUnitaireCents: eurosToCents(l.prix),
      }))
      .filter((l) => l.designation && l.quantite > 0 && l.prixUnitaireCents > 0);
    if (lignesValides.length === 0) {
      toast.error("Ajoute au moins une ligne avec une désignation, une quantité et un prix.");
      return;
    }
    setBusyId("form");
    const { ok, json } = await api("/api/admin/menuiserie/docs", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        type: typeForm,
        client_nom: nom,
        client_adresse: adresse,
        client_cp: cp,
        client_ville: ville,
        client_email: email,
        client_telephone: tel,
        date_edition: dateEdition,
        date_validite: typeForm === "devis" ? dateValidite : "",
        lignes: lignesValides,
      }),
    });
    setBusyId(null);
    if (!ok) {
      toast.error(String(json.error ?? "Échec de la création du document."));
      return;
    }
    const doc = json.doc as MenuiserieDoc;
    setDocs((cur) => [doc, ...cur]);
    toast.success(`${doc.type === "facture" ? "Facture" : "Devis"} ${doc.numero} créé`);
    fermerFormulaire();
    setOnglet(doc.type === "facture" ? "factures" : "devis");
  }

  async function changerStatut(doc: MenuiserieDoc, statut: string) {
    const autorises = doc.type === "devis" ? STATUTS_DEVIS : STATUTS_FACTURE;
    if (!autorises.includes(statut)) return;
    setBusyId(doc.id);
    const { ok, json } = await api("/api/admin/menuiserie/docs", {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ id: doc.id, statut }),
    });
    setBusyId(null);
    if (!ok) {
      toast.error(String(json.error ?? "Échec de la mise à jour du statut."));
      return;
    }
    setDocs((cur) => cur.map((d) => (d.id === doc.id ? { ...d, statut } : d)));
    toast.success(`${doc.numero} : ${STATUTS[statut]?.label ?? statut}`);
  }

  async function genererPdf(doc: MenuiserieDoc) {
    setBusyId(doc.id);
    const { ok, json } = await api("/api/admin/menuiserie/pdf", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ id: doc.id }),
    });
    setBusyId(null);
    if (!ok) {
      toast.error(String(json.error ?? "Échec de la génération du PDF."));
      return;
    }
    const url = json.url as string | null;
    if (url) window.open(url, "_blank");
    else toast.error("Lien de téléchargement indisponible.");
  }

  async function convertirEnFacture(doc: MenuiserieDoc) {
    if (!window.confirm(`Créer la facture à partir du devis ${doc.numero} ?`)) return;
    setBusyId(doc.id);
    const { ok, json } = await api("/api/admin/menuiserie/docs", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        type: "facture",
        client_nom: doc.client_nom,
        client_adresse: doc.client_adresse,
        client_cp: doc.client_cp,
        client_ville: doc.client_ville,
        client_email: doc.client_email ?? "",
        client_telephone: doc.client_telephone ?? "",
        lignes: doc.lignes,
        devis_source: doc.id,
      }),
    });
    setBusyId(null);
    if (!ok) {
      toast.error(String(json.error ?? "Échec de la conversion en facture."));
      return;
    }
    const facture = json.doc as MenuiserieDoc;
    setDocs((cur) => [
      facture,
      ...cur.map((d) => (d.id === doc.id ? { ...d, facture_lien: facture.id } : d)),
    ]);
    setOnglet("factures");
    toast.success(`Facture ${facture.numero} créée depuis le devis ${doc.numero}`);
  }

  async function supprimerDocument(doc: MenuiserieDoc) {
    if (!window.confirm(`Supprimer définitivement ${doc.numero} (${doc.client_nom}) ?`)) return;
    setBusyId(doc.id);
    const { ok, json } = await api(`/api/admin/menuiserie/docs?id=${doc.id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!ok) {
      toast.error(String(json.error ?? "Échec de la suppression."));
      return;
    }
    setDocs((cur) => cur.filter((d) => d.id !== doc.id));
    toast.success(`${doc.numero} supprimé`);
  }

  async function ajouterClient() {
    if (!cNom.trim() || !cAdresse.trim() || !cCp.trim() || !cVille.trim()) {
      toast.error("Nom, adresse, code postal et ville sont obligatoires.");
      return;
    }
    setBusyId("client");
    const { ok, json } = await api("/api/admin/menuiserie/clients", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        nom: cNom,
        adresse: cAdresse,
        code_postal: cCp,
        ville: cVille,
        email: cEmail,
        telephone: cTel,
      }),
    });
    setBusyId(null);
    if (!ok) {
      toast.error(String(json.error ?? "Échec de l'ajout du client."));
      return;
    }
    const client = json.client as MenuiserieClient;
    setClients((cur) => [...cur, client].sort((a, b) => a.nom.localeCompare(b.nom)));
    setCNom("");
    setCAdresse("");
    setCCp("");
    setCVille("");
    setCEmail("");
    setCTel("");
    toast.success(`Client ${client.nom} ajouté`);
  }

  async function supprimerClient(client: MenuiserieClient) {
    if (!window.confirm(`Supprimer le client ${client.nom} ?`)) return;
    setBusyId(client.id);
    const { ok, json } = await api(`/api/admin/menuiserie/clients?id=${client.id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!ok) {
      toast.error(String(json.error ?? "Échec de la suppression."));
      return;
    }
    setClients((cur) => cur.filter((c) => c.id !== client.id));
    toast.success(`Client ${client.nom} supprimé`);
  }

  /* SUITE-RENDU */

  // Bascule « déclaré URSSAF » sur une facture (le CA compte quand la
  // facture est payée) : pose ou retire la coche + le mois de déclaration.
  async function basculerUrssaf(doc: MenuiserieDoc) {
    const cible = !doc.urssaf_declare;
    let mois = doc.urssaf_mois ?? "";
    if (cible) {
      const now = new Date();
      const defaut = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const saisie = window.prompt(
        `Mois de déclaration URSSAF pour ${doc.numero} (AAAA-MM) :`,
        mois || defaut,
      );
      if (saisie === null) return;
      mois = saisie.trim();
      if (!/^\d{4}-\d{2}$/.test(mois)) {
        toast.error("Format attendu : AAAA-MM (ex. 2026-10).");
        return;
      }
    }
    setBusyId(doc.id);
    const { ok, json } = await api("/api/admin/menuiserie/docs", {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ id: doc.id, urssaf: cible, urssaf_mois: mois }),
    });
    setBusyId(null);
    if (!ok) {
      toast.error(String(json.error ?? "Échec de la mise à jour URSSAF."));
      return;
    }
    setDocs((cur) =>
      cur.map((d) =>
        d.id === doc.id ? { ...d, urssaf_declare: cible, urssaf_mois: cible ? mois : null } : d,
      ),
    );
    toast.success(
      cible
        ? `${doc.numero} marqué déclaré URSSAF (${libelleMois(mois)})`
        : `${doc.numero} retiré de la déclaration URSSAF`,
    );
  }

  const ongletLabel =
    onglet === "devis" ? "Devis" : onglet === "factures" ? "Factures" : "Clients";
  const nbOnglet =
    onglet === "devis" ? devis.length : onglet === "factures" ? factures.length : clients.length;

  return (
    <div className="space-y-6">
      {/* En-tête : onglets + bouton d'action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["devis", `Devis (${devis.length})`],
              ["factures", `Factures (${factures.length})`],
              ["clients", `Clients (${clients.length})`],
            ] as const
          ).map(([cle, label]) => (
            <button
              key={cle}
              type="button"
              onClick={() => setOnglet(cle)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                onglet === cle
                  ? "border-accent bg-accent text-white"
                  : "border-border text-muted-foreground hover:border-accent/50 hover:text-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {onglet !== "clients" ? (
          <button
            type="button"
            onClick={() => {
              setTypeForm(onglet === "factures" ? "facture" : "devis");
              setMontreForm(true);
            }}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            + Nouveau {onglet === "factures" ? "facture" : "devis"}
          </button>
        ) : null}
      </div>

      {/* Formulaire de création de document */}
      {montreForm ? (
        <section className="space-y-4 rounded-xl border border-accent/40 bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">
              Nouveau {typeForm === "facture" ? "facture" : "devis"}
            </h2>
            <button
              type="button"
              onClick={fermerFormulaire}
              className="text-xs text-muted-foreground transition-colors hover:text-accent"
            >
              ✕ Annuler
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Type</span>
              <select
                value={typeForm}
                onChange={(e) => setTypeForm(e.target.value as "devis" | "facture")}
                className={inputCls}
              >
                <option value="devis">Devis</option>
                <option value="facture">Facture</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Client enregistré (optionnel)
              </span>
              <select value={clientId} onChange={(e) => appliquerClient(e.target.value)} className={inputCls}>
                <option value="">— Saisie libre —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} — {c.ville}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputCls} placeholder="Nom du client *" value={nom} onChange={(e) => setNom(e.target.value)} />
            <input className={inputCls} placeholder="Adresse *" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
            <input className={inputCls} placeholder="Code postal *" value={cp} onChange={(e) => setCp(e.target.value)} />
            <input className={inputCls} placeholder="Ville *" value={ville} onChange={(e) => setVille(e.target.value)} />
            <input className={inputCls} type="email" placeholder="E-mail (pour l'envoi PDF)" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={inputCls} placeholder="Téléphone" value={tel} onChange={(e) => setTel(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Date d&apos;édition</span>
              <input type="date" className={inputCls} value={dateEdition} onChange={(e) => setDateEdition(e.target.value)} />
            </label>
            {typeForm === "devis" ? (
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Valable jusqu&apos;au</span>
                <input type="date" className={inputCls} value={dateValidite} onChange={(e) => setDateValidite(e.target.value)} />
              </label>
            ) : null}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Lignes du document</span>
            {lignes.map((l, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  className={`${inputCls} min-w-48 flex-1`}
                  placeholder="Désignation (ex. Bibliothèque sur mesure)"
                  value={l.designation}
                  onChange={(e) => majLigne(i, "designation", e.target.value)}
                />
                <input
                  className={`${inputCls} w-20`}
                  placeholder="Qté"
                  value={l.quantite}
                  onChange={(e) => majLigne(i, "quantite", e.target.value)}
                />
                <input
                  className={`${inputCls} w-28`}
                  placeholder="Prix unitaire €"
                  value={l.prix}
                  onChange={(e) => majLigne(i, "prix", e.target.value)}
                />
                <span className="w-24 text-right text-sm font-medium">
                  {formatEuros(Math.round(quantiteNombre(l.quantite) * eurosToCents(l.prix)))}
                </span>
                <button
                  type="button"
                  onClick={() => retirerLigne(i)}
                  disabled={lignes.length === 1}
                  className="shrink-0 rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                  title="Retirer cette ligne"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={ajouterLigne} className={btnCls}>
              + Ajouter une ligne
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm">
              Total : <span className="text-lg font-semibold text-accent">{formatEuros(totalForm)}</span>
            </p>
            <button
              type="button"
              onClick={creerDocument}
              disabled={busyId === "form"}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busyId === "form" ? "Création…" : `Créer le ${typeForm === "facture" ? "facture" : "devis"}`}
            </button>
          </div>
        </section>
      ) : null}

      {/* URSSAF — ce que je déclare : factures payées, groupées par mois de déclaration */}
      {onglet === "factures" ? (
        (() => {
          const payees = factures.filter((f) => f.statut === "paye");
          const aDecl = payees.filter((f) => !f.urssaf_declare);
          const parMois = new Map<string, MenuiserieDoc[]>();
          for (const f of payees) {
            if (!f.urssaf_declare) continue;
            const cle = f.urssaf_mois ?? "(sans mois)";
            const liste = parMois.get(cle) ?? [];
            liste.push(f);
            parMois.set(cle, liste);
          }
          const moisTries = [...parMois.keys()].sort((a, b) => b.localeCompare(a));
          return (
            <section className="space-y-4 rounded-xl border border-accent/40 bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-medium">URSSAF — ce que je déclare</h2>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-orange-500/60 bg-orange-500/10 px-3 py-1 text-orange-300">
                    À déclarer : {aDecl.length} ({formatEuros(aDecl.reduce((s, f) => s + f.total_cents, 0))})
                  </span>
                  {moisTries.map((mois) => {
                    const liste = parMois.get(mois) ?? [];
                    return (
                      <span key={mois} className="rounded-full border border-green-500/60 bg-green-500/10 px-3 py-1 text-green-400">
                        {mois === "(sans mois)" ? mois : libelleMois(mois)} : {liste.length} ({formatEuros(liste.reduce((s, f) => s + f.total_cents, 0))})
                      </span>
                    );
                  })}
                </div>
              </div>
              {payees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune facture payée pour le moment : les montants apparaîtront ici quand une facture sera marquée « Payé ».
                </p>
              ) : (
                <div className="space-y-3">
                  {aDecl.length > 0 ? (
                    <div className="rounded-lg border border-orange-500/40 bg-orange-500/5 p-3">
                      <p className="text-xs font-medium text-orange-300">
                        Encaissements à déclarer ({aDecl.length})
                      </p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {aDecl.map((f) => (
                          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              {f.numero} — {f.client_nom}
                            </span>
                            <span className="flex items-center gap-3">
                              <span className="font-medium">{formatEuros(f.total_cents)}</span>
                              <button type="button" onClick={() => basculerUrssaf(f)} disabled={busyId === f.id} className={btnCls}>
                                Déclarer
                              </button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-green-400">
                      Tout est déclaré, rien à rattraper.
                    </p>
                  )}
                  {moisTries.map((mois) => {
                    const liste = parMois.get(mois) ?? [];
                    return (
                      <div key={mois} className="rounded-lg border border-border p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          {mois === "(sans mois)" ? "Sans mois" : libelleMois(mois)} — déclaré ({liste.length})
                        </p>
                        <ul className="mt-2 space-y-1 text-sm">
                          {liste.map((f) => (
                            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2">
                              <span>
                                {f.numero} — {f.client_nom}
                              </span>
                              <span className="flex items-center gap-3">
                                <span className="font-medium">{formatEuros(f.total_cents)}</span>
                                <button type="button" onClick={() => basculerUrssaf(f)} disabled={busyId === f.id} className={btnCls}>
                                  Annuler
                                </button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })()
      ) : null}

      {/* Liste des devis / factures */}
      {onglet !== "clients" ? (
        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-border p-5">
            <h2 className="font-medium">
              {ongletLabel} ({nbOnglet})
            </h2>
          </div>
          {(onglet === "devis" ? devis : factures).length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              Aucun {onglet === "devis" ? "devis" : "facture"} pour le moment. Clique sur «&nbsp;+&nbsp;Nouveau&nbsp;» pour créer le premier.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(onglet === "devis" ? devis : factures).map((doc) => {
                const statut = STATUTS[doc.statut] ?? STATUTS.brouillon;
                const estDevis = doc.type === "devis";
                return (
                  <li key={doc.id} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{doc.numero}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-xs ${statut.className}`}>
                            {statut.label}
                          </span>
                          {estDevis && doc.facture_lien ? (
                            <span className="rounded-full border border-green-500/60 px-2 py-0.5 text-xs text-green-400">
                              ✓ facturée
                            </span>
                          ) : null}
                          {!estDevis && doc.devis_source ? (
                            <span className="text-xs text-muted-foreground">
                              depuis le devis
                            </span>
                          ) : null}
                          {!estDevis && doc.urssaf_declare ? (
                            <span className="rounded-full border border-green-500/60 bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                              ✓ URSSAF{doc.urssaf_mois ? ` · ${libelleMois(doc.urssaf_mois)}` : ""}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {doc.client_nom} · {doc.client_cp} {doc.client_ville}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.lignes.length} ligne(s)
                          {doc.date_edition
                            ? ` · édité le ${new Date(`${doc.date_edition}T12:00:00`).toLocaleDateString("fr-FR")}`
                            : ""}
                          {estDevis && doc.date_validite
                            ? ` · valable jusqu'au ${new Date(`${doc.date_validite}T12:00:00`).toLocaleDateString("fr-FR")}`
                            : ""}
                        </p>
                      </div>
                      <p className="text-lg font-semibold">{formatEuros(doc.total_cents)}</p>
                    </div>

                    {/* Détail des lignes */}
                    <ul className="space-y-1 rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                      {doc.lignes.map((l, i) => (
                        <li key={i} className="flex justify-between gap-3">
                          <span className="min-w-0 truncate">
                            {l.quantite.toString().replace(".", ",")} × {l.designation}
                          </span>
                          <span className="shrink-0">
                            {formatEuros(Math.round(l.quantite * l.prixUnitaireCents))}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Actions du document */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => genererPdf(doc)} disabled={busyId === doc.id} className={btnCls}>
                        {busyId === doc.id ? "…" : "Générer le PDF"}
                      </button>
                      {estDevis ? (
                        <>
                          <button type="button" onClick={() => changerStatut(doc, "accepte")} disabled={busyId === doc.id || doc.statut === "accepte"} className={btnCls}>
                            Accepté
                          </button>
                          <button type="button" onClick={() => changerStatut(doc, "refuse")} disabled={busyId === doc.id || doc.statut === "refuse"} className={btnCls}>
                            Refusé
                          </button>
                          {!doc.facture_lien ? (
                            <button type="button" onClick={() => convertirEnFacture(doc)} disabled={busyId === doc.id} className={btnCls}>
                              Convertir en facture
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => changerStatut(doc, "paye")} disabled={busyId === doc.id || doc.statut === "paye"} className={btnCls}>
                            Payé
                          </button>
                          <button
                            type="button"
                            onClick={() => basculerUrssaf(doc)}
                            disabled={busyId === doc.id}
                            className={
                              doc.urssaf_declare
                                ? "rounded-lg border border-green-500/60 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-50"
                                : btnCls
                            }
                            title={doc.urssaf_declare ? "Cliquer pour retirer de la déclaration" : "Marquer cet encaissement comme déclaré à l'URSSAF"}
                          >
                            {doc.urssaf_declare
                              ? `✓ Déclaré${doc.urssaf_mois ? ` · ${libelleMois(doc.urssaf_mois)}` : ""}`
                              : "URSSAF : à déclarer"}
                          </button>
                        </>
                      )}
                      <button type="button" onClick={() => supprimerDocument(doc)} disabled={busyId === doc.id} className={btnDangerCls}>
                        Supprimer
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {/* Onglet Clients : ajout + liste */}
      {onglet === "clients" ? (
        <div className="space-y-4">
          <section className="space-y-3 rounded-xl border border-border bg-card p-5">
            <h2 className="font-medium">Ajouter un client</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={inputCls} placeholder="Nom *" value={cNom} onChange={(e) => setCNom(e.target.value)} />
              <input className={inputCls} placeholder="Adresse *" value={cAdresse} onChange={(e) => setCAdresse(e.target.value)} />
              <input className={inputCls} placeholder="Code postal *" value={cCp} onChange={(e) => setCCp(e.target.value)} />
              <input className={inputCls} placeholder="Ville *" value={cVille} onChange={(e) => setCVille(e.target.value)} />
              <input className={inputCls} type="email" placeholder="E-mail" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
              <input className={inputCls} placeholder="Téléphone" value={cTel} onChange={(e) => setCTel(e.target.value)} />
            </div>
            <button
              type="button"
              onClick={ajouterClient}
              disabled={busyId === "client"}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busyId === "client" ? "Ajout…" : "+ Ajouter ce client"}
            </button>
          </section>

          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-5">
              <h2 className="font-medium">Clients ({clients.length})</h2>
            </div>
            {clients.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                Aucun client enregistré pour le moment.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {clients.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <p className="font-medium">{c.nom}</p>
                      <p className="text-sm text-muted-foreground">
                        {c.adresse} · {c.code_postal} {c.ville}
                      </p>
                      {c.email || c.telephone ? (
                        <p className="text-xs text-muted-foreground">
                          {[c.email, c.telephone].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <button type="button" onClick={() => supprimerClient(c)} disabled={busyId === c.id} className={btnDangerCls}>
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

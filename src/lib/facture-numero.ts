// Numérotation des factures — F-2026-001, F-2026-002… — partagée par les
// factures libres, les factures générées depuis un devis ET les factures
// menuiserie (FAC-2026-…, même séquence : une facture DJ et une facture
// menuiserie ne peuvent plus porter le même numéro).
//
// On part du plus grand numéro RÉELLEMENT utilisé et on ajoute 1. Un simple
// COMPTAGE repart en arrière dès qu'une facture est supprimée : le numéro
// libéré était alors réattribué et entrait en collision avec une facture
// existante (cas réel : F-2026-004 attribué à la fois à « Chope et Compagnie »
// et à « Serson production » après une suppression). Les trous de séquence
// restent des trous : un numéro émis n'est jamais recyclé.
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Prochain numéro de la séquence commune à TOUTES les factures de l'année
// (DJ + menuiserie) : plus grand numéro réellement utilisé + 1.
export async function nextInvoiceSequence(
  supabase: AdminClient,
  year: number
): Promise<number> {
  const used = new Set<number>();

  // Factures DJ libres archivées dans le storage : F-2026-001_Nom.pdf
  const { data: stored } = await supabase.storage
    .from("client-files")
    .list("admin/factures-libres", { limit: 1000 });
  for (const file of stored ?? []) {
    const match = new RegExp(`^F-${year}-(\\d{3})_`).exec(file.name);
    if (match) used.add(Number(match[1]));
  }

  // Factures DJ rattachées à un devis : « Facture F-2026-001.pdf »
  const { data: rows } = await supabase
    .from("quote_files")
    .select("name")
    .like("name", `Facture F-${year}-%.pdf`);
  for (const row of rows ?? []) {
    const match = /^Facture F-\d{4}-(\d{3})\.pdf$/.exec(row.name ?? "");
    if (match) used.add(Number(match[1]));
  }

  // Factures menuiserie : FAC-2026-001 (même séquence que les factures DJ)
  const { data: docs } = await supabase
    .from("menuiserie_docs")
    .select("numero")
    .like("numero", `FAC-${year}-%`);
  for (const doc of docs ?? []) {
    const match = new RegExp(`^FAC-${year}-(\\d+)$`).exec(String(doc.numero ?? ""));
    if (match) used.add(Number(match[1]));
  }

  return used.size > 0 ? Math.max(...used) + 1 : 1;
}

// Devis menuiserie — DEV-2026-001, DEV-2026-002… — série propre à la
// menuiserie (les factures FAC- partagent la séquence des factures DJ), mais
// avec le même principe « un numéro émis n'est jamais recyclé » : plus grand
// numéro réellement utilisé + 1, pour ne jamais réattribuer le numéro d'un
// devis supprimé.
export async function nextMenuiserieDevisNumber(
  supabase: AdminClient,
  year: number
): Promise<string> {
  const { data: docs } = await supabase
    .from("menuiserie_docs")
    .select("numero")
    .like("numero", `DEV-${year}-%`);
  let max = 0;
  for (const doc of docs ?? []) {
    const match = new RegExp(`^DEV-${year}-(\\d+)$`).exec(String(doc.numero ?? ""));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `DEV-${year}-${String(max + 1).padStart(3, "0")}`;
}

export async function nextInvoiceNumber(
  supabase: AdminClient,
  year: number
): Promise<string> {
  const sequence = await nextInvoiceSequence(supabase, year);
  return `F-${year}-${String(sequence).padStart(3, "0")}`;
}

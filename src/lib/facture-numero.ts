// Numérotation des factures DJ — F-2026-001, F-2026-002… — partagée par les
// factures libres et les factures générées depuis un devis.
//
// On part du plus grand numéro RÉELLEMENT utilisé (fichiers archivés dans le
// storage « admin/factures-libres » + factures rattachées aux devis) et on
// ajoute 1. Un simple COMPTAGE repart en arrière dès qu'une facture est
// supprimée : le numéro libéré était alors réattribué et entrait en
// collision avec une facture existante (cas réel : F-2026-004 attribué à
// la fois à « Chope et Compagnie » et à « Serson production » après une
// suppression). Les trous de séquence restent des trous : un numéro
// émis n'est jamais recyclé.
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function nextInvoiceNumber(
  supabase: AdminClient,
  year: number
): Promise<string> {
  const used = new Set<number>();

  const { data: stored } = await supabase.storage
    .from("client-files")
    .list("admin/factures-libres", { limit: 1000 });
  for (const file of stored ?? []) {
    const match = new RegExp(`^F-${year}-(\\d{3})_`).exec(file.name);
    if (match) used.add(Number(match[1]));
  }

  const { data: rows } = await supabase
    .from("quote_files")
    .select("name")
    .like("name", `Facture F-${year}-%.pdf`);
  for (const row of rows ?? []) {
    const match = /^Facture F-\d{4}-(\d{3})\.pdf$/.exec(row.name ?? "");
    if (match) used.add(Number(match[1]));
  }

  const sequence = used.size > 0 ? Math.max(...used) + 1 : 1;
  return `F-${year}-${String(sequence).padStart(3, "0")}`;
}

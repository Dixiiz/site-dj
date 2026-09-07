import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin-auth";
import { ImportQuoteForm } from "@/components/import-quote-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Soirées d'avant le site : devis papier signés, ajoutés à la main pour
// alimenter le CA (dashboard) et la historique. Marqués [[import-avant-site]].
export default async function AdminImportPage() {
  if (!(await isAdmin())) {
    return <p className="p-8 text-sm text-muted-foreground">Accès refusé.</p>;
  }

  const supabase = createAdminClient();
  const { data: imported } = await supabase
    .from("quotes")
    .select("id, customer_name, formula_name, total_cents, event_date, event_location")
    .eq("status", "confirme")
    .like("notes", "%[[import-avant-site]]%")
    .order("event_date", { ascending: false });

  const total = (imported ?? []).reduce(
    (sum, q) => sum + (Number(q.total_cents) || 0),
    0
  );

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8">
      <p className="text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          ← Retour au tableau de bord
        </Link>
      </p>

      <div>
        <h1 className="text-2xl font-semibold">Soirées d&apos;avant le site 📚</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajoute ici tes anciens devis papier signés : ils rejoignent ton CA,
          ton historique et le planning, au même titre que les devis du site.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-medium">Ajouter une soirée</h2>
        <ImportQuoteForm />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">
          Déjà importées{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({(imported ?? []).length} soirée(s) · {formatCA(total)})
          </span>
        </h2>
        {(imported ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune soirée importée pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {imported!.map((quote) => (
              <li key={quote.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{quote.customer_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {quote.formula_name}
                    {quote.event_location ? ` · ${quote.event_location}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium">
                    {quote.event_date
                      ? new Date(`${quote.event_date}T12:00:00`).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCA(Number(quote.total_cents) || 0)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function formatCA(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}
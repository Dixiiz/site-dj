import { QuoteStatusSelect } from "@/components/quote-status-select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEuros } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SelectedOption } from "@/lib/types";

export default async function DevisPage() {
  const supabase = createAdminClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium">Devis reçus</h1>
        <p className="text-sm text-muted-foreground">
          Chaque demande client apparaît ici avec le total et les options choisies.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Formule</TableHead>
            <TableHead>Options</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(quotes ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                Aucun devis pour le moment.
              </TableCell>
            </TableRow>
          ) : (
            (quotes ?? []).map((quote) => {
              const options = (quote.selected_options ?? []) as SelectedOption[];
              return (
                <TableRow key={quote.id}>
                  <TableCell>
                    {new Date(quote.created_at).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{quote.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{quote.customer_email}</div>
                    {quote.customer_phone ? (
                      <div className="text-xs text-muted-foreground">{quote.customer_phone}</div>
                    ) : null}
                    {quote.event_location ? (
                      <div className="text-xs text-muted-foreground">{quote.event_location}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>{quote.formula_name}</TableCell>
                  <TableCell className="max-w-48 whitespace-normal">
                    {options.length === 0
                      ? "—"
                      : options.map((option) => option.name).join(", ")}
                  </TableCell>
                  <TableCell>{formatEuros(quote.total_cents)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{quote.status}</Badge>
                      <QuoteStatusSelect id={quote.id} status={quote.status} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

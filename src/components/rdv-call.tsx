import { createAdminClient } from "@/lib/supabase/admin";
import { adminRdvDecision } from "@/app/client-actions";
import { RdvAvailabilityForm } from "@/components/rdv-form";
import { SubmitButton } from "@/components/submit-button";

type RdvRow = {
  id: string;
  proposed_at: string | null;
  availability: string | null;
  status: string;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });

// Côté CLIENT : envoie ses disponibilités, voit le RDV validé + calendrier.
export function RdvCallSection({
  quoteId,
  requests,
}: {
  quoteId: string;
  requests: RdvRow[];
}) {
  const validated = requests.find((r) => r.status === "valide" && r.proposed_at);
  const pending = requests.filter((r) => r.status === "propose");

  return (
    <div id="rdv" className="rounded-xl border border-border bg-muted/50 p-5">
      <h2 className="font-medium">Prévoir un point téléphonique</h2>
      {validated ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-medium text-green-400">
            ✓ RDV confirmé : {fmt(validated.proposed_at!)}
          </p>
          <p className="text-muted-foreground">
            Maxime t&apos;appelle à ce moment-là. Prépare tes questions !
          </p>
          <a
            href={`/api/calendar/rdv/${quoteId}`}
            className="inline-block rounded-lg border border-accent/50 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
          >
            Ajouter à mon calendrier
          </a>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Indique tes disponibilités dans la semaine : Maxime confirme un
            créneau et t&apos;appelle pour faire le point sur ta soirée.
          </p>
          <RdvAvailabilityForm quoteId={quoteId} />
          {pending.length > 0 ? (
            <div className="mt-3 space-y-1 text-sm text-orange-300">
              {pending.map((r) => (
                <p key={r.id}>En attente de confirmation : {r.availability ?? fmt(r.proposed_at!)}</p>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

// Côté ADMIN : disponibilités proposées, avec choix de la date exacte.
export async function AdminRdvRequests({ quoteId }: { quoteId: string }) {
  const supabase = createAdminClient();
  const { data: requests } = await supabase
    .from("rdv_requests")
    .select("id, proposed_at, availability, status")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: true });

  const rows = (requests ?? []) as RdvRow[];
  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="font-medium text-accent">RDV téléphonique</h3>
      <ul className="mt-3 space-y-4">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
            <p className="font-medium">{r.availability ?? fmt(r.proposed_at!)}</p>
            {r.status === "valide" ? (
              <p className="mt-1 text-xs font-medium text-green-400">
                ✓ Confirmé — {fmt(r.proposed_at!)}
              </p>
            ) : r.status === "refuse" ? (
              <p className="mt-1 text-xs text-zinc-400">Refusé</p>
            ) : (
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await adminRdvDecision(formData);
                }}
                className="mt-2 flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="rdv_id" value={r.id} />
                <input type="hidden" name="decision" value="valide" />
                <input
                  type="datetime-local"
                  name="rdv_datetime"
                  required
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-accent"
                />
                <SubmitButton
                  pendingLabel="…"
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500"
                >
                  ✓ Confirmer ce créneau
                </SubmitButton>
                <SubmitButton
                  pendingLabel="…"
                  className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Refuser
                </SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

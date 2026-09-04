import { proposeRdvCall, adminRdvDecision } from "@/app/client-actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubmitButton } from "@/components/submit-button";

type RdvRow = {
  id: string;
  proposed_at: string;
  status: string;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });

// Côté CLIENT : propose des créneaux, voit le RDV validé + ajout calendrier.
export function RdvCallSection({
  quoteId,
  requests,
}: {
  quoteId: string;
  requests: RdvRow[];
}) {
  const validated = requests.find((r) => r.status === "valide");
  const pending = requests.filter((r) => r.status === "propose");
  const refused = requests.filter((r) => r.status === "refuse");

  return (
    <div id="rdv" className="rounded-xl border border-border bg-muted/50 p-5">
      <h2 className="font-medium">Prévoir un point téléphonique</h2>
      {validated ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-medium text-green-400">
            ✓ RDV confirmé : {fmt(validated.proposed_at)}
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
            Propose jusqu&apos;à 3 créneaux qui t&apos;arrangent : Maxime en
            confirme un et te rappelle pour faire le point sur ta soirée.
          </p>
          <form
            action={async (formData: FormData) => {
 "use server";
              await proposeRdvCall(formData);
            }}
            className="mt-3 space-y-2"
          >
            <input type="hidden" name="quote_id" value={quoteId} />
            {[1, 2, 3].map((i) => (
              <input
                key={i}
                type="datetime-local"
                name={`slot${i}`}
                required={i === 1}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            ))}
            <SubmitButton
              pendingLabel="Envoi…"
              className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              Proposer ces créneaux
            </SubmitButton>
          </form>
          {pending.length > 0 ? (
            <p className="mt-3 text-sm text-orange-300">
              ⏳ Créneaux proposés : {pending.map((r) => fmt(r.proposed_at)).join(" · ")} — en attente de confirmation
            </p>
          ) : null}
          {refused.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Créneaux non retenus : {refused.map((r) => fmt(r.proposed_at)).join(" · ")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

// Côté ADMIN : liste des créneaux proposés avec validation.
export async function AdminRdvRequests({ quoteId }: { quoteId: string }) {
  const supabase = createAdminClient();
  const { data: requests } = await supabase
    .from("rdv_requests")
    .select("id, proposed_at, status")
    .eq("quote_id", quoteId)
    .order("proposed_at", { ascending: true });

  const rows = (requests ?? []) as RdvRow[];
  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="font-medium text-accent">RDV téléphonique</h3>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="flex-1">{fmt(r.proposed_at)}</span>
            {r.status === "valide" ? (
              <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
                ✓ Validé
              </span>
            ) : r.status === "refuse" ? (
              <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs text-zinc-400">
                Refusé
              </span>
            ) : (
              <>
                <form action={async (formData: FormData) => { "use server"; await adminRdvDecision(formData); }}>
                  <input type="hidden" name="rdv_id" value={r.id} />
                  <input type="hidden" name="decision" value="valide" />
                  <SubmitButton
                    pendingLabel="…"
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500"
                  >
                    ✓ Valider
                  </SubmitButton>
                </form>
                <form action={async (formData: FormData) => { "use server"; await adminRdvDecision(formData); }}>
                  <input type="hidden" name="rdv_id" value={r.id} />
                  <input type="hidden" name="decision" value="refuse" />
                  <SubmitButton
                    pendingLabel="…"
                    className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    ✕ Refuser
                  </SubmitButton>
                </form>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

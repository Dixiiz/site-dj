import { createAdminClient } from "@/lib/supabase/admin";
import { AdminPlanningCalendar } from "@/components/admin-planning-calendar";

export const dynamic = "force-dynamic";

export const metadata = { title: "Planning — Admin" };

export default async function AdminPlanningPage() {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: blocked }, { data: booked }] = await Promise.all([
    supabase.from("blocked_dates").select("date").gte("date", today),
    supabase
      .from("quotes")
      .select("event_date")
      .eq("status", "confirme")
      .gte("event_date", today),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-medium tracking-tight">Planning</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Les dates confirmées (rouge) sont automatiquement bloquées pour les
        clients. Bloquez manuellement les dates que vous ne voulez pas proposer.
      </p>
      <div className="mt-6">
        <AdminPlanningCalendar
          blockedDates={(blocked ?? []).map((r) => String(r.date))}
          bookedDates={(booked ?? [])
            .map((r) => String(r.event_date))
            .filter(Boolean)}
        />
      </div>
    </div>
  );
}

import { QuoteBookingForm } from "@/components/quote-booking-form";
import { SiteHeader } from "@/components/site-header";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { Formula, QuoteOption, Slot } from "@/lib/types";

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-xl px-4 py-16">
          <h1 className="text-2xl font-medium">Encore une étape : relier Supabase</h1>
          <p className="mt-3 text-muted-foreground">
            Le site est prêt, mais les clés de ta base ne sont pas encore dans le fichier{" "}
            <code>.env.local</code>.
          </p>
        </main>
      </>
    );
  }

  const supabase = createAdminClient();
  const [{ data: formulas }, { data: options }, { data: slots }] = await Promise.all([
    supabase.from("formulas").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("options").select("*").eq("is_active", true).order("sort_order"),
    supabase
      .from("slots")
      .select("*")
      .eq("is_open", true)
      .gte("slot_date", new Date().toISOString().slice(0, 10))
      .order("slot_date")
      .order("start_time"),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <p className="text-sm tracking-[0.2em] text-primary uppercase">Réservation</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-medium tracking-tight sm:text-4xl">
          Configure ton devis DJ et réserve un créneau.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Choisis une formule, ajoute des options, puis bloque une date disponible. Tout est
          enregistré automatiquement.
        </p>
        <div className="mt-10">
          <QuoteBookingForm
            formulas={(formulas ?? []) as Formula[]}
            options={(options ?? []) as QuoteOption[]}
            slots={(slots ?? []) as Slot[]}
          />
        </div>
      </main>
    </>
  );
}

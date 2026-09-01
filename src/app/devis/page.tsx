import { FadeIn } from "@/components/fade-in";
import { QuoteBookingForm } from "@/components/quote-booking-form";
import { SiteHeader } from "@/components/site-header";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { Formula, QuoteOption, Slot } from "@/lib/types";

export const metadata = {
  title: "Devis & réservation — Propul'Sound DJ",
  description: "Configurez votre devis et réservez votre date en ligne.",
};

export default async function DevisPage() {
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
      <main className="relative mx-auto w-full max-w-5xl px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-0 -z-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-40 -left-20 -z-10 h-64 w-64 rounded-full bg-primary/25 blur-3xl"
        />
        <FadeIn>
          <p className="text-sm tracking-[0.2em] text-accent uppercase">Réservation</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-medium tracking-tight text-glow sm:text-4xl">
            Configurez votre devis et réservez votre date !
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Choisissez le type d&apos;événement, les options, la date, vos coordonnées, et envoyez !
          </p>
        </FadeIn>
        <FadeIn delay={0.15} className="mt-10">
          <QuoteBookingForm
            formulas={(formulas ?? []) as Formula[]}
            options={(options ?? []) as QuoteOption[]}
            slots={(slots ?? []) as Slot[]}
          />
        </FadeIn>
      </main>
    </>
  );
}

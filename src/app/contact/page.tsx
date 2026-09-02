import { FadeIn } from "@/components/fade-in";
import { CustomRequestForm } from "@/components/custom-request-form";
import { SiteHeader } from "@/components/site-header";
import Link from "next/link";

export const metadata = {
  title: "Contact — Propul'Sound DJ",
  description:
    "Une question sur nos prestations DJ, les déplacements ou la disponibilité ? Contactez Propul'Sound DJ à proximité de Blois.",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-3xl px-4 py-10">
        <FadeIn>
          <h1 className="text-3xl font-medium tracking-tight">Contact</h1>
          <p className="mt-3 text-muted-foreground">
            Une question avant de réserver ? Écrivez-nous : nous répondons
            rapidement, généralement sous 24 h.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <a
              href="https://www.tiktok.com/@propulsound.dj"
              target="_blank"
              rel="noopener noreferrer"
              className="glow-hover rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-accent/50"
            >
              <p className="font-medium">🎵 TikTok</p>
              <p className="mt-1 text-sm text-muted-foreground">
                @propulsound.dj — nos soirées en vidéo
              </p>
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Propul%27Sound%20DJ%20Huisseau-sur-Cosson"
              target="_blank"
              rel="noopener noreferrer"
              className="glow-hover rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-accent/50"
            >
              <p className="font-medium">⭐ Google</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Nos avis et notre fiche d&apos;établissement
              </p>
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h2 className="mt-12 mb-4 text-xl font-medium">
            Ou envoyez-nous un message
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Pour une demande de devis complète avec pack et horaires,
            utilisez la <Link href="/formules" className="text-accent underline underline-offset-4">page Formules</Link> —
            vous aurez le tarif en direct. Ici, c&apos;est pour tout le reste.
          </p>
          <CustomRequestForm />
        </FadeIn>
      </main>
    </>
  );
}
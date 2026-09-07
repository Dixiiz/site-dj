import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";
import {
  DemoVideo,
  DemoVideoSignature,
  DemoVideoPrepa,
} from "@/components/demo-video";

export const metadata: Metadata = {
  title: "Comment ça se passe — Propul'Sound DJ",
  description:
    "De la demande de devis à la piste de danse : découvrez comment vous organisez votre soirée en ligne, étape par étape, avec votre espace client Propul'Sound DJ.",
};

const acts = [
  {
    emoji: "🎬",
    badge: "Acte 1",
    title: "Le devis express",
    hook: "Moins de temps que de choisir la playlist du trajet.",
    video: "devis",
    highlights: [
      "Prix calculé en direct, zéro surprise",
      "Frais de déplacement automatiques",
      "Réponse sous 24 à 48 h",
    ],
  },
  {
    emoji: "✍️",
    badge: "Acte 2",
    title: "Signe & verrouille",
    hook: "Bye le rendez-vous administratif, bonjour le doigt magique.",
    video: "signature",
    highlights: [
      "Devis + contrat signés au doigt",
      "Acompte par carte ou virement",
      "Date verrouillée dès réception",
    ],
  },
  {
    emoji: "🎧",
    badge: "Acte 3",
    title: "Ta soirée se prépare",
    hook: "Ici, c'est ton terrain de jeu jusqu'au jour J.",
    video: "prepa",
    highlights: [
      "Ta playlist, tes temps forts (et ceux à éviter 😄)",
      "La timeline minute par minute",
      "Une question ? La messagerie est là",
    ],
  },
] as const;
/* SUITE-COMPONENT */

export default function CommentCaSePassePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16">
        <FadeIn>
          <p className="text-sm tracking-[0.2em] text-accent uppercase">Votre espace client</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            Comment ça se passe ? <span className="whitespace-nowrap">🍿</span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Réserver un DJ ne devrait pas être une course aux messages perdus.
            Installe-toi, clique sur play : en 2 minutes, tu sauras tout.
          </p>
        </FadeIn>

        <div className="mt-10 space-y-14">
          {acts.map((act, i) => (
            <FadeIn key={act.title} delay={0.05 * i}>
              <section>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-2xl">
                    {act.emoji}
                  </span>
                  <div>
                    <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">
                      {act.badge}
                    </p>
                    <h2 className="text-2xl font-medium tracking-tight">{act.title}</h2>
                  </div>
                </div>
                <p className="mt-2 text-sm italic text-muted-foreground">{act.hook}</p>
                <div className="mt-4">
                  {act.video === "devis" ? (
                    <DemoVideo />
                  ) : act.video === "signature" ? (
                    <DemoVideoSignature />
                  ) : (
                    <DemoVideoPrepa />
                  )}
                </div>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {act.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      ✓ {highlight}
                    </li>
                  ))}
                </ul>
              </section>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.2}>
          <div className="mt-14 rounded-xl border border-accent/40 bg-accent/5 p-6 text-center">
            <h2 className="text-xl font-medium">Ça te plaît ? À toi de jouer 🎵</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Ton devis t&apos;attend — et ton espace client aussi.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/formules"
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Créer mon devis
              </Link>
              <Link
                href="/faq"
                className="rounded-lg border border-border px-5 py-2.5 text-sm text-foreground transition-colors hover:border-accent/50 hover:text-accent"
              >
                Questions fréquentes
              </Link>
            </div>
          </div>
        </FadeIn>
      </main>
    </>
  );
}

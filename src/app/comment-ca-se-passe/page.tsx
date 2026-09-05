import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Comment ça se passe — Propul'Sound DJ",
  description:
    "De la demande de devis à la piste de danse : découvrez comment vous organisez votre soirée en ligne, étape par étape, avec votre espace client Propul'Sound DJ.",
};

const steps = [
  {
    emoji: "🧾",
    title: "Votre devis en 2 minutes",
    text: "Choisissez votre pack, vos options (fumée, CO2, cérémonie…), votre date et vos horaires : le prix se calcule en direct, sans surprise et sans attente.",
    detail: "Vous recevez une réponse sous 24 à 48 h.",
    image: "/images/screenshotclient/ma-soiree.png",
    alt: "Récapitulatif du devis dans l'espace client : pack, options et total",
  },
  {
    emoji: "✍️",
    title: "Signature en ligne",
    text: "Devis et contrat arrivent directement dans votre espace client. Vous les lisez, vous les signez au doigt sur votre téléphone : plus besoin de rendez-vous ni de papier.",
    detail: "Votre signature confirme automatiquement le devis.",
    image: "/images/screenshotclient/documents.png",
    alt: "Documents à signer en ligne : contrat et devis avec signature au doigt",
  },
  {
    emoji: "💳",
    title: "Acompte sécurisé",
    text: "Réglez l'acompte de réservation (20 %) par carte bancaire ou par virement, comme vous préférez. Dès réception, votre date est verrouillée définitivement.",
    detail: "Paiement 100 % sécurisé, confirmation immédiate.",
  },
  {
    emoji: "🎵",
    title: "Préparez la musique",
    text: "Votre playlist se construit à votre rythme : les temps forts (entrée des mariés, ouverture du bal…), vos titres incontournables et même ceux à éviter absolument.",
    detail: "Vous pouvez y revenir quand vous voulez, jusqu'à la soirée.",
    image: "/images/screenshotclient/musiques.png",
    alt: "Gestion des musiques : piste de danse, temps forts et titres à ne pas passer",
  },
  {
    emoji: "🕒",
    title: "La timeline de votre soirée",
    text: "Repas, discours, gâteau, ouverture du bal… Vous déroulez votre soirée minute par minute dans un panneau dédié, et l'animation s'adapte à chaque instant.",
    detail: "Votre DJ connaît le programme avant même d'arriver.",
  },
  {
    emoji: "📞",
    title: "On fait le point",
    text: "Un doute sur les horaires ? Une envie de dernière minute ? Réservez un créneau d'appel téléphonique directement depuis votre espace, en choisissant le moment qui vous arrange.",
    detail: "Un vrai échange humain, planifié en 2 clics.",
    image: "/images/screenshotclient/messagerie.png",
    alt: "Messagerie intégrée : échange direct avec votre DJ dans l'espace client",
  },
  {
    emoji: "🎉",
    title: "Le jour J",
    text: "Tout est déjà cadré : musique, timing, options, matériel. Vous n'avez plus qu'à profiter de vos invités — et à danser.",
    detail: "Installation avant l'heure, démontage après : on gère tout.",
  },
];

export default function CommentCaSePassePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16">
        <FadeIn>
          <p className="text-sm tracking-[0.2em] text-accent uppercase">Votre espace client</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            Comment ça se passe ?
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Réserver un DJ ne devrait pas être une course aux messages perdus.
            Chez Propul&apos;Sound DJ, tout se prépare en ligne, simplement — voici
            le parcours, étape par étape.
          </p>
        </FadeIn>

        <div className="mt-10 space-y-4">
          {steps.map((step, i) => (
            <FadeIn key={step.title} delay={0.05 * i}>
              <div className="flex gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent/40">
                <div className="flex flex-col items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-xl">
                    {step.emoji}
                  </span>
                  {i < steps.length - 1 ? (
                    <span className="mt-2 w-px flex-1 bg-gradient-to-b from-accent/40 to-transparent" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <h2 className="font-medium">
                    <span className="mr-2 text-sm text-muted-foreground">
                      Étape {i + 1}
                    </span>
                    {step.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                  <p className="mt-2 text-xs font-medium text-accent">{step.detail}</p>
                  {step.image ? (
                    <div className="mt-4 overflow-hidden rounded-lg border border-border">
                      <Image
                        src={step.image}
                        alt={step.alt ?? ""}
                        width={1600}
                        height={900}
                        loading="lazy"
                        className="h-auto w-full"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.2}>
          <div className="mt-10 rounded-xl border border-accent/40 bg-accent/5 p-6 text-center">
            <h2 className="text-xl font-medium">Prêt à verrouiller votre date ?</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Votre devis se remplit en quelques minutes, et l&apos;espace client
              vous attend dès l&apos;envoi.
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

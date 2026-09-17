import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RelatedArticles } from "@/components/related-articles";
import { BlogJsonLd } from "@/components/blog-jsonld";

export const metadata: Metadata = {
  title: "Combien coûte un DJ pour un anniversaire à Blois ? (2026)",
  description:
    "Prix d'un DJ pour un anniversaire à Blois, Vendôme et en Loir-et-Cher : fourchettes réelles, ce qui fait varier la facture, les pièges à éviter et comment obtenir un devis tout compris en 2 minutes.",
  alternates: { canonical: "/blog/combien-coute-dj-anniversaire" },
};

export default function ArticlePrixDjAnniversaire() {
  return (
    <>
      <BlogJsonLd
        title="Combien coûte un DJ pour un anniversaire à Blois ? (2026)"
        description="Prix d'un DJ pour un anniversaire en Loir-et-Cher : fourchettes réelles, ce qui fait varier la facture et les pièges à éviter."
        slug="/blog/combien-coute-dj-anniversaire"
        datePublished="2026-09-17"
      />
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <FadeIn>
          <p className="text-sm tracking-[0.2em] text-accent uppercase">
            Anniversaire · Prix 2026
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            Combien coûte un DJ pour un anniversaire à Blois ?
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Par Maxime, DJ Propul&apos;Sound — anniversaires, fiançailles et
            soirées privées animées chaque mois à Blois, Vendôme, Amboise et
            dans tout le Loir-et-Cher.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Publié le <time dateTime="2026-09-17">17 septembre 2026</time>
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-foreground/90">
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
              <p className="font-medium text-accent">En résumé</p>
              <p className="mt-2 text-sm">
                Pour une soirée d&apos;anniversaire en Loir-et-Cher, comptez
                généralement <strong>entre 400 € et 900 €</strong> selon la
                durée et les options. Un devis en
                ligne doit vous donner le <strong>prix final tout compris</strong>{" "}
                (matériel, déplacement, playlist) avant tout engagement.
              </p>
            </div>

            <h2 className="text-2xl font-medium tracking-tight">
              1. Les fourchettes de prix réelles (Loir-et-Cher, 2026)
            </h2>
            <p>
              Contrairement au mariage, l&apos;anniversaire est une prestation
              plus courte et plus simple à organiser. Les prix constatés autour
              de Blois, Vendôme et Romorantin :
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Soirée courte (2-3 h, petit comité)</strong> : 300 € à
                500 € — sono compacte, éclairage simple, DJ polyvalent.
              </li>
              <li>
                <strong>Soirée complète (4-6 h, 30-100 invités)</strong> : 500 €
                à 900 € — matériel adapté à la jauge, éclairage de piste,
                animation et lecture du public.
              </li>
              <li>
                <strong>Grande soirée (100+ invités, options FX)</strong> :
                900 € et plus — durée longue, machine à fumée, étincelles
                froides pour le gâteau, CO2 pour l&apos;entrée du héros.
              </li>
            </ul>
            <p>
              Méfiez-vous des annonces « DJ à 100 € la soirée » : à ce prix,
              c&apos;est souvent une enceinte branchée sur une playlist, sans
              matériel professionnel ni assurance.
            </p>

            <h2 className="text-2xl font-medium tracking-tight">
              2. Ce qui fait vraiment varier la facture
            </h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>La durée</strong> : chaque heure de mix coûte le même
                prix. L&apos;installation, elle, est facturée une seule fois —
                pas autant de fois que d&apos;heures de mix. Plus la soirée est
                longue, plus le coût horaire réel s&apos;amortit.
              </li>
              <li>
                <strong>Le matériel</strong> : la sono et l&apos;éclairage
                restent les mêmes quel que soit le lieu ou le nombre
                d&apos;invités — vous ne payez pas un « pack supérieur » parce
                que vous êtes 80 au lieu de 40.
              </li>
              <li>
                <strong>Les options</strong> : éclairage de piste, fumée,
                étincelles froides… le micro pour les discours est déjà inclus.
                Chaque option est chiffrée clairement dans le devis, jamais
                facturée « surprise » le soir même.
              </li>
              <li>
                <strong>Le déplacement</strong> : chez Propul&apos;Sound DJ,
                les 30 premiers kilomètres d&apos;aller-retour sont offerts,
                et les frais au-delà se calculent automatiquement dans le
                devis — pas de mauvaise surprise.
              </li>
            </ul>

            <h2 className="text-2xl font-medium tracking-tight">
              3. Pourquoi un DJ plutôt qu&apos;une enceinte Bluetooth ?
            </h2>
            <p>
              Pour un anniversaire de 40 personnes, la playlist peut suffire…
              jusqu&apos;au premier imprévu : demande spéciale, l&apos;oncle qui
              met du rap à la place du slow, le moment des discours qui mérite
              un micro. Le DJ, c&apos;est <strong>la lecture du public</strong> :
              il sent quand monter l&apos;énergie, quand ralentir, et il garde
              la piste vivante de la première à la dernière heure.
            </p>

            <h2 className="text-2xl font-medium tracking-tight">
              4. Les 3 pièges à éviter avant de réserver
            </h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Réserver sans contrat</strong> : un acompte sans contrat
                écrit = zéro garantie si le DJ annule. Exigez un contrat signé
                en ligne avec des conditions d&apos;annulation claires (et
                votre délai de rétractation de 14 jours).
              </li>
              <li>
                <strong>Oublier de préciser le style musical</strong> : un bon
                DJ vous demandera vos incontournables et vos interdits. Chez
                nous, vous préparez votre playlist directement dans
                l&apos;espace client, à votre rythme.
              </li>
              <li>
                <strong>Comparer uniquement les prix</strong> : vérifiez les
                avis, l&apos;assurance et la zone
                d&apos;intervention réelle. Un DJ « Blois » qui travaille en
                réalité à 100 km ne viendra peut-être pas.
              </li>
            </ul>

            <h2 className="text-2xl font-medium tracking-tight">
              5. Comment obtenir un prix exact en 2 minutes
            </h2>
            <p>
              Plutôt que de demander « c&apos;est combien ? » par message et
              attendre une réponse, notre{" "}
              <Link href="/formules" className="text-accent underline underline-offset-4">
                configurateur de devis en ligne
              </Link>{" "}
              calcule le prix final en direct : durée, nombre d&apos;invités,
              options, déplacement — tout est inclus, aucun supplément caché.
              Vous signez électroniquement, réglez l&apos;acompte de 20 %, et
              votre date est verrouillée.
            </p>

            <div className="rounded-xl border border-accent/40 bg-accent/5 p-5 text-center">
              <p className="font-medium">Un anniversaire à organiser ?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Calculez votre prix tout compris en 2 minutes — disponibilités
                en temps réel sur Blois et 50 km alentour.
              </p>
              <Link
                href="/formules"
                className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Calculer mon devis d&apos;anniversaire
              </Link>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <p className="mt-10 text-sm">
            <Link href="/blog" className="text-muted-foreground hover:text-accent">
              ← Retour au blog
            </Link>
          </p>
        </FadeIn>
        <RelatedArticles current="/blog/combien-coute-dj-anniversaire" />
      </main>
      <SiteFooter />
    </>
  );
}

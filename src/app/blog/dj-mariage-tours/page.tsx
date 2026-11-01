import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RelatedArticles } from "@/components/related-articles";
import { BlogJsonLd } from "@/components/blog-jsonld";

export const metadata: Metadata = {
  title: "DJ mariage à Tours : tarifs, salles et conseils (guide 2026)",
  description:
    "Tarifs réels d'un DJ de mariage autour de Tours, salles et domaines du val de Loire, questions à poser avant de signer : le guide complet par un DJ qui anime régulièrement Tours, Amboise et Chenonceaux.",
  alternates: { canonical: "/blog/dj-mariage-tours" },
};

export default function ArticleDjMariageTours() {
  return (
    <>
      <BlogJsonLd
        title="DJ mariage à Tours : tarifs, salles et conseils — le guide complet"
        description="Tarifs réels d'un DJ de mariage autour de Tours, salles et domaines du val de Loire, questions à poser avant de signer. Par un DJ qui anime régulièrement la région."
        slug="/blog/dj-mariage-tours"
        datePublished="2026-10-16"
        dateModified="2026-10-16"
      />
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <FadeIn>
          <p className="text-sm tracking-[0.2em] text-accent uppercase">
            Mariage · Guide 2026
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            DJ mariage à Tours : tarifs, salles et conseils — le guide complet
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Par Maxime, DJ Propul&apos;Sound — mariages et soirées animés
            régulièrement à Tours, Amboise, Montlouis-sur-Loire et dans tout le
            val de Loire.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Publié le <time dateTime="2026-10-16">16 octobre 2026</time>
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-foreground/90">
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
              <p className="font-medium text-accent">En résumé</p>
              <p className="mt-2 text-sm">
                Pour un mariage autour de Tours, comptez entre{" "}
                <strong>1 000 € et 1 600 €</strong> pour un DJ clé en main
                (sonorisation, lumière, options FX). La différence entre un bon
                et un mauvais DJ se joue rarement sur le prix : elle se joue sur
                la préparation (playlist, timeline) et la lecture de la piste de
                danse. Voici tout ce qu&apos;il faut savoir avant de signer.
              </p>
            </div>

            <h2 className="text-2xl font-medium tracking-tight">
              1. Combien coûte un DJ de mariage à Tours ?
            </h2>
            <p>
              En Indre-et-Loire, les tarifs d&apos;un DJ de mariage se situent
              généralement entre <strong>900 € et 1 800 €</strong>. Attention
              aux annonces trop belles : un prix d&apos;appel bas cache souvent
              des suppléments (déplacement, heures supplémentaires,
              sonorisation de la cérémonie, jeux de lumière facturés à part).
            </p>
            <p>
              Exigez un <strong>devis clair et détaillé</strong> qui inclut la
              durée de prestation, le déplacement, le matériel (sono + lumière)
              et les options. Idéalement, le devis doit se calculer en ligne, en
              direct — comme sur{" "}
              <Link href="/formules" className="text-accent underline underline-offset-4">
                notre page Formules
              </Link>{" "}
              — pour que vous sachiez exactement ce que vous payez avant même de
              nous appeler.
            </p>

            <h2 className="text-2xl font-medium tracking-tight">
              2. Les lieux de réception autour de Tours
            </h2>
            <p>
              Le val de Loire regorge de lieux exceptionnels, et chacun a ses
              contraintes techniques :
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Domaines et châteaux</strong> (Amboise, Chenonceaux,
                Chaumont-sur-Loire, Montrichard) : souvent classés, ils
                imposent un volume sonore raisonnable après 2 h — un DJ
                expérimenté anticipe et adapte le format de fin de soirée.
              </li>
              <li>
                <strong>Salles des fêtes et granges</strong> autour de Tours et
                Montlouis-sur-Loire : vérifiez la puissance électrique
                disponible et l&apos;accès au camion (chargement à l&apos;abri
                en cas de pluie).
              </li>
              <li>
                <strong>Biens de famille et tentes</strong> : prévoyez un
                emplacement sec et couvert pour le matériel, et une prise
                dédiée.
              </li>
            </ul>
            <p>
              Un bon DJ connaît les lieux qu&apos;il anime. N&apos;hésitez pas
              à lui demander : « as-tu déjà joué ici ? ». À Propul&apos;Sound
              DJ, nous nous déplaçons régulièrement dans tout le val de Loire
              et la plupart des salles entre Tours, Amboise et Blois n&apos;ont
              plus de secret pour nous.
            </p>

            {/* SUITE-ARTICLE */}

            <h2 className="text-2xl font-medium tracking-tight">
              3. Playlist et temps forts : ce qui fait la soirée
            </h2>
            <p>
              Un mariage réussi, c&apos;est une piste de danse pleine de 23 h à
              4 h. Pour ça, il faut un DJ qui construit la playlist{" "}
              <strong>avec vous</strong> (vos titres incontournables, la
              chanson de votre première danse, celles à éviter absolument),
              qui sait <strong>lire la piste de danse</strong> de 8 à 80 ans,
              et qui gère les <strong>temps forts</strong> avec précision :
              entrée des mariés, discours, gâteau, ouverture du bal.
            </p>
            <p>
              Posez la question simple : « Comment je te donne mes musiques ? ».
              Si la réponse est « par e-mail, on verra », fuyez. Un bon DJ
              dispose d&apos;un <strong>espace client</strong> où vous remplissez
              votre playlist et votre timeline à votre rythme — et vous pouvez
              la modifier jusqu&apos;à la veille.
            </p>

            <h2 className="text-2xl font-medium tracking-tight">
              4. Zone d&apos;intervention : qui vient vraiment chez vous ?
            </h2>
            <p>
              Beaucoup de DJs « Tours » travaillent en réalité depuis Paris ou
              Angers. Vérifiez la zone réelle et le coût du déplacement. Chez
              Propul&apos;Sound DJ, basés à Blois à 45 minutes de Tours, nous
              animons des mariages à <strong>Tours, Amboise,
              Montlouis-sur-Loire, Chenonceaux, Bléré, Montrichard,
              Chaumont-sur-Loire</strong> et dans un rayon de 50 km : les 30
              premiers kilomètres d&apos;aller-retour sont offerts, et les
              frais se calculent automatiquement dans votre devis.
            </p>
            <p>
              Pour un aperçu complet de la méthode (budget, répertoire,
              matériel), consultez notre{" "}
              <Link
                href="/blog/choisir-dj-mariage-blois"
                className="text-accent underline underline-offset-4"
              >
                guide complet pour choisir son DJ de mariage à Blois
              </Link>{" "}
              — les critères sont les mêmes dans tout le val de Loire.
            </p>

            <h2 className="text-2xl font-medium tracking-tight">
              5. La checklist finale avant de signer
            </h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Devis détaillé avec le prix final (options et déplacement inclus)</li>
              <li>Espace client pour la playlist et la timeline</li>
              <li>Matériel adapté à votre jauge et à votre salle</li>
              <li>Contrat signé en ligne + acompte sécurisé</li>
              <li>Des avis clients récents et vérifiables</li>
              <li>Un échange téléphonique avant la soirée (le feeling !)</li>
            </ul>

            <div className="rounded-xl border border-accent/40 bg-accent/5 p-5 text-center">
              <p className="font-medium">Prêt à comparer concrètement ?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Construisez votre devis en 2 minutes, prix final en direct —
                déplacement calculé automatiquement depuis Blois jusqu&apos;à
                votre lieu de réception.
              </p>
              <Link
                href="/formules"
                className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Créer mon devis de mariage
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
        <RelatedArticles current="/blog/dj-mariage-tours" />
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Comment choisir son DJ de mariage à Blois ? (guide 2026)",
  description:
    "Budget, répertoire, matériel, espace client : le guide complet pour choisir le DJ de votre mariage à Blois, Vendôme, Amboise et dans tout le Loir-et-Cher. Conseils d'un DJ local.",
  alternates: { canonical: "/blog/choisir-dj-mariage-blois" },
};

export default function ArticleDjMariageBlois() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <FadeIn>
          <p className="text-sm tracking-[0.2em] text-accent uppercase">
            Mariage · Guide 2026
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            Comment choisir son DJ de mariage à Blois ? Le guide complet
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Par Maxime, DJ Propul&apos;Sound — des dizaines de mariages animés
            chaque année à Blois, Vendôme, Amboise et dans tout le Loir-et-Cher.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-foreground/90">
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
              <p className="font-medium text-accent">En résumé</p>
              <p className="mt-2 text-sm">
                Un bon DJ de mariage, c&apos;est 20 % de matériel et 80 % de
                préparation. Vérifiez : le prix tout compris, la
                personnalisation de la playlist, la gestion des temps forts
                (entrée, ouverture du bal), et un vrai échange humain avant la
                soirée. À Blois, comptez entre 1 000 € et 1 500 € pour un
                mariage clé en main.
              </p>
            </div>

            <h2 className="text-2xl font-medium tracking-tight">
              1. Combien coûte un DJ de mariage près de Blois ?
            </h2>
            <p>
              Dans le Loir-et-Cher, les tarifs d&apos;un DJ de mariage se
              situent généralement entre <strong>900 € et 1 800 €</strong>.
              Attention aux annonces trop belles : un prix d&apos;appel bas
              cache souvent des suppléments (déplacement, heures
              supplémentaires, sonorisation de la cérémonie, jeux de lumière).
            </p>
            <p>
              Exigez un <strong>devis clair et détaillé</strong> qui inclut :
              la durée de prestation, le déplacement, le matériel (sono +
              lumière) et les options. Idéalement, le devis doit se calculer
              en ligne, en direct — comme sur{" "}
              <Link href="/formules" className="text-accent underline underline-offset-4">
                notre page Formules
              </Link>{" "}
              — pour que vous sachiez exactement ce que vous payez avant même
              de nous appeler.
            </p>

            <h2 className="text-2xl font-medium tracking-tight">
              2. Le répertoire : LA question qui change tout
            </h2>
            <p>
              Un mariage réussi, c&apos;est une piste de danse pleine de 23 h
              à 4 h. Pour ça, il faut un DJ qui :
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                construit la playlist <strong>avec vous</strong> : vos titres
                incontournables, la chanson de votre première danse, et
                surtout celles à éviter absolument ;
              </li>
              <li>
                sait <strong>lire la piste de danse</strong> et improviser en
                fonction de vos invités, de 8 à 80 ans ;
              </li>
              <li>
                gère les <strong>temps forts</strong> avec précision : entrée
                des mariés, repas, discours, gâteau, ouverture du bal.
              </li>
            </ul>
            <p>
              Posez la question simple : « Comment je te donne mes musiques ? ».
              Si la réponse est « par e-mail, on verra », fuyez. Un bon DJ
              dispose d&apos;un <strong>espace client</strong> où vous remplissez votre
              playlist et votre timeline à votre rythme.
            </p>
            {/* SUITE-ARTICLE */}
            <h2 className="text-2xl font-medium tracking-tight">
              3. Matériel : ce qu&apos;un DJ professionnel doit apporter
            </h2>
            <p>
              Pour une réception de 100 à 250 personnes dans une salle du
              Loir-et-Cher (salle des fêtes, domaine, château), vérifiez :
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>une sono adaptée à la jauge (minimum 2 000 W pour 200 personnes) ;</li>
              <li>des jeux de lumière pilotés en musique (Rekordbox Lighting) ;</li>
              <li>
                des options FX si vous en voulez : fumée lourde, étincelles
                froides (en intérieur !), pistolet CO2 pour l&apos;entrée des mariés ;
              </li>
              <li>
                la sonorisation de la <strong>cérémonie laïque</strong> et du{" "}
                <strong>cocktail</strong> si votre mariage démarre en journée.
              </li>
            </ul>
            <p>
              Et une question à poser avant de signer : « que se passe-t-il en
              cas de panne le soir même ? ». Un bon professionnel a une
              réponse claire et concrète.
            </p>

            <h2 className="text-2xl font-medium tracking-tight">
              4. Le contrat et l&apos;acompte : les règles du jeu
            </h2>
            <p>
              Un engagement sérieux passe par un <strong>contrat signé</strong>{" "}
              et un acompte de réservation (généralement ~20 %). Exigez une
              signature <strong>en ligne</strong>, sans rendez-vous à
              déplacer, et la possibilité de payer l&apos;acompte par carte
              bancaire ou virement. Vérifiez aussi les conditions
              d&apos;annulation : la loi vous accorde un délai de
              rétractation de 14 jours après la signature.
            </p>

            <h2 className="text-2xl font-medium tracking-tight">
              5. Zone d&apos;intervention : qui vient vraiment chez vous ?
            </h2>
            <p>
              Beaucoup de DJs « Blois » travaillent en réalité à 100 km.
              Vérifiez la zone réelle et le coût du déplacement. Chez
              Propul&apos;Sound DJ, nous animons des mariages à{" "}
              <strong>Blois, Vendôme, Amboise, Romorantin-Lanthenay,
              Montrichard, Onzain, Chaumont-sur-Loire, Chambord</strong> et
              dans un rayon de 50 km : les 30 premiers kilomètres
              d&apos;aller-retour sont offerts, et les frais se calculent
              automatiquement dans votre devis.
            </p>

            <h2 className="text-2xl font-medium tracking-tight">
              6. La checklist finale avant de signer
            </h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>☐ Devis détaillé avec le prix final (options et déplacement inclus)</li>
              <li>☐ Espace client pour la playlist et la timeline</li>
              <li>☐ Matériel adapté à votre jauge et à votre salle</li>
              <li>☐ Contrat signé en ligne + acompte sécurisé</li>
              <li>☐ Des avis clients récents et vérifiables</li>
              <li>☐ Un échange téléphonique avant la soirée (le feeling !)</li>
            </ul>

            <div className="rounded-xl border border-accent/40 bg-accent/5 p-5 text-center">
              <p className="font-medium">Prêt à comparer concrètement ?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Construisez votre devis en 2 minutes, prix final en direct —
                et voyez par vous-même ce qu&apos;un espace client moderne
                change à l&apos;organisation d&apos;un mariage.
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
      </main>
    </>
  );
}
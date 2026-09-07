import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "DJ mariage ou playlist Spotify : ce que ça change vraiment",
  description:
    "Vous hésitez entre une enceinte et une playlist Spotify et un DJ professionnel ? Le comparatif honnête d'un DJ du Loir-et-Cher : ambiance, imprévus, matériel, temps forts.",
  alternates: { canonical: "/blog/dj-ou-playlist-spotify" },
};

export default function ArticleDjOuSpotify() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <FadeIn>
          <p className="text-sm tracking-[0.2em] text-accent uppercase">
            Réflexion · Avant de choisir
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            DJ mariage ou playlist Spotify : ce que ça change vraiment
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Le comparatif sans langue de bois, par un DJ qui anime des mariages
            et soirées dans tout le Loir-et-Cher.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-foreground/90">
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
              <p className="font-medium text-accent">La réponse courte</p>
              <p className="mt-2 text-sm">
                Une playlist Spotify, c&apos;est de la musique. Un DJ
                professionnel, c&apos;est <strong>l&apos;ambiance de votre
                soirée</strong> : il lit la piste de danse, gère les imprévus,
                les annonces, les temps forts et le matériel. Et il assume
                quand ça part trop tôt… ou pas assez.
              </p>
            </div>
            {/* SUITE-ARTICLE */}
            <h2 className="text-2xl font-medium tracking-tight">
              1. La playlist ne lit jamais la piste de danse
            </h2>
            <p>
              Le vrai travail d&apos;un DJ, ce n&apos;est pas de passer des
              morceaux — n&apos;importe quelle enceinte sait faire ça. C&apos;est{" "}
              <strong>lire la salle en temps réel</strong> : sentir qu&apos;il
              faut accélérer quand l&apos;énergie retombe, enchaîner un slow
              au bon moment pour que les aînés se réapproprient la piste,
              éviter le titre qui videra la salle. Une playlist, elle, avance
              tout droit. Même si personne ne danse.
            </p>
            <p>
              Et les transitions ? Entre deux titres aux tempos différents,
              un DJ <strong>mixe</strong> : pas de silence gênant, pas de
              coupure brutale qui casse l&apos;ambiance.
            </p>
            {/* SUITE-2 */}
            <h2 className="text-2xl font-medium tracking-tight">
              2. Les imprévus, c&apos;est 50 % d&apos;un mariage
            </h2>
            <p>
              Le repas prend une heure de retard. Le discours du témoin passe
              de 3 à 15 minutes. L&apos;ouverture du bal est demandée 30
              minutes plus tôt. Le barnum fuit. La météo change.
            </p>
            <p>
              Une playlist ne s&apos;adapte pas. Un DJ, si : il décale,
              raccourcit, relance, annonce, temporise. Il coordonne aussi avec
              le traiteur et le photographe pour que la soirée reste fluide
              du cocktail au dernier slow.
            </p>

            <h2 className="text-2xl font-medium tracking-tight">
              3. Le matériel : bien plus qu&apos;une enceinte
            </h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Une <strong>sonorisation dimensionnée</strong> pour la salle
                et le nombre d&apos;invités (une enceinte portable couvre
                difficilement 150 personnes qui discutent) ;
              </li>
              <li>
                des <strong>micros</strong> pour les discours et la cérémonie,
                sans larsen ni coupure ;
              </li>
              <li>
                des <strong>jeux de lumière pilotés en musique</strong> qui
                transforment une salle des fêtes en club ;
              </li>
              <li>
                une <strong>installation soignée</strong>, réglée et testée
                bien avant l&apos;arrivée des invités ;
              </li>
              <li>
                une <strong>installation et un démontage</strong> gérés, 2 h
                avant et 1 h après, sans que vous ne leviez le petit doigt.
              </li>
            </ul>
            {/* SUITE-3 */}
            <h2 className="text-2xl font-medium tracking-tight">
              4. Le coût réel de chaque option
            </h2>
            <p>
              La playlist paraît gratuite : l&apos;abonnement Spotify à 11 €,
              une enceinte à 300 €… sauf qu&apos;il faut y ajouter la sono
              suffisante pour la salle, les micros, les lumières, le temps de
              montage, et une personne dédiée pour tenir l&apos;ordinateur
              toute la soirée (souvent un ami, qui ne dansera pas). Et si ça
              plante à 23 h ? Il n&apos;y a ni plan B ni responsabilité.
            </p>
            <p>
              Un DJ professionnel, c&apos;est un budget de{" "}
              <strong>1 000 € à 1 500 €</strong> pour un mariage clé en main
              dans le Loir-et-Cher : le prix d&apos;une soirée où{" "}
              <strong>vous aussi, vous dansez</strong> — et où un pro porte
              la responsabilité du bon déroulement.
            </p>

            <h2 className="text-2xl font-medium tracking-tight">
              5. Alors, quand la playlist suffit-elle ?
            </h2>
            <p>
              Soyons honnêtes : pour un apéro entre amis, un barbecue
              d&apos;été ou une ambiance de fond, la playlist fait très bien
              le travail. C&apos;est quand{" "}
              <strong>la soirée doit vivre</strong> — mariages,
              anniversaires marquants, soirées d&apos;entreprise — que
              l&apos;écart se crée. Plus il y a d&apos;invités, plus il y a
              d&apos;enjeu, plus le professionnel a de valeur.
            </p>

            <div className="rounded-xl border border-accent/40 bg-accent/5 p-5 text-center">
              <p className="font-medium">Le meilleur des deux mondes existe</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Chez Propul&apos;Sound, ta playlist Spotify nourrit la soirée :
                tu ajoutes tes incontournables dans ton espace client, et le DJ
                les mixe, les place au bon moment et complète avec ce qui fera
                danser tes invités.
              </p>
              <Link
                href="/formules"
                className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Créer mon devis et ma playlist
              </Link>
            </div>

            <p className="text-sm">
              À lire aussi :{" "}
              <Link
                href="/blog/playlist-mariage-2026"
                className="text-accent underline underline-offset-4"
              >
                Playlist de mariage 2026 — les 20 titres qui font lever la foule
              </Link>
            </p>
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
import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";
import { SongItem } from "@/components/playlist-preview";

export const metadata: Metadata = {
  title: "Playlist de mariage 2026 — les 20 titres qui font lever la foule",
  description:
    "La sélection 2026 d'un DJ du Loir-et-Cher : ouverture du bal, temps forts et piste de danse en feu. 15 titres (français et internationaux) qui marchent à tous les coups.",
  alternates: { canonical: "/blog/playlist-mariage-2026" },
};

export default function ArticlePlaylistMariage2026() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <FadeIn>
          <p className="text-sm tracking-[0.2em] text-accent uppercase">
            Playlist · Guide 2026
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            Playlist de mariage 2026 : les 20 titres qui font lever la foule
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Par Maxime, DJ Propul&apos;Sound — testés et approuvés sur les
            pistes de danse de Blois, Vendôme, Amboise et tout le
            Loir-et-Cher.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-foreground/90">
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
              <p className="font-medium text-accent">La vérité d&apos;un DJ</p>
              <p className="mt-2 text-sm">
                Il n&apos;existe pas UNE playlist de mariage magique : il
                existe une playlist qui correspond à VOS invités. Mais après
                des dizaines de mariages, certains titres font lever la piste
                à coup sûr, quel que soit le public. Voici les 20 titres
                de 2026, organisés par moment de la soirée — à piocher dans votre espace client !
              </p>
            </div>

            <h2 className="text-2xl font-medium tracking-tight">
              💐 1. L&apos;entrée des mariés
            </h2>
            <ol className="list-decimal space-y-2 pl-6">
              <SongItem title="Sara Perche Ti Amo" artist="DJ Matrix" note="l'électro-dance italienne qui met tout le monde de bonne humeur dès l'entrée dans la salle." />
              <SongItem title="Celebration" artist="Kool & The Gang" note="le classique éternel : la fête commence littéralement à la première note." />
              <SongItem title="Charger" artist="Triangle des Bermudes" note="le titre qui monte, pour une entrée pleine d'énergie." />
            </ol>

            <h2 className="text-2xl font-medium tracking-tight">
              💍 2. L&apos;ouverture du bal
            </h2>
            <ol className="list-decimal space-y-2 pl-6" start={4}>
              <SongItem title="Perfect" artist="Ed Sheeran" note="l'intemporel. Si vous n'avez pas d'idée, c'est le choix sûr absolu." />
              <SongItem title="Reality" artist="Richard Sanderson" note="LA chanson de « La Boum » (1980) : élégante, romantique, et toujours aussi efficace au bal." />
              <SongItem title="One More Try" artist="George Michael" note="la touche soul vintage pour une ouverture pleine d'émotion." />
            </ol>

            <h2 className="text-2xl font-medium tracking-tight">
              🍰 3. Le moment du dessert
            </h2>
            <p className="text-sm text-muted-foreground">
              Le dessert, c&apos;est le signal : la soirée passe à la vitesse
              supérieure. Ces trois titres remettent tout le monde debout
              avant même la fin du gâteau.
            </p>
            <ol className="list-decimal space-y-2 pl-6" start={7}>
              <SongItem title="Titanium (Remix)" artist="David Guetta & MORTEN" note="la montée progressive parfaite pour enchaîner gâteau → piste de danse." />
              <SongItem title="Firework" artist="Katy Perry" note="l'hymne feel-good : tout le monde le connaît, tout le monde le chante." />
              <SongItem title="I Gotta Feeling" artist="The Black Eyed Peas" note="« tonight's gonna be a good night » : la prophétie autoréalisatrice." />
            </ol>

            <h2 className="text-2xl font-medium tracking-tight">
              🔥 4. Le dancefloor (jusqu&apos;au bout de la nuit)
            </h2>
            <ol className="list-decimal space-y-2 pl-6" start={10}>
              <SongItem title="September" artist="Earth, Wind & Fire" note="le funk qui traverse les âges. Testé et re-testé." />
              <SongItem title="Party Rock Anthem" artist="LMFAO" note="l'énergie brute : la piste explose à chaque fois." />
              <SongItem title="Freed from Desire" artist="Gala" note="l'hymne collectif : des stades aux mariages, personne ne résiste." />
              <SongItem title="Can't Hold Us" artist="Macklemore & Ryan Lewis" note="le tempo fou qui relance même les plus fatigués." />
              <SongItem title="Samba de Janeiro" artist="Bellini" note="l'ambiance carnaval : les congas sortent de nulle part." />
              <SongItem title="24K Magic" artist="Bruno Mars" note="l'énergie instantanée, zéro temps mort." />
              <SongItem title="Cosmo" artist="Soprano" note="le titre français qui fait danser et chanter toutes les générations." />
              <SongItem title="Ces soirées-là" artist="Yannick" note="nostalgie garantie : les 30-50 ans se ruent sur la piste." />
              <SongItem title="Dans les yeux d'Émilie" artist="Joe Dassin" note="le surprise-tube : les aînés adorent, les jeunes découvrent." />
              <SongItem title="Désenchantée" artist="Kate Ryan" note="le hit dance 2000s qui fait chanter tout le monde sur un air de Mylène Farmer." />
              <SongItem title="Movin' to the Sun" artist="HUGEL" note="l'house ensoleillée qui garde la piste chaude jusqu'à la fin." />
            </ol>
            {/* SUITE-ARTICLE */}

            <h2 className="text-2xl font-medium tracking-tight">
              🚫 Et les pièges à éviter
            </h2>
            <p>
              Le morceau que VOUS adorez mais que personne d&apos;autre ne
              connaît. Le remix de 12 minutes. Les 5 slows d&apos;affilée (la
              piste meurt). Et surtout : ne surchargez pas la liste — un bon
              DJ a besoin de liberté pour lire la piste de danse et
              improviser. Vos titres sont des jalons, pas un programme fermé.
            </p>

            <h2 className="text-2xl font-medium tracking-tight">
              🎧 Comment construire VOTRE playlist ?
            </h2>
            <p>
              Dans votre espace client Propul&apos;Sound, vous remplissez
              votre playlist à votre rythme : vos incontournables, les temps
              forts (entrée des mariés, ouverture du bal, dessert), et la
              liste des titres à ne PAS passer. C&apos;est votre soirée — moi
              je m&apos;adapte, et je lis la piste de danse pour le reste.
            </p>

            <div className="rounded-xl border border-accent/40 bg-accent/5 p-5 text-center">
              <p className="font-medium">
                Envie d&apos;une soirée où la piste ne se vide jamais ?
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Créez votre devis en 2 minutes et remplissez votre playlist
                dès votre espace client.
              </p>
              <Link
                href="/formules"
                className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Créer mon devis
              </Link>
            </div>

            <p className="text-sm">
              À lire aussi :{" "}
              <Link
                href="/blog/choisir-dj-mariage-blois"
                className="text-accent underline underline-offset-4"
              >
                Comment choisir son DJ de mariage à Blois ?
              </Link>
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
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

import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Blog — Conseils mariage & soirées (Blois, Loir-et-Cher)",
  description:
    "Guides et conseils par votre DJ en Loir-et-Cher : organiser un mariage à Blois, choisir sa playlist, réussir son ouverture du bal et sa soirée.",
};

const articles = [
  {
    href: "/blog/choisir-dj-mariage-blois",
    emoji: "💍",
    tag: "Mariage",
    title: "Comment choisir son DJ de mariage à Blois ? (guide 2026)",
    excerpt:
      "Budget, répertoire, matériel, espace client : les 7 critères qui font la différence entre un mariage réussi et une soirée oubliable. Guide complet pour les futurs mariés de Blois, Vendôme et tout le Loir-et-Cher.",
    readingTime: "6 min",
  },
  {
    href: "/blog/playlist-mariage-2026",
    emoji: "🎵",
    tag: "Playlist",
    title: "Playlist de mariage 2026 — les 15 titres qui font lever la foule",
    excerpt:
      "Ouverture du bal, piste de danse en feu, slow qui rassemble : la sélection testée et approuvée par un DJ du Loir-et-Cher. Et les pièges à éviter.",
    readingTime: "5 min",
  },
  {
    href: "/blog/dj-ou-playlist-spotify",
    emoji: "🔊",
    tag: "Réflexion",
    title: "DJ mariage ou playlist Spotify : ce que ça change vraiment",
    excerpt:
      "Lecture de la piste de danse, imprévus, matériel, transitions : le comparatif honnête entre une enceinte Bluetooth et un DJ professionnel (et quand la playlist suffit).",
    readingTime: "5 min",
  },
];

export default function BlogPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16">
        <FadeIn>
          <p className="text-sm tracking-[0.2em] text-accent uppercase">Le blog</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            Conseils de DJ, pour vos soirées
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Guides pratiques et coulisses, écrits par un DJ qui tourne chaque
            week-end en Loir-et-Cher. De quoi organiser une soirée mémorable.
          </p>
        </FadeIn>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {articles.map((article, i) => (
            <FadeIn key={article.href} delay={0.05 * i}>
              <Link
                href={article.href}
                className="group flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-colors hover:border-accent/50"
              >
                <span className="text-3xl">{article.emoji}</span>
                <p className="mt-3 text-xs font-medium tracking-[0.2em] text-accent uppercase">
                  {article.tag} · {article.readingTime}
                </p>
                <h2 className="mt-2 text-lg font-medium leading-snug group-hover:text-accent">
                  {article.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {article.excerpt}
                </p>
                <span className="mt-4 text-sm font-medium text-accent">
                  Lire l&apos;article →
                </span>
              </Link>
            </FadeIn>
          ))}

          {/* Carte remplissage : tease les prochains articles */}
          <FadeIn delay={0.15}>
            <div className="flex h-full flex-col justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <span className="text-3xl">📝</span>
              <p className="mt-3">
                Bientôt : <strong>« Organiser un mariage à Blois : le checklist complet des prestataires »</strong>
              </p>
            </div>
          </FadeIn>
        </div>
      </main>
    </>
  );
}
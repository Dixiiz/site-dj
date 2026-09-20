import Link from "next/link";
import { FadeIn } from "@/components/fade-in";
import {
  Heart,
  Music,
  Cake,
  Building2,
  type LucideIcon,
} from "lucide-react";

// Icône sobre (Lucide) par article, cohérente avec les catégories du blog.
const ARTICLE_ICONS: Record<string, LucideIcon> = {
  "/blog/choisir-dj-mariage-blois": Heart,
  "/blog/playlist-mariage-2026": Music,
  "/blog/dj-ou-playlist-spotify": Music,
  "/blog/combien-coute-dj-anniversaire": Cake,
  "/blog/dj-soiree-entreprise-erreurs": Building2,
};

const RELATED: Record<string, { href: string; title: string }[]> = {
  "/blog/choisir-dj-mariage-blois": [
    { href: "/blog/playlist-mariage-2026", title: "Playlist de mariage 2026 — les 15 titres qui font lever la foule" },
    { href: "/blog/combien-coute-dj-anniversaire", title: "Combien coûte un DJ pour un anniversaire à Blois ? (2026)" },
  ],
  "/blog/playlist-mariage-2026": [
    { href: "/blog/choisir-dj-mariage-blois", title: "Comment choisir son DJ de mariage à Blois ? (guide 2026)" },
    { href: "/blog/dj-ou-playlist-spotify", title: "DJ mariage ou playlist Spotify : ce que ça change vraiment" },
  ],
  "/blog/dj-ou-playlist-spotify": [
    { href: "/blog/choisir-dj-mariage-blois", title: "Comment choisir son DJ de mariage à Blois ? (guide 2026)" },
    { href: "/blog/playlist-mariage-2026", title: "Playlist de mariage 2026 — les 15 titres qui font lever la foule" },
  ],
  "/blog/combien-coute-dj-anniversaire": [
    { href: "/blog/choisir-dj-mariage-blois", title: "Comment choisir son DJ de mariage à Blois ? (guide 2026)" },
    { href: "/blog/dj-soiree-entreprise-erreurs", title: "DJ pour soirée d'entreprise : les 5 erreurs à éviter" },
  ],
  "/blog/dj-soiree-entreprise-erreurs": [
    { href: "/blog/choisir-dj-mariage-blois", title: "Comment choisir son DJ de mariage à Blois ? (guide 2026)" },
    { href: "/blog/combien-coute-dj-anniversaire", title: "Combien coûte un DJ pour un anniversaire à Blois ? (2026)" },
  ],
};

// Bloc "articles liés" : maillage interne entre les articles du blog
// (Google découvre et valorise les pages reliées entre elles).
export function RelatedArticles({ current }: { current: string }) {
  const items = RELATED[current] ?? [];
  if (items.length === 0) return null;
  return (
    <FadeIn>
      <aside className="mt-14 rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
          À lire aussi
        </h2>
        <ul className="mt-3 space-y-3">
          {items.map((a) => (
            <li key={a.href}>
              <Link
                href={a.href}
                className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-accent/5"
              >
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent"
                >
                  {(() => {
                    const Icon = ARTICLE_ICONS[a.href] ?? Music;
                    return <Icon size={16} strokeWidth={1.75} />;
                  })()}
                </span>
                <span className="text-sm font-medium leading-snug">{a.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </FadeIn>
  );
}

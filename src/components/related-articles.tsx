import Link from "next/link";
import { FadeIn } from "@/components/fade-in";

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
                <span aria-hidden className="mt-0.5 text-accent">→</span>
                <span className="text-sm font-medium leading-snug">{a.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </FadeIn>
  );
}

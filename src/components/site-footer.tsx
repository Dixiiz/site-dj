import Link from "next/link";
import { SITE_NAME } from "@/lib/site-url";

// Liens du footer sur toutes les pages publiques : chaque page importante
// est atteignable depuis n'importe quelle autre (maillage interne SEO).
const links: { href: string; label: string }[] = [
  { href: "/mariage", label: "DJ mariage" },
  { href: "/anniversaire", label: "DJ anniversaire" },
  { href: "/evenement-entreprise", label: "Événement d'entreprise" },
  { href: "/formules", label: "Formules & tarifs" },
  { href: "/sur-mesure", label: "Sur-mesure" },
  { href: "/disponibilites", label: "Disponibilités" },
  { href: "/comment-ca-se-passe", label: "Comment ça se passe" },
  { href: "/galerie", label: "Galerie" },
  { href: "/avis", label: "Avis clients" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
      <nav aria-label="Plan du site" className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="text-xs transition-colors hover:text-accent">
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="mt-4 px-4">
        {SITE_NAME} — Huisseau-sur-Cosson (41350) · DJ mariage, anniversaire et
        soirées à Blois, Vendôme, Amboise et dans un rayon de 50 km ·
        Déplacement offert dans un rayon de 30 km
      </p>
      <div className="mt-2 space-x-4">
        <Link href="/mentions-legales" className="text-xs transition-colors hover:text-accent">
          Mentions légales
        </Link>
      </div>
    </footer>
  );
}

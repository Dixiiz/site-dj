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
      <nav aria-label="Plan du site" className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            // Zone de tap confortable (≥ 36 px) sans changer le style visuel :
            // padding transparent + marges négatives compensatoires.
            className="inline-flex min-h-9 items-center rounded-md px-2 text-xs text-muted-foreground transition-all duration-200 hover:text-accent hover:underline hover:underline-offset-4"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="mt-4 px-4">
        {SITE_NAME} — Blois (Huisseau-sur-Cosson, 41350) · DJ mariage, anniversaire et
        soirées à Blois, Vendôme, Amboise et dans un rayon de 50 km ·
        Déplacement offert dans un rayon de 30 km
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1">
        <Link href="/mentions-legales" className="inline-flex min-h-9 items-center rounded-md px-2 text-xs text-muted-foreground transition-all duration-200 hover:text-accent hover:underline hover:underline-offset-4">
          Mentions légales
        </Link>
        <Link href="/conditions-utilisation" className="inline-flex min-h-9 items-center rounded-md px-2 text-xs text-muted-foreground transition-all duration-200 hover:text-accent hover:underline hover:underline-offset-4">
          CGV
        </Link>
        <Link href="/politique-de-confidentialite" className="inline-flex min-h-9 items-center rounded-md px-2 text-xs text-muted-foreground transition-all duration-200 hover:text-accent hover:underline hover:underline-offset-4">
          Confidentialité
        </Link>
        <Link href="/politique-cookies" className="inline-flex min-h-9 items-center rounded-md px-2 text-xs text-muted-foreground transition-all duration-200 hover:text-accent hover:underline hover:underline-offset-4">
          Cookies
        </Link>
      </div>
    </footer>
  );
}

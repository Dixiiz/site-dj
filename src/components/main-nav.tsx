"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/formules", label: "Formules" },
  { href: "/disponibilites", label: "Disponibilités" },
  { href: "/sur-mesure", label: "Sur-mesure" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
  { href: "/mon-espace", label: "Mon espace" },
];

export function MainNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Ferme le menu à chaque changement de page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop : navigation inline */}
      <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "transition-colors hover:text-accent",
                active && "font-medium text-accent"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile : bouton hamburger */}
      <button
        type="button"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-foreground transition-colors hover:border-accent/50 hover:text-accent md:hidden"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile : panneau déroulant */}
      {open ? (
        <nav className="absolute inset-x-0 top-full z-40 border-b border-white/10 bg-background/95 backdrop-blur-md md:hidden">
          <ul className="mx-auto max-w-5xl px-4 py-3">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "block rounded-lg px-3 py-2.5 text-base transition-colors hover:bg-accent/10 hover:text-accent",
                      active && "bg-accent/10 font-medium text-accent"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </>
  );
}


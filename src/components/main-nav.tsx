"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/formules", label: "Formules" },
  { href: "/disponibilites", label: "Disponibilités" },
  { href: "/sur-mesure", label: "Sur-mesure" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 text-sm text-muted-foreground">
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
  );
}

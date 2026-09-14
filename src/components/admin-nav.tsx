"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import {
  CalendarDays,
  FileText,
  Home,
  Images,
  LogOut,
  Menu,
  ReceiptText,
  Users,
} from "lucide-react";
import { logoutAdmin } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";

const LINKS = [
  { href: "/admin", label: "Accueil", icon: Home },
  { href: "/admin/devis", label: "Devis", icon: FileText },
  { href: "/admin/factures", label: "Factures", icon: ReceiptText },
  { href: "/admin/planning", label: "Planning", icon: CalendarDays },
  { href: "/admin/medias", label: "Médias", icon: Images },
  { href: "/admin/comptes", label: "Comptes", icon: Users },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: (typeof LINKS)[number]["icon"];
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-accent font-medium text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}

/**
 * Navigation de l'admin : onglets en ligne sur desktop, menu déroulant
 * sur mobile pour que tous les onglets restent accessibles.
 */
export function AdminNav() {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const closeMenu = () => detailsRef.current?.removeAttribute("open");

  return (
    <>
      {/* Desktop : onglets en ligne */}
      <nav
        aria-label="Navigation admin"
        className="hidden items-center gap-1 md:flex"
      >
        {LINKS.map((link) => (
          <NavLink
            key={link.href}
            {...link}
            active={isActive(pathname, link.href)}
          />
        ))}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          Site
        </Link>
        <form action={logoutAdmin} className="ml-2">
          <SubmitButton
            pendingLabel="…"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <span className="flex items-center gap-1.5">
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Déconnexion
            </span>
          </SubmitButton>
        </form>
      </nav>

      {/* Mobile : menu déroulant */}
      <details ref={detailsRef} className="relative md:hidden">
        <summary
          aria-label="Ouvrir le menu admin"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <span className="flex items-center gap-1.5">
            <Menu className="h-4 w-4" aria-hidden />
            Menu
          </span>
        </summary>
        <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
          <nav
            aria-label="Navigation admin (mobile)"
            className="flex flex-col"
          >
            {LINKS.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                active={isActive(pathname, link.href)}
                onNavigate={closeMenu}
              />
            ))}
            <Link
              href="/"
              onClick={closeMenu}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              Site
            </Link>
            <form action={logoutAdmin} className="mt-1 border-t border-border pt-1.5">
              <SubmitButton
                pendingLabel="…"
                className={`${buttonVariants({ variant: "ghost", size: "sm" })} w-full justify-start`}
              >
                <span className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" aria-hidden />
                  Déconnexion
                </span>
              </SubmitButton>
            </form>
          </nav>
        </div>
      </details>
    </>
  );
}

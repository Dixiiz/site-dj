import Image from "next/image";
import Link from "next/link";
import { getClientUser } from "@/app/client-actions";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export async function SiteHeader() {
  const user = await getClientUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/logo-bleu-transparent.png"
            alt="Propul'Sound DJ"
            width={140}
            height={40}
            className="h-8 w-auto object-contain sm:h-10"
            priority
          />
          <span className="hidden text-lg font-semibold tracking-wide sm:inline">
            Propul&apos;Sound DJ
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <MainNav />
          {/* Bouton compte en position la plus à droite */}
          <Link
            href={user ? "/mon-espace" : "/connexion"}
            className="flex items-center gap-1.5 rounded-full border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/15"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <span>Mon espace</span>
          </Link>
        </div>
      </div>
    </header>
  );
}


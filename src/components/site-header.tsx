import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-heading text-lg tracking-wide">
          DJ Studio
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Devis
          </Link>
          <Link href="/admin" className="hover:text-foreground">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}

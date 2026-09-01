import Image from "next/image";
import Link from "next/link";
import { MainNav } from "@/components/main-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 font-heading text-lg tracking-wide">
          <span className="flex size-9 items-center justify-center rounded-md bg-white p-1">
            <Image
              src="/logo.png"
              alt="Propul'Sound DJ"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </span>
          <span>
            Propul&apos;Sound <span className="text-accent">DJ</span>
          </span>
        </Link>
        <MainNav />
      </div>
    </header>
  );
}

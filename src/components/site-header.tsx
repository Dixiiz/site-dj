import Image from "next/image";
import Link from "next/link";
import { MainNav } from "@/components/main-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo-bleu-v2.png"
            alt="Propul'Sound DJ"
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
          <span className="text-lg font-semibold tracking-wide">Propul&apos;Sound DJ</span>
        </Link>
        <MainNav />
      </div>
    </header>
  );
}

import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";

// Page 404 personnalisée : le site est récent, des erreurs peuvent arriver —
// on s'excuse et on invite le visiteur à signaler le problème.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-5xl">🎹</p>
      <h1 className="text-2xl font-medium tracking-tight">
        Oups, cette page n&apos;existe pas…
      </h1>
      <p className="text-muted-foreground">
        Nous sommes désolés pour ce désagrément ! Notre site est tout récent et
        il peut encore arriver que certaines pages bougent ou soient
        indisponibles par erreur.
      </p>
      <p className="text-muted-foreground">
        Vous pouvez nous aider : si vous arrivez ici en suivant un lien, dites-le
        nous et nous corrigerons rapidement.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Retour à l&apos;accueil
        </Link>
        <a
          href="mailto:contact@propulsounddj.fr?subject=Erreur%20sur%20le%20site%20(404)%20&body=Bonjour%2C%0A%0AEn%20visitant%20le%20site%2C%20j%27ai%20rencontr%C3%A9%20une%20page%20introuvable%20(erreur%20404).%0A%0AAdresse%20de%20la%20page%20%3A%20%0AComment%20j%27y%20suis%20arriv%C3%A9%20%3A%20%0A"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
        >
          ✉ Signaler l&apos;erreur
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        {SITE_URL.replace("https://", "")} — Propul&apos;Sound DJ · Blois (Huisseau-sur-Cosson, 41350)
      </p>
    </main>
  );
}
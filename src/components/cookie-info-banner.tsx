"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Bannière d'INFORMATION (pas de consentement) : le site n'utilise que des
// cookies strictement nécessaires et une audience sans cookie (Vercel
// Analytics), tous exemptés de consentement selon la CNIL. On informe
// discrètement une fois par appareil (localStorage), avec lien vers la
// politique cookies. Si un cookie soumis à consentement était ajouté un
// jour, cette bannière devra devenir un vrai module de consentement.
export function CookieInfoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture du stockage uniquement disponible côté client
      if (!localStorage.getItem("cookie-info-2026")) setVisible(true);
    } catch {
      /* stockage indisponible : on n'affiche rien */
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem("cookie-info-2026", "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-border bg-background/95 p-3 text-xs text-muted-foreground shadow-lg backdrop-blur-md sm:p-4"
    >
      <p className="min-w-0 leading-relaxed">
        Ce site n&apos;utilise que des cookies strictement nécessaires
        (connexion à l&apos;espace client) et une mesure d&apos;audience sans
        cookie.{" "}
        <Link
          href="/politique-cookies"
          className="shrink-0 text-accent underline underline-offset-4"
        >
          En savoir plus
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer l'information sur les cookies"
        className="shrink-0 rounded-full border border-border px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-accent/10 hover:text-accent"
      >
        OK
      </button>
    </div>
  );
}

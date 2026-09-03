"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export function MerciContent({ nom }: { nom?: string }) {
  const [check, setCheck] = useState(false);
  const [ring, setRing] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setRing(true), 100);
    const t2 = setTimeout(() => setCheck(true), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="relative mx-auto flex size-24 items-center justify-center">
        <span
          className={`absolute inset-0 rounded-full border-2 border-emerald-400/60 transition-all duration-700 ${
            ring ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        />
        <span
          className={`absolute inset-0 rounded-full bg-emerald-400/10 transition-all delay-200 duration-700 ${
            ring ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        />
        <span className="text-6xl text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]">
          {check ? "✓" : ""}
        </span>
      </div>

      <h1 className="mt-8 text-3xl font-medium">
        Demande envoyée{nom ? `, ${nom}` : ""} !
      </h1>
      <p className="mt-4 text-muted-foreground">
        Votre demande de devis est bien arrivée. Je vous recontacte dès que
        possible — surveillez vos e-mails (et vos spams, on ne sait jamais !).
      </p>
      <Button className="mt-8" nativeButton={false} render={<Link href="/" />}>
        Retour à l&apos;accueil
      </Button>
    </main>
  );
}

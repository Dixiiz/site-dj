"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

// Sélecteur du périmètre des CA du tableau de bord :
// « tous » = DJ + Menuiserie (même entreprise) · « dj » · « menuiserie ».
// Le choix vit dans l'URL (?ca=…) : recalcul serveur des cartes et du
// graphique, zéro logique dupliquée côté client.
const OPTIONS = [
  { value: "tous", label: "DJ + Menuiserie" },
  { value: "dj", label: "DJ uniquement" },
  { value: "menuiserie", label: "Menuiserie uniquement" },
] as const;

export function CaPerimetreSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const changer = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "tous") params.delete("ca");
    else params.set("ca", v);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div
      className="flex w-fit items-center gap-1 rounded-full border border-border bg-card p-1 text-xs"
      role="group"
      aria-label="Périmètre des chiffres d'affaires"
    >
      {OPTIONS.map((opt) => {
        const actif = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => changer(opt.value)}
            aria-pressed={actif}
            className="relative rounded-full px-3 py-1.5 font-medium transition-colors active:scale-[0.97]"
          >
            {actif ? (
              <motion.span
                layoutId="ca-perimetre-pilule"
                className="absolute inset-0 rounded-full bg-accent"
                transition={{ type: "spring", bounce: 0.25, duration: 0.45 }}
              />
            ) : null}
            <span
              className={`relative z-10 transition-colors ${
                actif ? "text-white" : "text-muted-foreground hover:text-accent"
              }`}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
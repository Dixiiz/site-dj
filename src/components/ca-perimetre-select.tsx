"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

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
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => changer(opt.value)}
          aria-pressed={value === opt.value}
          className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
            value === opt.value
              ? "bg-accent text-white"
              : "text-muted-foreground hover:text-accent"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
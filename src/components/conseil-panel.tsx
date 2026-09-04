"use client";

import { useEffect, useState } from "react";

export type ConseilProgress = {
  documentsSignes: boolean;
  acompteRegie: boolean;
  tempsFortsChoisis: number;
  tempsFortsTotal: number;
  danceCount: number;
  blacklistCount: number;
  timelineRenseignee: number;
  rdvPris: boolean;
};

type ConseilItem = {
  done: boolean | null;
  label: string;
  tip: string;
};

// « Conseil de jeu » : panneau latéral gauche (miroir discret de la
// timeline). Coche les grandes étapes de la préparation et donne les bons
// réflexes — ouvert/fermé au clic, sans jamais bloquer la navigation.
export function ConseilPanel({
  progress,
}: {
  progress: ConseilProgress;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 640px)");
    const apply = () => {
      document.body.style.paddingLeft = mounted && open && wide.matches ? "21rem" : "";
    };
    apply();
    wide.addEventListener("change", apply);
    return () => {
      wide.removeEventListener("change", apply);
      document.body.style.paddingLeft = "";
    };
  }, [mounted, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const items: ConseilItem[] = [
    {
      done: progress.documentsSignes,
      label: "Signe le devis et le contrat",
      tip: "C'est la signature qui réserve ta date et débloque ta playlist.",
    },
    {
      done: progress.acompteRegie,
      label: "Règle l'acompte de réservation",
      tip: "Depuis ton espace : virement, puis « J'ai envoyé l'acompte ».",
    },
    {
      done:
        progress.tempsFortsChoisis >= progress.tempsFortsTotal &&
        progress.tempsFortsTotal > 0,
      label: `Choisis les musiques des temps forts (${progress.tempsFortsChoisis}/${progress.tempsFortsTotal})`,
      tip: "Cérémonie, entrée, ouverture de bal… ce sont LES moments qui comptent.",
    },
    {
      done: progress.danceCount >= 15,
      label: `Garnis la piste de danse (${progress.danceCount}/30)`,
      tip: "Vise 15 à 30 titres : c'est ta soirée, la playlist doit te ressembler.",
    },
    {
      done: progress.blacklistCount > 0 ? null : false,
      label: "Blackliste ce que tu ne veux PAS entendre",
      tip: "Un titre que tu ne supportes plus ? Interdis-le avant la soirée.",
    },
    {
      done: progress.timelineRenseignee > 0,
      label: "Renseigne la timeline (horaires)",
      tip: "Panneau « Timeline » à droite : cocktail 19h, dessert 22h… la musique se cale dessus.",
    },
    {
      done: progress.rdvPris,
      label: "Prends ton point téléphonique",
      tip: "5 minutes au téléphone = une soirée réglée au millimètre.",
    },
  ];

  const doneCount = items.filter((i) => i.done === true).length;

  return (
    <>
      {/* Poignée fixe sur le bord gauche */}
      <button
        type="button"
        onClick={() => {
          setMounted(true);
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="fixed left-0 top-1/2 z-40 -translate-y-1/2 rounded-r-lg border border-l-0 border-border bg-background/95 px-1.5 py-4 text-[11px] font-medium tracking-wide text-foreground/70 shadow-md backdrop-blur transition-colors hover:text-accent"
        style={{ writingMode: "vertical-rl" }}
      >
        {open ? "Fermer" : "Conseil de jeu"}
      </button>

      {/* Panneau coulissant depuis la gauche */}
      <aside
        aria-hidden={!open}
        className={`fixed left-0 top-0 z-40 flex h-full w-[21rem] max-w-[92vw] flex-col border-r border-border bg-background shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ visibility: mounted ? "visible" : "hidden" }}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer le conseil de jeu"
          className="group absolute inset-y-0 right-0 flex w-4 cursor-e-resize items-center justify-center transition-colors hover:bg-accent/10"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="text-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-medium">Conseil de jeu</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ta préparation, étape par étape.
            </p>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {doneCount}/{items.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ul className="space-y-4">
            {items.map((item, i) => (
              <li
                key={item.label}
                className="conseil-row flex items-start gap-3"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    item.done === true
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-border text-muted-foreground"
                  }`}
                  aria-hidden
                >
                  {item.done === true ? "✓" : ""}
                </span>
                <div>
                  <p
                    className={`text-sm ${
                      item.done === true
                        ? "text-muted-foreground line-through"
                        : "font-medium"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.tip}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
          Une question ? Écris via la messagerie ou réponds à tes e-mails.
        </div>
      </aside>
    </>
  );
}

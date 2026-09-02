"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FadeIn } from "@/components/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatEuros } from "@/lib/money";

type Pack = {
  name: string;
  price: number; // centimes
  highlight?: "populaire" | "show";
  equipment: string[];
  image: string; // aperçu scénographie (remplaçable via public/images/packs/)
  baseMinutes: number; // durée de prestation incluse dans le prix de base
  extraRateCents: number; // tarif horaire au-delà de la base
  defaultStart: string;
  defaultEnd: string;
};

type Category = {
  id: string;
  label: string;
  intro: string;
  image: string;
  baseNote: string;
  extraHourLabel: string;
  common: string[];
  packs: Pack[];
};

const CATEGORIES: Category[] = [
  {
    id: "anniversaire",
    label: "Anniversaires & Soirées privées",
    image: "/galerie/1.jpg",
    intro:
      "Une soirée clé en main chez vous ou en salle : installation, mix et lumière synchronisée pendant toute la durée de votre événement.",
    baseNote: "Base : minimum 6 h de mix + forfait installation 100 € (base fixe 580 €).",
    extraHourLabel: "Heure supplémentaire : 80 €/h",
    common: [
      "Sono Audiophony Modjo2000 (jusqu'à 250 personnes)",
      "Éclairage 100 % synchronisé en temps réel avec la musique",
    ],
    packs: [
      {
        name: "Pack Standard",
        price: 58000,
        image: "/galerie/5.jpg",
        baseMinutes: 360,
        extraRateCents: 8000,
        defaultStart: "20:00",
        defaultEnd: "02:00",
        equipment: [
          "2 Lyres Beam (monotubes)",
          "2 Bars LED",
          "2 Machines à fumée effet Geyser",
        ],
      },
      {
        name: "Pack Premium",
        price: 68000,
        highlight: "populaire",
        image: "/galerie/4.jpg",
        baseMinutes: 360,
        extraRateCents: 8000,
        defaultStart: "20:00",
        defaultEnd: "02:00",
        equipment: [
          "4 Lyres Beam",
          "4 Bars LED",
          "2 Machines à fumée effet Geyser",
          "8 PAR LED (déco d'ambiance salle)",
        ],
      },
    ],
  },
  {
    id: "mariage",
    label: "Mariages & Grandes Réceptions",
    image: "/galerie/2.jpg",
    intro:
      "De la première danse au bout de la nuit : un dispositif son & lumière à la hauteur de votre plus beau jour.",
    baseNote: "Base : minimum 8 h de mix + forfait installation 100 € (base fixe 1 060 €).",
    extraHourLabel: "Heure sup. / Prolongation / Cérémonie laïque : 120 €/h",
    common: [
      "Sono Audiophony Modjo2000",
      "Éclairage 100 % synchronisé en temps réel avec la musique",
    ],
    packs: [
      {
        name: "Pack Essential",
        price: 106000,
        image: "/galerie/gwendoline-remi-soiree-et-diner-210625-13.jpg",
        baseMinutes: 480,
        extraRateCents: 12000,
        defaultStart: "20:00",
        defaultEnd: "04:00",
        equipment: [
          "2 Lyres Beam (monotubes)",
          "2 Bars LED",
          "2 Machines à fumée effet Geyser",
        ],
      },
      {
        name: "Pack Deluxe",
        price: 116000,
        highlight: "populaire",
        image: "/galerie/leanivet-clemence-neal-810.jpg",
        baseMinutes: 480,
        extraRateCents: 12000,
        defaultStart: "20:00",
        defaultEnd: "04:00",
        equipment: [
          "4 Lyres Beam",
          "4 Bars LED",
          "2 Machines à fumée effet Geyser",
          "8 PAR LED (déco d'ambiance salle)",
        ],
      },
      {
        name: "Pack L'Ultime Show",
        price: 121000,
        highlight: "show",
        image: "/galerie/manolieraphael-0910.jpg",
        baseMinutes: 480,
        extraRateCents: 12000,
        defaultStart: "20:00",
        defaultEnd: "04:00",
        equipment: [
          "6 Lyres Beam",
          "2 Lyres Spot",
          "4 Bars LED",
          "2 Machines à fumée effet Geyser",
          "8 PAR LED (déco d'ambiance salle)",
        ],
      },
    ],
  },
  {
    id: "pro",
    label: "Bars, Clubs & Soirées Pro",
    image: "/galerie/3.jpg",
    intro:
      "Vous disposez déjà du son ou d'une scène ? De la simple prestation DJ à la formule clé en main complète, choisissez le niveau d'accompagnement.",
    baseNote: "Trois formats au choix selon votre lieu et vos équipements.",
    extraHourLabel: "Heure supplémentaire : dès 55 €/h selon formule",
    common: [
      "Régie DJ professionnelle",
      "Éclairage synchronisé (formules clé en main)",
    ],
    packs: [
      {
        name: "Set DJ (matériel & son sur place)",
        price: 11000,
        image: "/galerie/4.jpg",
        baseMinutes: 120,
        extraRateCents: 5500,
        defaultStart: "20:00",
        defaultEnd: "22:00",
        equipment: [
          "Minimum 2 h de mix (55 €/h)",
          "Platines DJ + ordinateur portable",
          "Heure supplémentaire : 55 €/h",
        ],
      },
      {
        name: "Clé en main Standard",
        price: 37000,
        image: "/galerie/jeannebastien-1367.jpg",
        baseMinutes: 180,
        extraRateCents: 9000,
        defaultStart: "20:00",
        defaultEnd: "23:00",
        equipment: [
          "Minimum 3 h de mix (90 €/h) + installation 100 €",
          "Régie DJ + Sono Audiophony Modjo2000",
          "2 Lyres Beam + 2 Bars LED + 4 PAR LED",
          "Heure supplémentaire : 90 €/h",
        ],
      },
      {
        name: "Clé en main Premium",
        price: 47000,
        highlight: "show",
        image: "/galerie/jeannebastien-1328.jpg",
        baseMinutes: 180,
        extraRateCents: 9000,
        defaultStart: "20:00",
        defaultEnd: "23:00",
        equipment: [
          "Minimum 3 h de mix (90 €/h) + installation 100 €",
          "Régie DJ + Sono Audiophony Modjo2000",
          "4 Lyres Beam + 2 Bars LED + 8 PAR LED",
          "2 Machines à fumée",
          "Heure supplémentaire : 90 €/h",
        ],
      },
    ],
  },
];

// Correspondance entre les cartes Options FX et les noms des options du devis.
const OPTION_TO_FORM: Record<string, string> = {
  "Nuage de fumée lourde": "Machine à fumée lourde",
  "Étincelles froides": "2 machines à étincelles froides",
  "Pistolet à fumée effet CO2": "Pistolet à fumée effet CO2 (à l'unité)",
};

const FX_OPTIONS = [
  {
    name: "Nuage de fumée lourde",
    detail: "Heavyfog 2000p — tapis de fumée au sol, idéal ouverture de bal.",
    price: 15000,
    badge: "Idéal ouverture de bal",
    image: "/images/fx/fumee.jpg",
    video: "/videos/fx/fumee.mp4",
  },
  {
    name: "Étincelles froides",
    detail: "Pack de 2 machines, gerbes jusqu'à 5 m — inodore et sécurisé.",
    price: 15000,
    badge: "Inodore & sécurisé",
    image: "/images/fx/etincelles.jpg",
    video: "/videos/fx/etincelles.mp4",
  },
  {
    name: "Pistolet à fumée effet CO2",
    detail: "Jet de fumée glacée jusqu'à 9 mètres — pour vos plus belles entrées en salle ou vos plus beaux shows.",
    price: 7500,
    badge: "Prix promo : au lieu de 150 €",
    image: "/images/fx/co2.jpg",
    video: "/videos/fx/co2.mp4",
  },
] satisfies {
  name: string;
  detail: string;
  price: number;
  badge: string;
  image: string;
  video?: string;
}[];

// Vulgarisation : bénéfice client associé à chaque matériel technique.
const EXPLANATIONS: [RegExp, string][] = [
  [/lyres beam/i, "Jets de lumière puissants et dynamiques style club/discothèque"],
  [/lyres spot/i, "Projection de motifs lumineux et effets d'impact au sol/plafond"],
  [/bars led/i, "Éclairage d'ambiance dynamique pour le dancefloor"],
  [/par led/i, "Projecteurs autonomes pour illuminer et colorer les murs de votre salle"],
  [/geyser|fumée/i, "Colonnes de fumée verticales éclairées pour marquer les climax"],
  [/sono audiophony/i, "Système son haute définition puissant et cristallin (jusqu'à 250 personnes)"],
  [/synchronisé/i, "Toutes les lumières pilotées en temps réel pour coller au rythme de la musique"],
  [/platines|régie dj/i, "Le poste de mixage professionnel, au standard des clubs"],
];

function explain(item: string) {
  return EXPLANATIONS.find(([pattern]) => pattern.test(item))?.[1];
}

function EquipmentLine({ item }: { item: string }) {
  // Met en évidence les quantités d'éclairage pour comparer d'un coup d'œil.
  const match = item.match(/(\d+)\s+(Lyres|Bars|PAR|Machines)/);
  const benefit = explain(item);
  return (
    <li className="flex items-start gap-2">
      {match ? (
        <span className="mt-0.5 inline-flex min-w-12 shrink-0 justify-center rounded-md bg-accent/15 px-1.5 py-0.5 text-xs font-semibold text-accent">
          {match[1]}×
        </span>
      ) : (
        <span className="mt-0.5 shrink-0 text-accent">✓</span>
      )}
      <span>
        <span className="text-sm text-foreground/90">{item}</span>
        {benefit ? (
          <span className="block text-xs leading-snug text-muted-foreground">{benefit}</span>
        ) : null}
      </span>
    </li>
  );
}

function PackCard({
  pack,
  selected,
  onSelect,
  previousEquipment,
}: {
  pack: Pack;
  selected: boolean;
  onSelect: () => void;
  previousEquipment: string[] | null;
}) {
  return (
    <Card
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`group relative flex cursor-pointer flex-col overflow-hidden transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-accent ${
        selected
          ? "scale-[1.03] border-accent shadow-[0_0_60px_-5px] shadow-accent/70 ring-2 ring-accent"
          : pack.highlight
            ? "border-accent/60 shadow-[0_0_35px_-10px] shadow-accent/40"
            : "border-white/10 hover:border-accent/40"
      }`}
    >
      {selected ? (
        <span className="absolute top-12 left-1/2 z-10 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-background">
          ✓ Ajouté au devis
        </span>
      ) : pack.highlight ? (
        <span className="absolute top-12 left-1/2 z-10 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-background">
          {pack.highlight === "show" ? "Show complet" : "Le plus populaire"}
        </span>
      ) : null}

      {/* Aperçu scénographie : bandeau photo en tête de carte */}
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={pack.image}
          alt={`Scénographie du ${pack.name}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        {selected ? (
          <span className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-background">
            ✓ Ajouté au devis
          </span>
        ) : pack.highlight ? (
          <span className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-background">
            {pack.highlight === "show" ? "Show complet" : "Le plus populaire"}
          </span>
        ) : null}
      </div>
      <CardHeader>
        <CardTitle className="text-lg">{pack.name}</CardTitle>
        <p className="mt-1 text-3xl font-semibold text-glow">
          {formatEuros(pack.price)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {Math.round(pack.baseMinutes / 60)} h minimum incluses
          {/mariage|essential|deluxe|ultime/i.test(pack.name)
            ? " — début avant 18 h : cérémonie laïque et cocktail inclus"
            : ""}
          .
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <ul className="flex-1 space-y-2.5">
          {pack.equipment.map((item) => (
            <EquipmentLine key={item} item={item} />
          ))}
        </ul>
        {previousEquipment ? (
          <p className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
            En plus du pack précédent :
            {pack.equipment
              .filter((item) => !previousEquipment.includes(item))
              .map((item) => (
                <span key={item} className="ml-1 font-medium">
                  {" "}+ {item}
                </span>
              ))}
          </p>
        ) : null}
        <p
          className={`mt-5 text-center text-sm font-medium ${
            selected ? "text-accent" : "text-muted-foreground"
          }`}
        >
          {selected ? "✓ Ajouté au devis — continuez ci-dessous" : "Cliquer pour sélectionner ce pack"}
        </p>
      </CardContent>
    </Card>
  );
}

export const ADMIN_PACK_LIST = CATEGORIES.flatMap((category) =>
  category.packs.map((pack) => ({ id: pack.name, name: pack.name, price: pack.price })),
);

export const ADMIN_FX_OPTIONS = FX_OPTIONS.map((option) => ({
  name: option.name,
  price: option.price,
}));

export function PricingSection() {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [selectedFx, setSelectedFx] = useState<string[]>([]);
  const [co2Qty, setCo2Qty] = useState<1 | 2>(1);
  const active = CATEGORIES.find((c) => c.id === categoryId) ?? null;

  function choosePack(pack: Pack) {
    setSelectedPack(pack.name);
    window.dispatchEvent(
      new CustomEvent("propul:select-pack", {
        detail: {
          pack: pack.name,
          priceCents: pack.price,
          baseMinutes: pack.baseMinutes,
          extraRateCents: pack.extraRateCents,
          defaultStart: pack.defaultStart,
          defaultEnd: pack.defaultEnd,
        },
      })
    );
  }

  // Synchronise la surbrillance des cartes FX avec les options cochées dans le formulaire.
  useEffect(() => {
    function onOptionsChanged(event: Event) {
      const names = (event as CustomEvent<{ names?: string[] }>).detail?.names;
      if (!Array.isArray(names)) return;
      const fxNames = new Set(
        Object.entries(OPTION_TO_FORM)
          .filter(([, formName]) => names.includes(formName))
          .map(([fxName]) => fxName)
      );
      setSelectedFx((current) => {
        const next = FX_OPTIONS.map((o) => o.name).filter((n) => fxNames.has(n));
        return next.length === current.length && next.every((n) => current.includes(n))
          ? current
          : next;
      });
    }
    window.addEventListener("propul:options-changed", onOptionsChanged);
    return () => window.removeEventListener("propul:options-changed", onOptionsChanged);
  }, []);

  function toggleFx(optionName: string, qty?: number) {
    window.dispatchEvent(
      new CustomEvent("propul:toggle-option", {
        detail: { name: OPTION_TO_FORM[optionName] ?? optionName, qty },
      })
    );
  }

  return (
    <FadeIn as="section" className="mt-20" y={32}>
      <div id="formules-tarifs" className="scroll-mt-24" />
      <p className="text-sm tracking-[0.2em] text-accent uppercase">Tarifs</p>
      <h2 className="mt-2 text-3xl font-medium tracking-tight text-glow sm:text-4xl">
        Nos Formules &amp; Tarifs
      </h2>

      {/* Étape 1 : les grandes catégories */}
      {!active ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className="group glow-hover relative h-56 overflow-hidden rounded-2xl border border-white/10 text-left transition-colors hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Image
                src={category.image}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
              <span className="absolute inset-x-0 bottom-0 p-4">
                <span className="block text-lg font-medium text-glow">
                  {category.label}
                </span>
                <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                  {category.intro}
                </span>
                <span className="mt-2 inline-block text-sm font-medium text-accent">
                  Voir les packs →
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        /* Étape 2 : catégories réduites + packs, avec glissement animé */
        <div
          key="packs-step"
          className="mt-8 animate-in fade-in slide-in-from-right-8 duration-500"
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCategoryId(null)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
            >
              ← Catégories
            </button>
            {CATEGORIES.map((category) => {
              const selected = category.id === active.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  aria-pressed={selected}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                    selected
                      ? "border-accent/60 bg-accent/15 text-foreground"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-accent/30 hover:text-foreground"
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>

          {/* Panneau packs (re-anime à chaque changement de catégorie) */}
          <div key={active.id} className="animate-in fade-in slide-in-from-right-8 duration-500">
            <p className="mt-4 text-sm text-muted-foreground">{active.intro}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Les packs se différencient principalement par leurs{" "}
              <span className="text-foreground">jeux de lumières</span> : plus vous montez en
              gamme, plus la scénographie est riche (nombre de lyres, PAR LED, effets).
            </p>
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
              <Badge className="w-fit bg-accent/15 text-accent hover:bg-accent/15">
                ⚡ Éclairage 100 % synchronisé en temps réel
              </Badge>
              <p className="text-sm text-muted-foreground">
                {active.baseNote}{" "}
                <span className="text-foreground">{active.extraHourLabel}</span>
              </p>
            </div>

            <div
              className={`mt-6 grid gap-5 ${
                active.packs.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"
              }`}
            >
              {active.packs.map((pack, index) => (
                <PackCard
                  key={pack.name}
                  pack={pack}
                  selected={selectedPack === pack.name}
                  onSelect={() => choosePack(pack)}
                  previousEquipment={index > 0 ? active.packs[index - 1].equipment : null}
                />
              ))}
            </div>

            <p className="mt-5 text-sm text-muted-foreground">
              Inclus dans toutes les formules :{" "}
              {active.common.map((item) => (
                <span key={item} className="mr-3 inline-block">
                  ✓ {item}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* Options FX */}
      <h3 className="mt-14 text-xl font-medium">Options FX — Effets spéciaux</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Ajoutez des effets spectaculaires à votre formule, sélectionnables dans le
        devis ci-dessous.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {FX_OPTIONS.map((option) => {
          const fxSelected = selectedFx.includes(option.name);
          return (
            <Card
              key={option.name}
              onClick={() => toggleFx(option.name)}
              role="button"
              tabIndex={0}
              aria-pressed={fxSelected}
              onMouseEnter={(event) => {
                (
                  event.currentTarget.querySelector(
                    "video[data-fx-video]"
                  ) as HTMLVideoElement | null
                )
                  ?.play()
                  .catch(() => {});
              }}
              onMouseLeave={(event) => {
                const video = event.currentTarget.querySelector(
                  "video[data-fx-video]"
                ) as HTMLVideoElement | null;
                if (video) video.pause();
              }}
              onTouchStart={(event) => {
                (
                  event.currentTarget.querySelector(
                    "video[data-fx-video]"
                  ) as HTMLVideoElement | null
                )
                  ?.play()
                  .catch(() => {});
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleFx(option.name);
                }
              }}
              className={`group relative cursor-pointer overflow-hidden transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-accent ${
                fxSelected
                  ? "scale-[1.03] border-accent shadow-[0_0_60px_-5px] shadow-accent/70 ring-2 ring-accent"
                  : "border-white/10 hover:border-accent/40"
              }`}
            >
            {/* Aperçu en fond, fané derrière le texte — vidéo au survol, sinon image */}
            {option.video ? (
              <video
                src={option.video}
                poster={option.image}
                muted
                loop
                playsInline
                preload="metadata"
                ref={(el) => {
                  if (!el) return;
                  el.dataset.fxVideo = "1";
                }}
                className="absolute inset-0 h-full w-full object-cover opacity-15 transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-50"
                style={fxSelected ? { opacity: 0.4 } : undefined}
              />
            ) : (
              <Image
                src={option.image}
                alt={`Aperçu : ${option.name}`}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className={`object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
                  fxSelected ? "opacity-40" : "opacity-15 group-hover:opacity-50"
                }`}
              />
            )}
            <span className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90 transition-opacity duration-700 group-hover:opacity-40" />
            <CardHeader className="relative">
              <CardTitle className="text-base">{option.name}</CardTitle>
              <CardDescription className="text-sm">{option.detail}</CardDescription>
            </CardHeader>
            <CardContent className="relative flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-semibold">
                  {formatEuros(option.price)}
                  {/co2/i.test(option.name) ? (
                    <span className="text-sm text-muted-foreground"> / unité</span>
                  ) : null}
                </p>
                <p className="text-xs text-accent">{option.badge}</p>
                {/co2/i.test(option.name) && fxSelected ? (
                  <div
                    className="mt-2 flex items-center gap-2"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <label className="text-xs text-muted-foreground">Quantité :</label>
                    <select
                      value={co2Qty}
                      onChange={(event) => {
                        const qty = Number(event.target.value) === 2 ? 2 : 1;
                        setCo2Qty(qty);
                        // Sélection déjà cochée : on met juste à jour la quantité.
                        window.dispatchEvent(
                          new CustomEvent("propul:toggle-option", {
                            detail: {
                              name: OPTION_TO_FORM[option.name] ?? option.name,
                              qty,
                            },
                          })
                        );
                      }}
                      className="rounded-md border border-white/10 bg-background px-2 py-1 text-xs"
                    >
                      <option value={1}>1 pistolet</option>
                      <option value={2}>2 pistolets</option>
                    </select>
                  </div>
                ) : null}
              </div>
              <Button
                variant={fxSelected ? "default" : "outline"}
                size="sm"
                tabIndex={-1}
                className="pointer-events-none"
              >
                {fxSelected ? "✓ Ajoutée au devis" : "Ajouter au devis"}
              </Button>
            </CardContent>
            </Card>
          );
        })}
      </div>
    </FadeIn>
  );
}



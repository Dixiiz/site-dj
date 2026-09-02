"use client";

import { useState } from "react";
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
};

type Category = {
  id: string;
  label: string;
  intro: string;
  baseNote: string;
  extraHourLabel: string;
  common: string[];
  packs: Pack[];
};

const CATEGORIES: Category[] = [
  {
    id: "anniversaire",
    label: "Anniversaires & Soirées privées",
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
        equipment: [
          "Minimum 2 h de mix (55 €/h)",
          "Platines DJ + ordinateur portable",
          "Heure supplémentaire : 55 €/h",
        ],
      },
      {
        name: "Clé en main Standard",
        price: 37000,
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

const FX_OPTIONS = [
  {
    name: "Nuage de fumée lourde",
    detail: "Heavyfog 2000p — tapis de fumée au sol, idéal ouverture de bal.",
    price: 15000,
    badge: "Idéal ouverture de bal",
  },
  {
    name: "Étincelles froides",
    detail: "Pack de 2 machines, gerbes jusqu'à 5 m — inodore et sécurisé.",
    price: 15000,
    badge: "Inodore & sécurisé",
  },
  {
    name: "Pistolet à fumée effet CO2",
    detail: "Gun CO2 — jet de fumée glacée qui explose sur les beats.",
    price: 7500,
    badge: "Prix promo : au lieu de 150 €",
  },
];

function EquipmentLine({ item }: { item: string }) {
  // Met en évidence les quantités d'éclairage pour comparer d'un coup d'œil.
  const match = item.match(/^(\d+)\s+(Lyres|Bars|PAR|Machines)/);
  return (
    <li className="flex items-start gap-2">
      {match ? (
        <span className="mt-0.5 inline-flex min-w-12 justify-center rounded-md bg-accent/15 px-1.5 py-0.5 text-xs font-semibold text-accent">
          {match[1]}×
        </span>
      ) : (
        <span className="mt-0.5 text-accent">✓</span>
      )}
      <span className="text-sm text-muted-foreground">{item}</span>
    </li>
  );
}

export function PricingSection() {
  const [activeId, setActiveId] = useState(CATEGORIES[0].id);
  const active = CATEGORIES.find((c) => c.id === activeId) ?? CATEGORIES[0];

  return (
    <FadeIn as="section" className="mt-20" y={32}>
      <p className="text-sm tracking-[0.2em] text-accent uppercase">Tarifs</p>
      <h2 className="mt-2 text-3xl font-medium tracking-tight text-glow sm:text-4xl">
        Nos Formules &amp; Tarifs
      </h2>

      {/* Onglets */}
      <div
        role="tablist"
        aria-label="Catégories d'événements"
        className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-3"
      >
        {CATEGORIES.map((category) => {
          const selected = category.id === activeId;
          return (
            <button
              key={category.id}
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${category.id}`}
              id={`tab-${category.id}`}
              onClick={() => setActiveId(category.id)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
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

      {/* Panneau actif */}
      <div
        role="tabpanel"
        id={`panel-${active.id}`}
        aria-labelledby={`tab-${active.id}`}
        className="mt-8"
      >
        <p className="text-sm text-muted-foreground">{active.intro}</p>
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
            <Card
              key={pack.name}
              className={`relative flex flex-col ${
                pack.highlight
                  ? "border-accent/60 shadow-[0_0_35px_-10px] shadow-accent/40"
                  : "border-white/10"
              }`}
            >
              {pack.highlight ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-background">
                  {pack.highlight === "show" ? "Show complet" : "Le plus populaire"}
                </span>
              ) : null}
              <CardHeader>
                <CardTitle className="text-lg">{pack.name}</CardTitle>
                <p className="mt-1 text-3xl font-semibold text-glow">
                  {formatEuros(pack.price)}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="flex-1 space-y-2.5">
                  {pack.equipment.map((item) => (
                    <EquipmentLine key={item} item={item} />
                  ))}
                </ul>
                {index > 0 ? (
                  <p className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
                    En plus du pack précédent :
                    {pack.equipment
                      .filter(
                        (item) => !active.packs[index - 1].equipment.includes(item)
                      )
                      .map((item) => (
                        <span key={item} className="ml-1 font-medium">
                          {" "}+ {item}
                        </span>
                      ))}
                  </p>
                ) : null}
              </CardContent>
            </Card>
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

      {/* Options FX */}
      <h3 className="mt-14 text-xl font-medium">Options FX — Effets spéciaux</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Ajoutez des effets spectaculaires à votre formule, sélectionnables dans le
        devis ci-dessous.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {FX_OPTIONS.map((option) => (
          <Card key={option.name} className="border-white/10">
            <CardHeader>
              <CardTitle className="text-base">{option.name}</CardTitle>
              <CardDescription className="text-sm">{option.detail}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-semibold">{formatEuros(option.price)}</p>
                <p className="text-xs text-accent">{option.badge}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  document
                    .getElementById("formulaire-devis")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Ajouter au devis
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conditions & déplacements */}
      <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground">
        <h3 className="font-medium text-foreground">Déplacements</h3>
        <p className="mt-1">
          30 km offerts autour du siège. Au-delà : 0,80 €/km (aller-retour),
          calculés automatiquement dans le devis. Péages en sus au réel.
        </p>
      </div>
    </FadeIn>
  );
}



// ---------- Montée en gamme (upsell) ----------
// Table partagée : pack d'entrée → pack supérieur à proposer, avec les
// arguments commerciaux. Utilisée par :
//  - l'encart « montée en gamme » des cartes packs (pricing-section.tsx)
//  - l'e-mail « Proposer une montée en gamme » de l'admin (client-actions.ts)
// Les regex testent le nom de formule stocké en base (ex : « Pack Mariage
// Essential », « Pack Standard », « Clé en main Standard ») — d'où une
// correspondance souple, sans ancrage sur un libellé exact.

export type Upsell = {
  /** Reconnaît la formule du devis (nom souple : « Pack Mariage Essential »…). */
  from: RegExp;
  /** Nom exact du pack cible (identique à CATEGORIES → packs → name). */
  to: string;
  /** Arguments du pack cible (HTML simple autorisé : <strong>, <em>). */
  benefits: string[];
};

export const UPSELLS: Upsell[] = [
  {
    from: /essential/i,
    to: "Pack Deluxe",
    benefits: [
      "<strong>4 lyres Beam</strong> au lieu de 2 : des jets de lumière plus denses et plus dynamiques, style club/discothèque",
      "<strong>4 bars LED</strong> au lieu de 2 : un dancefloor bien plus généreux",
      "<strong>8 PAR LED</strong> en plus : les murs de votre salle prennent des couleurs toute la soirée",
    ],
  },
  {
    from: /pack standard/i,
    to: "Pack Premium",
    benefits: [
      "<strong>4 lyres Beam</strong> au lieu de 2 et <strong>4 bars LED</strong> au lieu de 2",
      "<strong>8 PAR LED</strong> en plus : les murs de votre salle illuminés et colorés",
    ],
  },
  {
    from: /clé en main standard/i,
    to: "Clé en main Premium",
    benefits: [
      "<strong>4 lyres Beam</strong> + <strong>8 PAR LED</strong> : dispositif renforcé",
      "<strong>2 machines à fumée</strong> pour marquer les temps forts",
    ],
  },
];

/** Pack supérieur à proposer pour une formule donnée (null si aucun). */
export function findUpsell(formulaName: string | null | undefined): Upsell | null {
  if (!formulaName) return null;
  return UPSELLS.find((u) => u.from.test(formulaName)) ?? null;
}

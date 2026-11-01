// Modèle du devis PDF généré automatiquement.
// Modifiez les valeurs ci-dessous pour personnaliser l'apparence du devis.
// Ces valeurs servent de valeurs par défaut ; elles sont aussi modifiables
// au cas par cas depuis l'admin, juste avant de générer le PDF.

export type DevisTemplate = {
  /** Titre principal en haut du document */
  title: string;
  /** Sous-titre (activité + ville) */
  subtitle: string;
  /** Couleur d'accent (RVB 0-1) pour le titre et le total */
  accent: { r: number; g: number; b: number };
  /** Texte de conditions affiché avant la signature */
  conditions: string;
  /** Validité du devis en jours */
  validityDays: number;
  /** Mention sous la ligne de signature */
  signatureNote: string;
};

export const DEVIS_TEMPLATE: DevisTemplate = {
  title: "DEVIS — Propul'Sound DJ",
  subtitle: "DJ & Show Lumière — Huisseau-sur-Cosson (41350)",
  accent: { r: 0.05, g: 0.35, b: 0.7 },
  conditions: "Devis valable 15 jours.",
  validityDays: 15,
  signatureNote:
 "Signature du client — approuver le document dans l'espace client",
};

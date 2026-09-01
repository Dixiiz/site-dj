// Règles horaires des prestations.
// Départ : 14 h (mariage) / 17 h (autres), dernier départ 20 h. Fin incluse dans le forfait :
//   - anniversaire : jusqu'à 03:00
//   - mariage : jusqu'à 04:00
// Au-delà : chaque heure entamée est facturée EXTRA_HOUR_RATE_CENTS.
export const EXTRA_HOUR_RATE_CENTS = 12000; // 120,00 €/h
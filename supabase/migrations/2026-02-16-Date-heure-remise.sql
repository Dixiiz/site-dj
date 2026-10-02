-- ============================================================
-- MODULE MENUISERIE : tables clients + documents (devis/factures)
-- À exécuter dans le SQL Editor de Supabase.
-- ============================================================

-- Clients du domaine menuiserie
CREATE TABLE IF NOT EXISTS menuiserie_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  adresse TEXT NOT NULL,
  code_postal TEXT NOT NULL,
  ville TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (devis ou facture) du domaine menuiserie
CREATE TABLE IF NOT EXISTS menuiserie_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('devis', 'facture')),
  numero TEXT NOT NULL UNIQUE,
  client_nom TEXT NOT NULL,
  client_adresse TEXT NOT NULL,
  client_cp TEXT NOT NULL,
  client_ville TEXT NOT NULL,
  client_email TEXT NOT NULL DEFAULT '',
  date_edition DATE NOT NULL DEFAULT CURRENT_DATE,
  date_validite DATE DEFAULT NULL,
  -- lignes : [{ designation, quantite, prixUnitaire }]
  lignes JSONB NOT NULL DEFAULT '[]',
  total_cents INTEGER NOT NULL DEFAULT 0,
  -- brouillon | envoye | accepte | refuse | paye
  statut TEXT NOT NULL DEFAULT 'brouillon',
  -- lien optionnel entre un devis et sa facture (et inversement)
  devis_source UUID REFERENCES menuiserie_docs(id) DEFAULT NULL,
  facture_lien UUID REFERENCES menuiserie_docs(id) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menuiserie_docs_type ON menuiserie_docs (type);
CREATE INDEX IF NOT EXISTS idx_menuiserie_docs_statut ON menuiserie_docs (statut);

-- Colonne ajoutée après coup : téléphone du client sur le document
-- (idempotent : sans effet si la table vient d'être créée avec la colonne).
ALTER TABLE menuiserie_docs ADD COLUMN IF NOT EXISTS client_telephone TEXT NOT NULL DEFAULT '';

-- ============================================================
-- FIN MIGRATION MENUISERIE
-- ============================================================
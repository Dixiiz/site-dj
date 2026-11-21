-- ============================================================
-- Comptes rendus d'appel téléphonique (admin → devis)
-- À exécuter dans le SQL Editor de Supabase.
-- ============================================================
-- L'admin note chaque appel avec le client (structuré : récit, points
-- clés, prochaines étapes). Les comptes rendus « visibles client »
-- apparaissent dans l'espace client et sur la fiche soirée PDF.
-- RLS activée SANS policy : seul le serveur (service_role) accède à la
-- table, l'appartenance du devis est vérifiée côté serveur (getMyQuote).

CREATE TABLE IF NOT EXISTS call_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contact TEXT,
  summary TEXT NOT NULL,
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  visible_to_client BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_reports_quote
  ON call_reports (quote_id, called_at DESC);

ALTER TABLE call_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FIN MIGRATION
-- ============================================================
-- ============================================================
-- Devis : suivi de lecture admin des nouveautés (message, musique…)
-- À exécuter dans le SQL Editor de Supabase.
-- ============================================================

-- Date de la dernière consultation admin du devis : permet de retrouver
-- précisément les messages/musiques créés DEPUIS cette date, pour les mettre
-- en surbrillance automatiquement à l'ouverture du devis.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS admin_last_seen_at TIMESTAMPTZ;

-- Backfill : tout ce qui existait avant cette fonctionnalité est considéré
-- comme déjà vu (la pastille « nouveautés » existante reste gérée par
-- has_unread_updates).
UPDATE quotes SET admin_last_seen_at = NOW() WHERE admin_last_seen_at IS NULL;

-- ============================================================
-- FIN MIGRATION
-- ============================================================
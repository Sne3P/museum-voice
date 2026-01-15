-- ===============================
-- MIGRATION 001: Ajouter table museum_entrances
-- Date: 2026-01-15
-- Description: Ajout des points d'entrée du musée sur les plans
-- ===============================

-- Créer la table seulement si elle n'existe pas (sécurité)
CREATE TABLE IF NOT EXISTS museum_entrances (
    entrance_id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES plans(plan_id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Entrée principale',
    x NUMERIC(10, 2) NOT NULL,
    y NUMERIC(10, 2) NOT NULL,
    icon TEXT DEFAULT 'door-open',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide par plan (seulement si n'existe pas)
CREATE INDEX IF NOT EXISTS idx_entrances_plan_id ON museum_entrances(plan_id);

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Migration 001 appliquée avec succès - Table museum_entrances créée';
END $$;

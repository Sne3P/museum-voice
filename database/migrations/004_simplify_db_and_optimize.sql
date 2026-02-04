-- Migration 004: Simplification DB et optimisations
-- Date: 2026-02-04
-- Description: 
--   - Simplifier musee_id (1 app Docker = 1 musée)
--   - Ajouter index sur pregenerations.updated_at
--   - Nettoyer champ room redondant (à garder pour l'instant, utile pour display)

-- ===============================
-- 1. Simplifier musee_id dans users
-- ===============================
-- Mettre une valeur par défaut "default" car 1 instance Docker = 1 musée
ALTER TABLE users 
ALTER COLUMN musee_id SET DEFAULT 'default';

-- Mettre à jour les valeurs NULL existantes
UPDATE users SET musee_id = 'default' WHERE musee_id IS NULL;

-- ===============================
-- 2. Index pour requêtes temporelles sur pregenerations
-- ===============================
CREATE INDEX IF NOT EXISTS idx_pregenerations_updated_at 
    ON pregenerations(updated_at DESC);

-- ===============================
-- 3. Index composite pour recherche de prégénérations récentes par œuvre
-- ===============================
CREATE INDEX IF NOT EXISTS idx_pregenerations_oeuvre_updated 
    ON pregenerations(oeuvre_id, updated_at DESC);

-- ===============================
-- NOTE: Champ room dans oeuvres
-- ===============================
-- Le champ room est conservé car utilisé pour l'affichage rapide
-- La position exacte est dans entities/points
-- Pas de suppression pour l'instant

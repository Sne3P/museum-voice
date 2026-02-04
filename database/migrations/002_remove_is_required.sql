-- Migration 001: Supprimer is_required de criteria_types
-- Date: 2026-02-04
-- Raison: Tous les critères sont obligatoires par défaut pour générer un parcours cohérent

-- Supprimer la colonne is_required
ALTER TABLE criteria_types DROP COLUMN IF EXISTS is_required;

-- Vérification
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'criteria_types';

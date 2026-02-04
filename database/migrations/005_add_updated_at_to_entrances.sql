-- ===============================
-- MIGRATION 005: Ajouter colonne updated_at à museum_entrances
-- Date: 2026-02-04
-- Description: Permettre le tracking des modifications sur les entrées
-- ===============================

-- Ajouter la colonne updated_at si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'museum_entrances' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE museum_entrances 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        
        RAISE NOTICE 'Colonne updated_at ajoutée à museum_entrances';
    ELSE
        RAISE NOTICE 'Colonne updated_at existe déjà dans museum_entrances';
    END IF;
END $$;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Migration 005 appliquée avec succès - updated_at ajouté à museum_entrances';
END $$;

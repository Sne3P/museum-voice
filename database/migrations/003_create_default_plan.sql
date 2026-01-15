-- Migration: Créer un plan par défaut si aucun n'existe
-- Date: 2026-01-15
-- Description: Assure qu'il existe au moins un plan pour les entrées

DO $$
BEGIN
    -- Vérifier si la table plans existe et est vide
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'plans'
    ) THEN
        -- Si aucun plan n'existe, en créer un par défaut
        IF NOT EXISTS (SELECT 1 FROM plans LIMIT 1) THEN
            INSERT INTO plans (nom, description)
            VALUES ('RDC', 'Rez-de-chaussée - Plan par défaut')
            ON CONFLICT DO NOTHING;
            
            RAISE NOTICE 'Plan par défaut "RDC" créé avec succès';
        ELSE
            RAISE NOTICE 'Au moins un plan existe déjà, aucune action nécessaire';
        END IF;
    ELSE
        RAISE NOTICE 'Table plans non trouvée, migration ignorée';
    END IF;
END $$;

-- ===============================
-- SCRIPT DE MIGRATIONS AUTOMATIQUES
-- ===============================
-- Ce script est exécuté au démarrage du backend
-- Toutes les migrations sont idempotentes (IF NOT EXISTS)
-- ===============================

-- Table de suivi des migrations
CREATE TABLE IF NOT EXISTS _migrations (
    migration_id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- MIGRATION 001: museum_entrances
-- ===============================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM _migrations WHERE filename = '001_add_museum_entrances.sql') THEN
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
        CREATE INDEX IF NOT EXISTS idx_entrances_plan_id ON museum_entrances(plan_id);
        INSERT INTO _migrations (filename) VALUES ('001_add_museum_entrances.sql');
        RAISE NOTICE 'Migration 001 appliquée';
    END IF;
END $$;

-- ===============================
-- MIGRATION 002: remove is_required
-- ===============================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM _migrations WHERE filename = '002_remove_is_required.sql') THEN
        ALTER TABLE criteria_types DROP COLUMN IF EXISTS is_required;
        INSERT INTO _migrations (filename) VALUES ('002_remove_is_required.sql');
        RAISE NOTICE 'Migration 002 appliquée';
    END IF;
END $$;

-- ===============================
-- MIGRATION 003: default plan
-- ===============================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM _migrations WHERE filename = '003_create_default_plan.sql') THEN
        INSERT INTO plans (nom, description, date_creation)
        SELECT 'Plan principal', 'Plan du musée par défaut', CURRENT_DATE
        WHERE NOT EXISTS (SELECT 1 FROM plans LIMIT 1);
        INSERT INTO _migrations (filename) VALUES ('003_create_default_plan.sql');
        RAISE NOTICE 'Migration 003 appliquée';
    END IF;
END $$;

-- ===============================
-- MIGRATION 004: simplify & optimize
-- ===============================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM _migrations WHERE filename = '004_simplify_db_and_optimize.sql') THEN
        -- Ajouter colonnes manquantes à users si besoin
        ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
        
        -- Index de performance
        CREATE INDEX IF NOT EXISTS idx_oeuvres_room ON oeuvres(room);
        CREATE INDEX IF NOT EXISTS idx_pregenerations_oeuvre ON pregenerations(oeuvre_id);
        CREATE INDEX IF NOT EXISTS idx_parcours_user ON parcours(user_id);
        
        INSERT INTO _migrations (filename) VALUES ('004_simplify_db_and_optimize.sql');
        RAISE NOTICE 'Migration 004 appliquée';
    END IF;
END $$;

-- ===============================
-- MIGRATION 005: updated_at entrances
-- ===============================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM _migrations WHERE filename = '005_add_updated_at_to_entrances.sql') THEN
        ALTER TABLE museum_entrances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        INSERT INTO _migrations (filename) VALUES ('005_add_updated_at_to_entrances.sql');
        RAISE NOTICE 'Migration 005 appliquée';
    END IF;
END $$;

-- ===============================
-- MIGRATION 006: generation_jobs
-- ===============================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM _migrations WHERE filename = '006_add_generation_jobs_table.sql') THEN
        CREATE TABLE IF NOT EXISTS generation_jobs (
            job_id VARCHAR(16) PRIMARY KEY,
            job_type VARCHAR(50) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending' 
                CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            total_items INTEGER DEFAULT 0,
            completed_items INTEGER DEFAULT 0,
            current_item TEXT DEFAULT '',
            generated INTEGER DEFAULT 0,
            skipped INTEGER DEFAULT 0,
            errors INTEGER DEFAULT 0,
            avg_generation_time_ms INTEGER DEFAULT NULL,
            avg_skip_time_ms INTEGER DEFAULT NULL,
            last_generation_time_ms INTEGER DEFAULT NULL,
            params JSONB DEFAULT '{}',
            error_message TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
        CREATE INDEX IF NOT EXISTS idx_generation_jobs_created ON generation_jobs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_generation_jobs_type_status ON generation_jobs(job_type, status);
        
        CREATE TABLE IF NOT EXISTS generation_time_history (
            id SERIAL PRIMARY KEY,
            job_id VARCHAR(16) REFERENCES generation_jobs(job_id) ON DELETE CASCADE,
            operation_type VARCHAR(20) NOT NULL,
            duration_ms INTEGER NOT NULL,
            oeuvre_id INTEGER,
            combination_hash VARCHAR(64),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_gen_time_history_job ON generation_time_history(job_id);
        
        INSERT INTO _migrations (filename) VALUES ('006_add_generation_jobs_table.sql');
        RAISE NOTICE 'Migration 006 appliquée';
    END IF;
END $$;

-- ===============================
-- FIN DES MIGRATIONS
-- ===============================
DO $$
BEGIN
    RAISE NOTICE '✅ Toutes les migrations ont été vérifiées/appliquées';
END $$;

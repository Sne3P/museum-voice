-- Migration: 006_add_generation_jobs_table.sql
-- Date: 2026-02-04
-- Description: Ajouter la table generation_jobs pour suivi des jobs de génération async
-- Safe: Cette migration utilise IF NOT EXISTS et n'altère pas les données existantes

-- ===============================
-- TABLE : Jobs de génération asynchrone
-- ===============================
-- Permet de suivre les jobs de génération en arrière-plan
-- Partagée entre tous les workers Gunicorn via PostgreSQL

CREATE TABLE IF NOT EXISTS generation_jobs (
    job_id VARCHAR(16) PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,  -- 'all', 'artwork', 'profile'
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Progression
    total_items INTEGER DEFAULT 0,
    completed_items INTEGER DEFAULT 0,
    current_item TEXT DEFAULT '',
    
    -- Stats de génération
    generated INTEGER DEFAULT 0,
    skipped INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    
    -- Métriques de temps (pour estimation intelligente)
    avg_generation_time_ms INTEGER DEFAULT NULL,  -- Temps moyen par génération en ms
    avg_skip_time_ms INTEGER DEFAULT NULL,        -- Temps moyen pour skip en ms
    last_generation_time_ms INTEGER DEFAULT NULL, -- Dernier temps de génération
    
    -- Configuration
    params JSONB DEFAULT '{}',
    error_message TEXT
);

-- Index pour récupération rapide des jobs actifs
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created ON generation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_type_status ON generation_jobs(job_type, status);

-- ===============================
-- TABLE : Historique des temps de génération
-- ===============================
-- Pour calcul intelligent des estimations de temps
CREATE TABLE IF NOT EXISTS generation_time_history (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(16) REFERENCES generation_jobs(job_id) ON DELETE CASCADE,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('generate', 'skip', 'error')),
    duration_ms INTEGER NOT NULL,
    oeuvre_id INTEGER,
    combination_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour agrégations rapides
CREATE INDEX IF NOT EXISTS idx_gen_time_history_job ON generation_time_history(job_id);
CREATE INDEX IF NOT EXISTS idx_gen_time_history_type ON generation_time_history(operation_type);
CREATE INDEX IF NOT EXISTS idx_gen_time_history_created ON generation_time_history(created_at DESC);

-- ===============================
-- Vue pour statistiques globales
-- ===============================
CREATE OR REPLACE VIEW generation_stats_view AS
SELECT 
    operation_type,
    COUNT(*) as total_operations,
    AVG(duration_ms) as avg_duration_ms,
    MIN(duration_ms) as min_duration_ms,
    MAX(duration_ms) as max_duration_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as median_duration_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms
FROM generation_time_history
WHERE created_at > NOW() - INTERVAL '7 days'  -- Stats des 7 derniers jours
GROUP BY operation_type;

-- ===============================
-- Fonction: Nettoyage automatique des vieux jobs
-- ===============================
CREATE OR REPLACE FUNCTION cleanup_old_generation_jobs(keep_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM generation_jobs 
    WHERE status NOT IN ('pending', 'running')
    AND completed_at < NOW() - (keep_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- Commentaires
-- ===============================
COMMENT ON TABLE generation_jobs IS 'Jobs de génération asynchrone pour Ollama/narrations';
COMMENT ON COLUMN generation_jobs.avg_generation_time_ms IS 'Moyenne glissante du temps de génération pour estimation précise';
COMMENT ON TABLE generation_time_history IS 'Historique des temps pour calcul intelligent des estimations';

#!/bin/bash
set -e

# ============================================
# EXÉCUTION DES MIGRATIONS POSTGRESQL
# ============================================
echo "🔄 Vérification et application des migrations PostgreSQL..."

# Attendre que PostgreSQL soit prêt
MAX_RETRIES=30
RETRY_COUNT=0
until PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST:-database} -U ${DB_USER:-museum_admin} -d ${DB_NAME:-museumvoice} -c '\q' 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ Impossible de se connecter à PostgreSQL après ${MAX_RETRIES} tentatives"
        exit 1
    fi
    echo "⏳ Attente PostgreSQL... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

# Exécuter les migrations si le fichier existe
if [ -f "/app/migrations/run_migrations.sql" ]; then
    echo "📦 Application des migrations..."
    PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST:-database} -U ${DB_USER:-museum_admin} -d ${DB_NAME:-museumvoice} -f /app/migrations/run_migrations.sql 2>&1 || echo "⚠️ Migrations déjà appliquées ou erreur non bloquante"
    echo "✅ Migrations vérifiées"
else
    echo "ℹ️ Pas de fichier de migrations trouvé, skip"
fi

# ============================================
# DÉMARRAGE GUNICORN
# ============================================

# Auto-détection du nombre de workers optimal
# Formule Gunicorn recommandée: (2 x CPU) + 1
# Si GUNICORN_WORKERS est "auto" ou vide, on calcule automatiquement
if [ -z "${GUNICORN_WORKERS}" ] || [ "${GUNICORN_WORKERS}" = "auto" ]; then
    WORKERS=$(( 2 * $(nproc) + 1 ))
else
    WORKERS=${GUNICORN_WORKERS}
fi

THREADS=${GUNICORN_THREADS:-4}
TIMEOUT=${GUNICORN_TIMEOUT:-180}
WORKER_CONNECTIONS=${GUNICORN_WORKER_CONNECTIONS:-1000}
LOG_LEVEL=${GUNICORN_LOG_LEVEL:-info}

echo "🚀 Starting Gunicorn with ${WORKERS} workers and ${THREADS} threads per worker"

exec gunicorn \
    --bind 0.0.0.0:5000 \
    --workers ${WORKERS} \
    --threads ${THREADS} \
    --timeout ${TIMEOUT} \
    --worker-connections ${WORKER_CONNECTIONS} \
    --worker-class sync \
    --worker-tmp-dir /dev/shm \
    --access-logfile - \
    --error-logfile - \
    --log-level ${LOG_LEVEL} \
    rag.main_postgres:app


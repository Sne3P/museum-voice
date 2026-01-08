#!/bin/bash
set -e

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

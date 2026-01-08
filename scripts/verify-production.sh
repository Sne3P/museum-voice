#!/bin/bash
# ============================================
# VERIFICATION COMPLETE - PRODUCTION VPS OVH
# ============================================
# Script de vérification post-déploiement

set -e

echo "🔍 VERIFICATION ENVIRONNEMENT PRODUCTION"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
PASSED=0
FAILED=0

check_command() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $1"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $1"
        FAILED=$((FAILED + 1))
    fi
}

# ============================================
# 1. VERIFIER DOCKER
# ============================================
echo "📦 1. Docker Engine"
echo "-------------------"

docker --version > /dev/null 2>&1
check_command "Docker installé"

docker compose version > /dev/null 2>&1
check_command "Docker Compose installé"

DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+' | head -1)
if (( $(echo "$DOCKER_VERSION >= 24.0" | bc -l) )); then
    echo -e "${GREEN}✅ PASS${NC}: Docker >= 24.0 ($DOCKER_VERSION)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  WARN${NC}: Docker < 24.0 ($DOCKER_VERSION) - recommandé >= 24.0"
fi

echo ""

# ============================================
# 2. VERIFIER FICHIERS CONFIG
# ============================================
echo "📄 2. Fichiers Configuration"
echo "----------------------------"

[ -f docker-compose.prod.yml ]
check_command "docker-compose.prod.yml existe"

[ -f docker-compose.dev.yml ]
check_command "docker-compose.dev.yml existe"

[ -f .env ]
check_command ".env existe"

[ -f backend/Dockerfile ]
check_command "backend/Dockerfile existe"

[ -f Dockerfile ]
check_command "Next.js Dockerfile existe"

[ -f scripts/ollama-entrypoint.sh ]
check_command "scripts/ollama-entrypoint.sh existe"

[ -f backend/init-piper.sh ]
check_command "backend/init-piper.sh existe"

[ -f database/init.sql ]
check_command "database/init.sql existe"

echo ""

# ============================================
# 3. VERIFIER CONTAINERS
# ============================================
echo "🐳 3. Containers Docker"
echo "-----------------------"

CONTAINERS=("museum-database-prod" "museum-ollama-prod" "museum-backend-prod" "museum-app-prod" "museum-client-prod")

for container in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        STATUS=$(docker inspect --format='{{.State.Status}}' "$container")
        if [ "$STATUS" == "running" ]; then
            echo -e "${GREEN}✅ PASS${NC}: $container (running)"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}❌ FAIL${NC}: $container (status: $STATUS)"
            FAILED=$((FAILED + 1))
        fi
    else
        echo -e "${RED}❌ FAIL${NC}: $container (not found)"
        FAILED=$((FAILED + 1))
    fi
done

echo ""

# ============================================
# 4. VERIFIER HEALTHCHECKS
# ============================================
echo "🏥 4. Healthchecks Services"
echo "---------------------------"

for container in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
        if [ "$HEALTH" == "healthy" ]; then
            echo -e "${GREEN}✅ PASS${NC}: $container (healthy)"
            PASSED=$((PASSED + 1))
        elif [ "$HEALTH" == "none" ]; then
            echo -e "${YELLOW}⚠️  WARN${NC}: $container (no healthcheck)"
        else
            echo -e "${RED}❌ FAIL${NC}: $container ($HEALTH)"
            FAILED=$((FAILED + 1))
        fi
    fi
done

echo ""

# ============================================
# 5. VERIFIER OLLAMA MODEL
# ============================================
echo "🤖 5. Ollama Modèle"
echo "-------------------"

if docker exec museum-ollama-prod ollama list 2>/dev/null | grep -q "ministral"; then
    echo -e "${GREEN}✅ PASS${NC}: Modèle ministral-3:3b installé"
    PASSED=$((PASSED + 1))
    
    # Afficher taille modèle
    MODEL_SIZE=$(docker exec museum-ollama-prod ollama list | grep ministral | awk '{print $2}')
    echo "   📊 Taille: $MODEL_SIZE"
else
    echo -e "${RED}❌ FAIL${NC}: Modèle ministral-3:3b manquant"
    FAILED=$((FAILED + 1))
fi

echo ""

# ============================================
# 6. VERIFIER PIPER TTS
# ============================================
echo "🎤 6. Piper TTS Modèles"
echo "-----------------------"

if docker exec museum-backend-prod test -f /app/piper/models/fr_FR/fr_FR-siwis-medium.onnx 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}: Modèle français (fr_FR-siwis-medium)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Modèle français manquant"
    FAILED=$((FAILED + 1))
fi

if docker exec museum-backend-prod test -f /app/piper/models/en_US/en_US-ryan-high.onnx 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}: Modèle anglais (en_US-ryan-high)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Modèle anglais manquant"
    FAILED=$((FAILED + 1))
fi

echo ""

# ============================================
# 7. VERIFIER API ENDPOINTS
# ============================================
echo "🌐 7. API Endpoints"
echo "-------------------"

# Backend health
if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}: Backend /health (200)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Backend /health (erreur)"
    FAILED=$((FAILED + 1))
fi

# Ollama API
if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}: Ollama API (200)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Ollama API (erreur)"
    FAILED=$((FAILED + 1))
fi

# Next.js app
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}: Next.js App (200)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  WARN${NC}: Next.js App (erreur) - peut prendre du temps au démarrage"
fi

# React client
if curl -sf http://localhost:80 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}: React Client (200)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  WARN${NC}: React Client (erreur)"
fi

echo ""

# ============================================
# 8. VERIFIER DATABASE
# ============================================
echo "🗄️  8. PostgreSQL Database"
echo "--------------------------"

# Connexion
if docker exec museum-database-prod psql -U museum_admin -d museumvoice -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}: Connexion PostgreSQL OK"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Connexion PostgreSQL erreur"
    FAILED=$((FAILED + 1))
fi

# Tables existantes
TABLES_COUNT=$(docker exec museum-database-prod psql -U museum_admin -d museumvoice -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | xargs)
if [ "$TABLES_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: Tables créées ($TABLES_COUNT tables)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Aucune table trouvée"
    FAILED=$((FAILED + 1))
fi

# Config PostgreSQL
SHARED_BUFFERS=$(docker exec museum-database-prod psql -U museum_admin -d museumvoice -t -c "SHOW shared_buffers" 2>/dev/null | xargs)
echo "   📊 shared_buffers: $SHARED_BUFFERS"

MAX_CONNECTIONS=$(docker exec museum-database-prod psql -U museum_admin -d museumvoice -t -c "SHOW max_connections" 2>/dev/null | xargs)
echo "   📊 max_connections: $MAX_CONNECTIONS"

echo ""

# ============================================
# 9. VERIFIER RESSOURCES SYSTEME
# ============================================
echo "💻 9. Ressources Système"
echo "------------------------"

# RAM totale
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
echo "   📊 RAM totale: ${TOTAL_RAM} GB"

if [ "$TOTAL_RAM" -ge 90 ]; then
    echo -e "${GREEN}✅ PASS${NC}: RAM >= 90 GB (VPS OVH détecté)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  WARN${NC}: RAM < 90 GB ($TOTAL_RAM GB) - VPS standard"
fi

# CPU cores
CPU_CORES=$(nproc)
echo "   📊 CPU cores: $CPU_CORES"

if [ "$CPU_CORES" -ge 16 ]; then
    echo -e "${GREEN}✅ PASS${NC}: CPU >= 16 cores"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  WARN${NC}: CPU < 16 cores"
fi

# Espace disque
DISK_FREE=$(df -h / | awk 'NR==2 {print $4}')
echo "   📊 Disque libre: $DISK_FREE"

echo ""

# ============================================
# 10. VERIFIER GUNICORN CONFIG
# ============================================
echo "🦄 10. Gunicorn Configuration"
echo "-----------------------------"

# Vérifier workers actifs
WORKERS_COUNT=$(docker exec museum-backend-prod ps aux | grep -c "gunicorn.*worker" || echo "0")
echo "   📊 Workers actifs: $WORKERS_COUNT"

if [ "$WORKERS_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: Gunicorn workers running"
    PASSED=$((PASSED + 1))
    
    # Vérifier si auto-scaling fonctionne
    if [ "$WORKERS_COUNT" -ge $((CPU_CORES * 2)) ]; then
        echo -e "${GREEN}✅ PASS${NC}: Auto-scaling activé ($WORKERS_COUNT workers pour $CPU_CORES cores)"
        PASSED=$((PASSED + 1))
    fi
else
    echo -e "${RED}❌ FAIL${NC}: Aucun worker Gunicorn"
    FAILED=$((FAILED + 1))
fi

echo ""

# ============================================
# RESUME
# ============================================
echo "=========================================="
echo "📊 RÉSUMÉ VÉRIFICATION"
echo "=========================================="
echo -e "${GREEN}✅ Tests réussis: $PASSED${NC}"
echo -e "${RED}❌ Tests échoués: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ENVIRONNEMENT PRODUCTION VALIDÉ${NC}"
    echo ""
    echo "Prochaines étapes:"
    echo "  1. Tester génération parcours: pnpm test:parcours"
    echo "  2. Tester TTS audio: pnpm test:tts"
    echo "  3. Configurer Nginx reverse proxy (production)"
    echo "  4. Activer SSL/TLS (Let's Encrypt)"
    echo "  5. Configurer backup automatique PostgreSQL"
    exit 0
else
    echo -e "${RED}⚠️  ERREURS DÉTECTÉES${NC}"
    echo ""
    echo "Vérifiez les logs:"
    echo "  docker compose -f docker-compose.prod.yml logs -f"
    echo ""
    echo "Commandes utiles:"
    echo "  docker ps                    # Status containers"
    echo "  docker stats                 # Ressources en temps réel"
    echo "  docker logs <container>      # Logs spécifiques"
    exit 1
fi

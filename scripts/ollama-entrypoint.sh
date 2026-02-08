#!/bin/bash
# Script d'entrypoint pour Ollama - Pull automatique du modèle Mistral
# OPTIMISÉ pour utiliser TOUS les CPU disponibles

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         OLLAMA ENTRYPOINT - MUSEUM VOICE                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# ===== DÉTECTION DYNAMIQUE DES CPU =====
CPU_COUNT=$(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 4)
echo "🔧 CPU détectés: ${CPU_COUNT}"

# ===== AFFICHER VARIABLES REÇUES DE DOCKER =====
echo ""
echo "📋 Variables d'environnement reçues de Docker:"
env | grep -E "^OLLAMA|^GOMAXPROCS" | sort | while read line; do
    echo "   ✓ $line"
done

# ===== VÉRIFICATION CRITIQUE: OLLAMA_NUM_PARALLEL =====
if [ -z "$OLLAMA_NUM_PARALLEL" ] || [ "$OLLAMA_NUM_PARALLEL" = "1" ]; then
    echo ""
    echo "⚠️  ATTENTION: OLLAMA_NUM_PARALLEL non défini ou = 1"
    echo "   Calcul dynamique basé sur ${CPU_COUNT} CPU..."
    export OLLAMA_NUM_PARALLEL=$((CPU_COUNT / 2))
    [ "$OLLAMA_NUM_PARALLEL" -lt 4 ] && export OLLAMA_NUM_PARALLEL=4
    [ "$OLLAMA_NUM_PARALLEL" -gt 24 ] && export OLLAMA_NUM_PARALLEL=24
    echo "   → OLLAMA_NUM_PARALLEL=${OLLAMA_NUM_PARALLEL}"
fi

if [ -z "$OLLAMA_NUM_THREAD" ] || [ "$OLLAMA_NUM_THREAD" = "0" ]; then
    export OLLAMA_NUM_THREAD=$((CPU_COUNT / OLLAMA_NUM_PARALLEL))
    [ "$OLLAMA_NUM_THREAD" -lt 2 ] && export OLLAMA_NUM_THREAD=2
    echo "   → OLLAMA_NUM_THREAD=${OLLAMA_NUM_THREAD}"
fi

# ===== OPTIMISATIONS ADDITIONNELLES =====
[ -z "$OLLAMA_KEEP_ALIVE" ] && export OLLAMA_KEEP_ALIVE="24h"
[ -z "$OLLAMA_FLASH_ATTENTION" ] && export OLLAMA_FLASH_ATTENTION="1"
[ -z "$OLLAMA_HOST" ] && export OLLAMA_HOST="0.0.0.0:11434"
[ -z "$GOMAXPROCS" ] && export GOMAXPROCS=${CPU_COUNT}

# ===== RÉSUMÉ CONFIGURATION FINALE =====
echo ""
echo "🚀 CONFIGURATION FINALE OLLAMA:"
echo "   ├── OLLAMA_NUM_PARALLEL = ${OLLAMA_NUM_PARALLEL} (requêtes simultanées)"
echo "   ├── OLLAMA_NUM_THREAD   = ${OLLAMA_NUM_THREAD} (threads/requête)"
echo "   ├── OLLAMA_KEEP_ALIVE   = ${OLLAMA_KEEP_ALIVE}"
echo "   ├── OLLAMA_FLASH_ATTENTION = ${OLLAMA_FLASH_ATTENTION}"
echo "   ├── OLLAMA_HOST         = ${OLLAMA_HOST}"
echo "   └── GOMAXPROCS          = ${GOMAXPROCS}"
echo ""
echo "   📊 Utilisation CPU: ~$((OLLAMA_NUM_PARALLEL * OLLAMA_NUM_THREAD * 100))% max"
echo "      (${OLLAMA_NUM_PARALLEL} requêtes × ${OLLAMA_NUM_THREAD} threads × 100%)"
echo ""

# ===== DÉMARRAGE OLLAMA =====
echo "🔄 Lancement: ollama serve..."
ollama serve &
OLLAMA_PID=$!

# Attendre qu'Ollama soit prêt
echo "⏳ Attente du démarrage d'Ollama..."
for i in {1..30}; do
    if ollama list >/dev/null 2>&1; then
        echo "✅ Ollama est prêt!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Timeout: Ollama n'a pas démarré"
        exit 1
    fi
    sleep 2
done

# Vérifier si le modèle ministral est installé
if ollama list | grep -q "ministral"; then
    echo "✅ Modèle ministral déjà installé - skip pull"
else
    echo "📥 Téléchargement du modèle mistral (~3GB)..."
    echo "   Première installation - cela peut prendre 5-10 minutes..."
    ollama pull ministral-3:3b
    
    if [ $? -eq 0 ]; then
        echo "✅ Modèle ministral installé avec succès!"
    else
        echo "❌ Erreur lors du pull du modèle"
        kill $OLLAMA_PID
        exit 1
    fi
fi

# Afficher les modèles installés
echo ""
echo "📋 Modèles Ollama disponibles:"
ollama list
echo ""
echo "🎉 Ollama prêt à l'emploi!"

# Garder Ollama en avant-plan
wait $OLLAMA_PID

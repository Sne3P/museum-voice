#!/bin/bash
# Script d'entrypoint pour Ollama - Museum Voice
# STRATÉGIE: Moins de requêtes parallèles mais plus de threads par requête

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         OLLAMA ENTRYPOINT - MUSEUM VOICE                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# ===== DÉTECTION CPU =====
CPU_COUNT=$(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 8)
echo "🔧 CPU détectés: ${CPU_COUNT}"

# ===== VARIABLES REÇUES DE DOCKER =====
echo ""
echo "📋 Variables d'environnement Ollama:"
env | grep -E "^OLLAMA|^GOMAXPROCS" | sort | while read line; do
    echo "   ✓ $line"
done

# ===== CONFIGURATION SI NON DÉFINIE =====
# Stratégie: OLLAMA_NUM_THREAD=0 (auto) + OLLAMA_NUM_PARALLEL=4
# Ollama répartira automatiquement les threads entre les requêtes

if [ -z "$OLLAMA_NUM_PARALLEL" ]; then
    # 4 requêtes parallèles est un bon compromis
    export OLLAMA_NUM_PARALLEL=4
    echo "   → OLLAMA_NUM_PARALLEL=${OLLAMA_NUM_PARALLEL} (auto-configuré)"
fi

if [ -z "$OLLAMA_NUM_THREAD" ]; then
    # 0 = auto = Ollama utilise tous les threads disponibles
    export OLLAMA_NUM_THREAD=0
    echo "   → OLLAMA_NUM_THREAD=0 (auto - utilise tous les CPU)"
fi

# ===== OPTIMISATIONS =====
[ -z "$OLLAMA_KEEP_ALIVE" ] && export OLLAMA_KEEP_ALIVE="24h"
[ -z "$OLLAMA_FLASH_ATTENTION" ] && export OLLAMA_FLASH_ATTENTION="1"
[ -z "$OLLAMA_HOST" ] && export OLLAMA_HOST="0.0.0.0:11434"
[ -z "$GOMAXPROCS" ] && export GOMAXPROCS=${CPU_COUNT}

# ===== RÉSUMÉ =====
echo ""
echo "🚀 CONFIGURATION FINALE:"
echo "   ├── OLLAMA_NUM_PARALLEL   = ${OLLAMA_NUM_PARALLEL} requêtes simultanées"
echo "   ├── OLLAMA_NUM_THREAD     = ${OLLAMA_NUM_THREAD} (0=auto=tous les CPU)"
echo "   ├── OLLAMA_KEEP_ALIVE     = ${OLLAMA_KEEP_ALIVE}"
echo "   ├── OLLAMA_FLASH_ATTENTION= ${OLLAMA_FLASH_ATTENTION}"
echo "   └── GOMAXPROCS            = ${GOMAXPROCS}"
echo ""
if [ "$OLLAMA_NUM_THREAD" = "0" ]; then
    echo "   📊 Mode AUTO: Ollama répartit ${CPU_COUNT} CPU entre ${OLLAMA_NUM_PARALLEL} requêtes"
    echo "      → ~$((CPU_COUNT / OLLAMA_NUM_PARALLEL)) threads par requête"
else
    echo "   📊 CPU utilisés: ${OLLAMA_NUM_PARALLEL} × ${OLLAMA_NUM_THREAD} = $((OLLAMA_NUM_PARALLEL * OLLAMA_NUM_THREAD)) threads"
fi
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

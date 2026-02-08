#!/bin/bash
# Script de diagnostic pour vérifier la configuration Ollama
# À exécuter sur le VPS: docker exec museum-ollama-prod /diagnose.sh

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         DIAGNOSTIC OLLAMA - PARALLÉLISATION                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo ""
echo "1. DÉTECTION CPU"
echo "─────────────────"
CPU_COUNT=$(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo "?")
echo "   nproc: $CPU_COUNT"
echo "   /proc/cpuinfo processors: $(grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 'N/A')"

echo ""
echo "2. VARIABLES D'ENVIRONNEMENT OLLAMA"
echo "────────────────────────────────────"
env | grep -E "^OLLAMA|^GOMAXPROCS" | sort | while read line; do
    echo "   $line"
done

if [ -z "$(env | grep OLLAMA_NUM_PARALLEL)" ]; then
    echo "   ⚠️  OLLAMA_NUM_PARALLEL n'est PAS défini!"
    echo "      Ollama utilise la valeur par défaut: 1 (une seule requête à la fois)"
fi

echo ""
echo "3. PROCESSUS OLLAMA"
echo "────────────────────"
ps aux | grep -E "ollama|serve" | grep -v grep

echo ""
echo "4. MÉMOIRE"
echo "───────────"
free -h 2>/dev/null || echo "Commande free non disponible"

echo ""
echo "5. TEST API OLLAMA"
echo "──────────────────"
# Vérifier que l'API répond
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "   ✅ API Ollama répond"
    echo "   Modèles chargés:"
    curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | head -5
else
    echo "   ❌ API Ollama ne répond pas"
fi

echo ""
echo "6. RECOMMANDATIONS"
echo "──────────────────"
if [ "$CPU_COUNT" != "?" ]; then
    RECOMMENDED_PARALLEL=$((CPU_COUNT / 2))
    echo "   Pour $CPU_COUNT CPU, configurez:"
    echo "   • OLLAMA_NUM_PARALLEL=$RECOMMENDED_PARALLEL"
    echo "   • OLLAMA_NUM_THREAD=2"
    echo ""
    echo "   Utilisation CPU attendue: $((RECOMMENDED_PARALLEL * 2 * 100))%"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"

#!/bin/bash
# Script d'entrypoint pour Ollama - Pull automatique du modèle Mistral

set -e

echo "🤖 Démarrage Ollama..."

# Démarrer Ollama en arrière-plan
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

# Vérifier si le modèle mistral est installé
if ollama list | grep -q "ministral"; then
    echo "✅ Modèle ministral déjà installé - skip pull"
else
    echo "📥 Téléchargement du modèle mistral (~3GB)..."
    echo "   Première installation - cela peut prendre 5-10 minutes..."
    ollama pull ministral-3:3b
    
    if [ $? -eq 0 ]; then
        echo "✅ Modèle mistral installé avec succès!"
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

#!/bin/bash
# Script d'initialisation Ollama - Pull automatique modèle Mistral

echo "🤖 Initialisation Ollama..."

# Attendre qu'Ollama soit prêt
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if curl -s http://ollama:11434/api/tags >/dev/null 2>&1; then
        echo "✅ Ollama est prêt!"
        break
    fi
    echo "⏳ Attente Ollama... ($retry_count/$max_retries)"
    sleep 2
    retry_count=$((retry_count + 1))
done

if [ $retry_count -eq $max_retries ]; then
    echo "❌ Timeout: Ollama non disponible après ${max_retries} tentatives"
    exit 1
fi

# Vérifier si mistral est déjà installé
if docker exec museum-ollama ollama list | grep -q "mistral"; then
    echo "✅ Modèle mistral déjà installé"
else
    echo "📥 Pull du modèle mistral (~4GB)..."
    echo "   Cela peut prendre 5-10 minutes selon la connexion..."
    docker exec museum-ollama ollama pull mistral
    
    if [ $? -eq 0 ]; then
        echo "✅ Modèle mistral installé avec succès!"
    else
        echo "❌ Erreur lors du pull du modèle"
        exit 1
    fi
fi

# Vérifier la liste des modèles
echo ""
echo "📋 Modèles Ollama installés:"
docker exec museum-ollama ollama list

echo ""
echo "🎉 Ollama prêt à l'emploi!"

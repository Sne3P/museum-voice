#!/bin/bash
# Script d'initialisation des modèles Piper TTS
# Télécharge les modèles vocaux français et anglais

set -e

echo "🎤 Initialisation des modèles Piper TTS..."

# Dossiers de destination
PIPER_DIR="/app/piper"
MODELS_DIR="$PIPER_DIR/models"

# Créer les dossiers
mkdir -p "$MODELS_DIR/fr_FR"
mkdir -p "$MODELS_DIR/en_US"

# Modèles à télécharger
declare -A MODELS=(
    ["fr_FR"]="https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx"
    ["fr_FR_json"]="https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json"
    ["en_US"]="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx"
    ["en_US_json"]="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx.json"
)

# Fonction de téléchargement
download_model() {
    local url=$1
    local dest=$2
    local name=$(basename "$dest")
    
    if [ -f "$dest" ]; then
        echo "✅ $name déjà présent - skip"
        return 0
    fi
    
    echo "📥 Téléchargement de $name..."
    
    # Utiliser wget ou curl selon disponibilité
    if command -v wget &> /dev/null; then
        wget -q --show-progress -O "$dest" "$url"
    elif command -v curl &> /dev/null; then
        curl -L -o "$dest" "$url"
    else
        echo "❌ wget ou curl requis"
        return 1
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ $name téléchargé"
        return 0
    else
        echo "❌ Erreur téléchargement $name"
        return 1
    fi
}

# Télécharger modèle français
echo ""
echo "📦 Modèle Français (fr_FR-siwis-medium)..."
download_model \
    "${MODELS[fr_FR]}" \
    "$MODELS_DIR/fr_FR/fr_FR-siwis-medium.onnx"

download_model \
    "${MODELS[fr_FR_json]}" \
    "$MODELS_DIR/fr_FR/fr_FR-siwis-medium.onnx.json"

# Télécharger modèle anglais
echo ""
echo "📦 Modèle Anglais (en_US-ryan-high)..."
download_model \
    "${MODELS[en_US]}" \
    "$MODELS_DIR/en_US/en_US-ryan-high.onnx"

download_model \
    "${MODELS[en_US_json]}" \
    "$MODELS_DIR/en_US/en_US-ryan-high.onnx.json"

# Afficher résumé
echo ""
echo "📋 Modèles Piper installés:"
find "$MODELS_DIR" -type f -name "*.onnx" -exec basename {} \;

echo ""
echo "🎉 Piper TTS prêt à l'emploi!"

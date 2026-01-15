# 🎙️ Génération Audio & Narrations

## Présentation

Le système génère automatiquement des narrations textuelles personnalisées pour chaque œuvre, puis les convertit en audio. Ce processus utilise deux services IA :

1. **Ollama (LLM)** : Génération de texte avec le modèle Mistral
2. **Piper (TTS)** : Conversion texte-vers-audio (voix française)

---

## Architecture de Génération

```
┌─────────────────────────────────────────────────────────────────┐
│                        Flux de Génération                        │
└─────────────────────────────────────────────────────────────────┘

   ┌─────────────┐
   │   Œuvre     │
   │  (données)  │
   └──────┬──────┘
          │
          ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                     SÉLECTION PROFIL                          │
   │  • Âge : Enfant / Adolescent / Adulte / Senior               │
   │  • Thématique : Art / Histoire / Technique / Émotion         │
   │  • Style : Court / Détaillé / Narratif / Poétique            │
   └──────────────────────────┬──────────────────────────────────┘
                              │
                              ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                      OLLAMA (LLM)                             │
   │                                                               │
   │   Prompt = Context œuvre + Artiste + Profil                  │
   │   ───────────────────────────────────────                    │
   │   "Génère une narration de 2 minutes pour un enfant         │
   │    sur le tableau 'La Joconde' de Léonard de Vinci..."      │
   │                                                               │
   │   → Texte narration (500-800 mots)                           │
   └──────────────────────────┬──────────────────────────────────┘
                              │
                              ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                      PIPER (TTS)                              │
   │                                                               │
   │   Texte → Audio WAV                                          │
   │   • Voix : fr_FR (Siwis)                                     │
   │   • Sample rate : 22050 Hz                                   │
   │   • Format : WAV mono                                        │
   └──────────────────────────┬──────────────────────────────────┘
                              │
                              ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                    STOCKAGE                                   │
   │                                                               │
   │   /uploads/audio/                                            │
   │   └── oeuvre_1_age_1_theme_5_style_8.wav                     │
   │                                                               │
   │   + Enregistrement en base (table narrations)                │
   └─────────────────────────────────────────────────────────────┘
```

---

## Profils de Narration

### Critères disponibles

#### Âge (`criteres_age`)

| ID | Label | Description |
|----|-------|-------------|
| 1 | Enfant | 6-10 ans, vocabulaire simple, ludique |
| 2 | Adolescent | 11-17 ans, dynamique, références actuelles |
| 3 | Adulte | 18-64 ans, complet, contextuel |
| 4 | Senior | 65+, clair, nostalgie, détails historiques |

#### Thématique (`criteres_thematique`)

| ID | Label | Description |
|----|-------|-------------|
| 1 | Art | Focus sur la technique artistique |
| 2 | Histoire | Contexte historique et époque |
| 3 | Biographie | Vie de l'artiste |
| 4 | Symbolisme | Significations cachées |
| 5 | Émotion | Ressenti et atmosphère |

#### Style de texte (`criteres_style_texte`)

| ID | Label | Description |
|----|-------|-------------|
| 1 | Court | 1 minute, essentiel |
| 2 | Standard | 2 minutes, équilibré |
| 3 | Détaillé | 3-4 minutes, approfondi |
| 4 | Narratif | Raconté comme une histoire |
| 5 | Poétique | Style littéraire, évocateur |

### Combinaisons

Chaque œuvre peut avoir plusieurs narrations pré-générées :

```
Œuvre "La Joconde" :
├── Enfant + Art + Court
├── Enfant + Émotion + Narratif
├── Adulte + Histoire + Détaillé
├── Adulte + Technique + Standard
├── Senior + Biographie + Détaillé
└── ...
```

---

## Génération avec Ollama

### Configuration

```python
OLLAMA_HOST = "http://ollama:11434"
MODEL = "mistral"
```

### Prompt Template

```python
def build_prompt(oeuvre, artist, profile):
    return f"""Tu es un guide de musée expert. Génère une narration audio 
pour l'œuvre suivante, adaptée au profil du visiteur.

## ŒUVRE
- Titre : {oeuvre.titre}
- Artiste : {artist.nom} ({artist.dates})
- Technique : {oeuvre.technique}
- Dimensions : {oeuvre.dimensions}
- Date : {oeuvre.date_creation}
- Description : {oeuvre.description}

## CONTEXTE ARTISTE
{artist.biographie}

## PROFIL VISITEUR
- Âge : {profile.age_label}
- Intérêt : {profile.thematique_label}
- Style préféré : {profile.style_label}

## CONSIGNES
- Durée : {profile.duree} minute(s)
- Ton : {profile.ton}
- Éviter les termes trop techniques si enfant
- Inclure des anecdotes si style narratif

Génère la narration (texte uniquement, pas de balises) :
"""
```

### Appel API Ollama

```python
import requests

def generate_narration(prompt):
    response = requests.post(
        f"{OLLAMA_HOST}/api/generate",
        json={
            "model": "mistral",
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
                "num_predict": 1000
            }
        }
    )
    return response.json()["response"]
```

---

## Conversion Audio avec Piper

### Configuration

```python
PIPER_HOST = "http://piper-tts:5002"
VOICE = "fr_FR-siwis-medium"
```

### Appel API Piper

```python
def text_to_speech(text, output_path):
    response = requests.post(
        f"{PIPER_HOST}/api/tts",
        json={
            "text": text,
            "voice": "fr_FR-siwis-medium",
            "output_format": "wav"
        }
    )
    
    with open(output_path, 'wb') as f:
        f.write(response.content)
    
    return output_path
```

### Formats audio

| Paramètre | Valeur |
|-----------|--------|
| Format | WAV |
| Sample Rate | 22050 Hz |
| Channels | Mono |
| Bit Depth | 16 bits |

---

## Stockage

### Structure fichiers

```
/uploads/audio/
├── oeuvre_1/
│   ├── age_1_theme_1_style_1.wav
│   ├── age_1_theme_2_style_1.wav
│   ├── age_2_theme_1_style_2.wav
│   └── ...
├── oeuvre_2/
│   └── ...
└── ...
```

### Table `narrations`

| Colonne | Type | Description |
|---------|------|-------------|
| narration_id | SERIAL | ID unique |
| oeuvre_id | INTEGER | FK vers oeuvres |
| age_id | INTEGER | FK vers criteres_age |
| thematique_id | INTEGER | FK vers criteres_thematique |
| style_id | INTEGER | FK vers criteres_style_texte |
| texte | TEXT | Contenu textuel de la narration |
| audio_path | VARCHAR | Chemin vers fichier audio |
| duration_seconds | FLOAT | Durée en secondes |
| created_at | TIMESTAMP | Date de génération |
| is_validated | BOOLEAN | Validé par admin |

---

## API de Génération

### Générer une narration

```
POST /api/admin/generate-narration-precise
Content-Type: application/json

{
  "oeuvre_id": 1,
  "criteria_combination": {
    "age": 1,
    "thematique": 5,
    "style_texte": 2
  }
}
```

Réponse :
```json
{
  "success": true,
  "narration_id": 42,
  "texte": "Bienvenue devant La Joconde...",
  "audio_path": "/uploads/audio/oeuvre_1/age_1_theme_5_style_2.wav",
  "duration_seconds": 120.5
}
```

### Pré-génération en masse

```
POST /api/admin/pregenerate-narrations
Content-Type: application/json

{
  "oeuvre_ids": [1, 2, 3, 4, 5],
  "profiles": [
    {"age": 1, "thematique": 1, "style_texte": 1},
    {"age": 3, "thematique": 2, "style_texte": 2}
  ]
}
```

### Récupérer une narration

```
GET /api/narration?oeuvre_id=1&age=1&thematique=5&style=2
```

Réponse :
```json
{
  "success": true,
  "narration": {
    "texte": "...",
    "audio_url": "http://server:5000/uploads/audio/oeuvre_1/age_1_theme_5_style_2.wav",
    "duration_seconds": 120.5
  }
}
```

---

## Dashboard Admin

### Gestion des narrations

URL : `/admin/dashboard`

Fonctionnalités :
- Voir les narrations existantes par œuvre
- Régénérer une narration
- Valider/invalider
- Écouter l'audio
- Éditer le texte manuellement

### États des narrations

| État | Description |
|------|-------------|
| ✅ Générée | Texte et audio disponibles |
| ⏳ En cours | Génération en cours |
| ❌ Erreur | Échec de génération |
| 📝 Manquante | Pas encore générée |

---

## Optimisation

### Cache des modèles

Ollama garde les modèles en mémoire :
```yaml
# docker-compose.yml
ollama:
  environment:
    - OLLAMA_KEEP_ALIVE=24h
```

### Génération par lots

Pour éviter la surcharge :
```python
def batch_generate(oeuvres, profiles, batch_size=5):
    for i in range(0, len(oeuvres), batch_size):
        batch = oeuvres[i:i+batch_size]
        for oeuvre in batch:
            for profile in profiles:
                generate_narration(oeuvre, profile)
        time.sleep(10)  # Pause entre lots
```

### Fallback

Si la génération échoue :
1. Réessayer 3 fois avec délai exponentiel
2. Logger l'erreur
3. Marquer comme "échec" en base
4. Utiliser narration par défaut si disponible

---

## Qualité et Validation

### Critères de qualité

- **Longueur** : Respecte la durée demandée (±20%)
- **Cohérence** : Pas de répétitions, structure logique
- **Ton** : Adapté au profil (enfant vs adulte)
- **Factualité** : Informations correctes sur l'œuvre

### Processus de validation

1. Génération automatique
2. Revue admin (optionnel)
3. Validation manuelle ou automatique
4. Publication

### Régénération

Si une narration n'est pas satisfaisante :
```
POST /api/admin/regenerate-narration
{
  "narration_id": 42,
  "reason": "Trop technique pour un enfant"
}
```

---

## Dépannage

### Ollama ne répond pas

```bash
# Vérifier le conteneur
docker compose logs ollama

# Vérifier que le modèle est chargé
docker compose exec ollama ollama list

# Recharger le modèle
docker compose exec ollama ollama pull mistral
```

### Piper erreur audio

```bash
# Vérifier le conteneur
docker compose logs piper-tts

# Tester l'API
curl -X POST http://localhost:5002/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Test", "voice": "fr_FR-siwis-medium"}' \
  --output test.wav
```

### Audio de mauvaise qualité

- Vérifier le texte source (caractères spéciaux)
- Tester avec un texte plus court
- Vérifier l'espace disque disponible

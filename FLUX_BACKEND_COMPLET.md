# 🎨 Flux Backend Complet - Museum Voice

## 📋 Vue d'ensemble

Le système Museum Voice suit un flux en 5 étapes pour transformer un PDF d'œuvre d'art en narrations audio personnalisées.

```
PDF → Métadonnées → Chunks → Embeddings → FAISS Index → Narrations → Audio
```

---

## 🔄 Étapes détaillées

### 1️⃣ **Upload & Extraction PDF**

**Endpoint:** `POST /api/extract-pdf-metadata`

**Processus:**
- Upload du PDF dans `/public/uploads/`
- Le backend accède au fichier via volume Docker `uploads_data`
- `ModelCompliantPDFProcessor` extrait 10+ champs :
  - titre, artiste, date_oeuvre
  - materiaux, dimensions
  - mouvement, contexte_historique
  - description, analyse_technique
  - iconographie, anecdotes
  - reception_critique, provenance

**Fichier:** `backend/rag/model_pdf_processor.py`

**Sortie:** JSON avec métadonnées structurées

---

### 2️⃣ **Sauvegarde en Base de Données**

**Endpoint:** `POST /api/save-to-db`

**Processus:**
- Création/mise à jour de l'œuvre dans table `oeuvres`
- Sauvegarde de toutes les métadonnées
- Liaison avec artiste et mouvement (tables relationnelles)

**Fichier:** `app/api/save-to-db/route.ts`

**Base de données:** PostgreSQL 16 (Docker)

**Sortie:** `oeuvre_id` assigné

---

### 3️⃣ **Création des Chunks Sémantiques**

**Endpoint:** `POST /api/chunks/create/<oeuvre_id>`

**Processus:**
- Segmentation sémantique des métadonnées en **8 chunks** :
  1. **Métadonnées** (titre, artiste, date, matériaux)
  2. **Description** (description visuelle de l'œuvre)
  3. **Contexte historique** (commande, époque, circonstances)
  4. **Analyse technique** (technique picturale, matériaux, composition)
  5. **Iconographie** (symbolisme, signification)
  6. **Réception** (critique, importance historique)
  7. **Conservation** (état, restaurations)
  8. **Provenance** (historique de possession)

- Chaque chunk = segment textuel cohérent (~200-500 caractères)
- Sauvegarde dans table `chunk` avec `chunk_index`

**Fichier:** `backend/rag/traitement/chunk_creator_postgres.py`

**Sortie:** 6-8 chunks par œuvre (selon disponibilité métadonnées)

---

### 4️⃣ **Génération d'Embeddings** ⚠️ À IMPLÉMENTER

**Endpoint futur:** `POST /api/embeddings/create/<oeuvre_id>`

**Processus prévu:**
- Pour chaque chunk : génération d'un vecteur d'embedding
- Modèle : Sentence Transformers (`all-MiniLM-L6-v2` ou équivalent)
- Dimension : 384 ou 768 (selon modèle)
- Sauvegarde dans table `embeddings`

**Fichier à créer:** `backend/rag/embeddings/embedding_generator.py`

**Technologies:** 
- `sentence-transformers`
- `transformers` (HuggingFace)

---

### 5️⃣ **Construction de l'Index FAISS** ⚠️ À IMPLÉMENTER

**Endpoint futur:** `POST /api/faiss/build/<oeuvre_id>` ou `/api/faiss/build-all`

**Processus prévu:**
- Récupération de tous les embeddings
- Construction d'un index FAISS (IndexFlatL2 ou IndexIVFFlat)
- Sauvegarde de l'index sur disque (`indexes/artwork_{id}.faiss`)
- Permet recherche sémantique rapide

**Fichier à créer:** `backend/rag/indexes/faiss_manager.py`

**Technologies:**
- `faiss-cpu` ou `faiss-gpu`
- Persistance sur volume Docker

---

### 6️⃣ **Prégénération des Narrations** ✅ IMPLÉMENTÉ

**Endpoint:** `POST /api/pregenerate-artwork/<oeuvre_id>`

**Processus:**
- Génération de **36 narrations** par œuvre :
  - **4 âges** : enfant, ado, adulte, senior
  - **3 thèmes** : technique_picturale, biographie, historique
  - **3 styles** : analyse, decouverte, anecdote
  - **4 × 3 × 3 = 36 combinaisons**

- Pour chaque narration :
  1. Sélection des chunks pertinents (selon thème)
  2. Génération du contenu à partir des chunks réels
  3. Adaptation du ton selon l'âge cible
  4. Application du style (analyse, découverte, anecdote)
  5. Sauvegarde dans table `pregenerations`

**Fichier:** `backend/rag/pregeneration/simple_pregeneration_postgres.py`

**Exemple de sélection de chunks:**
- Thème **technique_picturale** → Chunks 1, 4 (métadonnées, analyse technique)
- Thème **biographie** → Chunks 2, 3 (description, contexte)
- Thème **historique** → Chunks 3, 6, 7 (contexte, réception, provenance)

**Sortie:** 36 textes uniques (~300-700 caractères) sauvegardés en BDD

---

### 7️⃣ **Conversion Text-to-Speech (TTS)** ⚠️ À IMPLÉMENTER

**Endpoint futur:** `POST /api/tts/generate/<pregeneration_id>` ou `/batch`

**Processus prévu:**
- Pour chaque narration : conversion texte → audio
- Voix différentes selon âge et contexte
- Format : MP3 ou WAV
- Sauvegarde dans `/public/audio/`
- Mise à jour du champ `voice_link` dans `pregenerations`

**Technologies possibles:**
- **gTTS** (Google Text-to-Speech) - Gratuit, simple
- **Eleven Labs** - Qualité professionnelle, payant
- **Azure Cognitive Services** - Multilingue, payant
- **Coqui TTS** - Open source, local

**Fichier à créer:** `backend/rag/tts/tts_generator.py`

---

## 🗄️ Architecture Base de Données

### Tables principales

```sql
-- Œuvres d'art
oeuvres (
    oeuvre_id SERIAL PRIMARY KEY,
    titre TEXT,
    artiste TEXT,
    date_oeuvre TEXT,
    materiaux TEXT,
    dimensions TEXT,
    mouvement TEXT,
    contexte_historique TEXT,
    description TEXT,
    analyse_technique TEXT,
    iconographie TEXT,
    anecdotes TEXT,
    reception_critique TEXT,
    provenance TEXT,
    ...
)

-- Chunks sémantiques
chunk (
    chunk_id SERIAL PRIMARY KEY,
    oeuvre_id INTEGER REFERENCES oeuvres,
    chunk_text TEXT,
    chunk_index INTEGER,
    chunk_type TEXT,
    created_at TIMESTAMP
)

-- Prégénérations
pregenerations (
    pregeneration_id SERIAL PRIMARY KEY,
    oeuvre_id INTEGER REFERENCES oeuvres,
    age_cible TEXT,           -- enfant | ado | adulte | senior
    thematique TEXT,          -- technique_picturale | biographie | historique
    style_texte TEXT,         -- analyse | decouverte | anecdote
    pregeneration_text TEXT,
    voice_link TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(oeuvre_id, age_cible, thematique, style_texte)
)

-- Embeddings (à créer)
embeddings (
    embedding_id SERIAL PRIMARY KEY,
    chunk_id INTEGER REFERENCES chunk,
    vector VECTOR(384),       -- ou 768 selon modèle
    model_name TEXT,
    created_at TIMESTAMP
)
```

---

## 📂 Structure Fichiers Backend

```
backend/rag/
├── main_postgres.py              # API Flask principale
├── model_pdf_processor.py        # Extraction PDF
│
├── core/
│   ├── db_postgres.py            # Connexion PostgreSQL
│   └── pregeneration_db.py       # Gestion prégénérations
│
├── traitement/
│   └── chunk_creator_postgres.py # Création chunks ✅
│
├── pregeneration/
│   └── simple_pregeneration_postgres.py  # Génération narrations ✅
│
├── embeddings/                   # À CRÉER
│   └── embedding_generator.py
│
├── indexes/                      # À CRÉER
│   └── faiss_manager.py
│
└── tts/                          # À CRÉER
    └── tts_generator.py
```

---

## 🔌 API Endpoints

### ✅ Implémentés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/extract-pdf-metadata` | POST | Extrait métadonnées du PDF |
| `/api/artworks` | GET | Liste toutes les œuvres |
| `/api/artworks/<id>` | GET | Détails d'une œuvre |
| `/api/chunks/create/<oeuvre_id>` | POST | Crée chunks sémantiques |
| `/api/pregenerate-artwork/<id>` | POST | Génère 36 narrations |
| `/api/pregenerate-all` | POST | Génère pour toutes les œuvres |

### ⚠️ À Implémenter

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/embeddings/create/<oeuvre_id>` | POST | Génère embeddings des chunks |
| `/api/faiss/build/<oeuvre_id>` | POST | Construit index FAISS |
| `/api/faiss/search` | POST | Recherche sémantique |
| `/api/tts/generate/<pregen_id>` | POST | Convertit narration en audio |
| `/api/tts/batch/<oeuvre_id>` | POST | Convertit toutes narrations œuvre |

---

## 🎯 Utilisation Typique

### Workflow complet pour une nouvelle œuvre

```bash
# 1. Upload PDF et extraction
POST /api/extract-pdf-metadata
{
  "pdfFile": <file>,
  "artworkId": 123
}

# 2. Sauvegarde en BDD (automatique depuis frontend)
POST /api/save-to-db
{
  "oeuvreId": 123,
  "metadata": { titre, artiste, ... }
}

# 3. Création des chunks
POST /api/chunks/create/123

# 4. (FUTUR) Génération embeddings
POST /api/embeddings/create/123

# 5. (FUTUR) Construction index FAISS
POST /api/faiss/build/123

# 6. Prégénération des narrations
POST /api/pregenerate-artwork/123
{
  "force_regenerate": false
}

# 7. (FUTUR) Génération audio
POST /api/tts/batch/123
```

---

## 📊 Exemple de Données

### Artwork: "Paysage" - Eugène Leroy (1982)

**Métadonnées extraites:** ✅
```json
{
  "titre": "Paysage",
  "artiste": "Eugène Leroy",
  "date_oeuvre": "1982",
  "materiaux": "Huile sur toile",
  "dimensions": "116 × 89 cm",
  "mouvement": "Abstraction lyrique",
  "contexte_historique": "Réalisé en 1982...",
  "description": "La toile présente une surface dense...",
  "analyse_technique": "Leroy utilise l'huile...",
  ...
}
```

**Chunks créés:** ✅ (6 chunks)
```
Chunk 1 (Métadonnées): "Titre : Paysage\nArtiste : Eugène Leroy\nDate : 1982..."
Chunk 2 (Description): "La toile présente une surface dense et épaisse..."
Chunk 3 (Contexte): "Cette œuvre est réalisée en 1982, année décisive..."
Chunk 4 (Technique): "Leroy utilise l'huile de manière singulière..."
Chunk 5 (Iconographie): "Le paysage chez Leroy n'est pas une représentation..."
Chunk 6 (Provenance): "Non documenté. Probablement collection privée."
```

**Narrations générées:** ✅ (36 narrations)
- Longueur moyenne: **436 caractères**
- Diversité: **Contenu unique par profil**

Exemples:
```
[enfant | technique_picturale | analyse]
"Analyse : Bonjour ! Regarde bien ce tableau qui s'appelle « Paysage ». 
« Paysage » de Eugène Leroy. Titre : Paysage, Artiste : Eugène Leroy, 
Date de création : 1982. Huile sur toile 116 × 89 cm..."

[adulte | historique | analyse]
"Analyse : « Paysage » Cette œuvre est réalisée en 1982, année décisive 
dans la carrière d'Eugène Leroy. Elle coïncide avec la première grande 
rétrospective de son travail, organisée par Jan Hoet au musée..."

[senior | biographie | decouverte]
"À la découverte de cette œuvre : Cette œuvre remarquable, « Paysage » 
de Eugène Leroy, mérite toute notre attention. Eugène Leroy a créé 
cette œuvre. Titre : Paysage, Artiste : Eugène Leroy, Date de création : 1982..."
```

---

## 🚀 Prochaines Implémentations

### 1. Système d'Embeddings

**Fichier:** `backend/rag/embeddings/embedding_generator.py`

```python
from sentence_transformers import SentenceTransformer

class EmbeddingGenerator:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def generate_for_chunk(self, chunk_id: int):
        # Récupère chunk
        # Génère embedding
        # Sauvegarde en BDD
        pass
    
    def generate_for_artwork(self, oeuvre_id: int):
        # Pour tous les chunks de l'œuvre
        pass
```

**Dépendance:** `pip install sentence-transformers`

---

### 2. Index FAISS

**Fichier:** `backend/rag/indexes/faiss_manager.py`

```python
import faiss
import numpy as np

class FAISSManager:
    def build_index(self, oeuvre_id: int):
        # Récupère tous embeddings
        # Crée index FAISS
        # Sauvegarde sur disque
        pass
    
    def search(self, query_embedding, k=5):
        # Recherche les k chunks les plus proches
        pass
```

**Dépendance:** `pip install faiss-cpu`

---

### 3. Text-to-Speech

**Fichier:** `backend/rag/tts/tts_generator.py`

```python
from gtts import gTTS

class TTSGenerator:
    def generate_audio(self, pregeneration_id: int):
        # Récupère texte
        # Génère MP3
        # Sauvegarde dans /public/audio/
        # Met à jour voice_link
        pass
    
    def generate_batch(self, oeuvre_id: int):
        # Pour toutes les 36 prégénérations
        pass
```

**Dépendance:** `pip install gTTS` ou `pip install elevenlabs`

---

## ✅ État Actuel vs État Futur

| Fonctionnalité | État | Fichiers |
|----------------|------|----------|
| Extraction PDF | ✅ | `model_pdf_processor.py` |
| Sauvegarde BDD | ✅ | `db_postgres.py` |
| Création Chunks | ✅ | `chunk_creator_postgres.py` |
| Embeddings | ❌ | À créer |
| FAISS Index | ❌ | À créer |
| Prégénérations | ✅ | `simple_pregeneration_postgres.py` |
| TTS Audio | ❌ | À créer |
| RAG Dynamique | ❌ | Nécessite embeddings + FAISS |

---

## 🔒 Garanties

### ✅ Code Original Préservé

Tous les fichiers SQLite originaux sont **INTACTS** :
- `backend/rag/db.py` ❌ NON MODIFIÉ
- `backend/rag/model_db.py` ❌ NON MODIFIÉ
- Autres fichiers SQLite ❌ NON MODIFIÉS

### ✅ Implémentation Parallèle

Nouveaux fichiers PostgreSQL créés **séparément** :
- `backend/rag/core/db_postgres.py` ✅ NOUVEAU
- `backend/rag/core/pregeneration_db.py` ✅ NOUVEAU
- `backend/rag/traitement/chunk_creator_postgres.py` ✅ NOUVEAU
- `backend/rag/pregeneration/simple_pregeneration_postgres.py` ✅ NOUVEAU

---

## 📝 Notes Importantes

1. **Volume Docker** : Le partage `uploads_data` entre `app` et `backend` est **CRITIQUE**
2. **Chunks sémantiques** : Nécessaires pour des narrations riches et uniques
3. **36 narrations** : Couvrent tous les profils visiteurs
4. **Embeddings** : Prochaine étape pour RAG dynamique
5. **FAISS** : Permettra recherche sémantique et génération à la volée
6. **TTS** : Dernière étape pour audioguide complet

---

## 🎓 Conclusion

Le système actuel implémente **le cœur du pipeline** :
- PDF → Métadonnées → Chunks → Narrations ✅

Les **extensions futures** ajouteront :
- Embeddings → FAISS → RAG dynamique ⚠️
- TTS → Audio ⚠️

Le design est **modulaire et évolutif**, permettant d'ajouter ces fonctionnalités sans casser l'existant.

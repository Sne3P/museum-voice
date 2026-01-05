# 🔄 Flux Complet - Museum Voice Backend

## 📋 Flux de Données Vérifié et Validé

### 1. Upload PDF → Métadonnées

```
Frontend Upload PDF
    ↓
POST /api/pdf/extract-metadata
    ↓
rag/model_pdf_processor.py
    - ModelCompliantPDFProcessor
    - Extraction formulaire PDF
    - Parsing champs structurés
    ↓
Sauvegarde PostgreSQL (table: oeuvres)
    ✅ FONCTIONNEL
```

**Fichier utilisé**: `backend/rag/model_pdf_processor.py`

---

### 2. Métadonnées → Chunks Sémantiques

```
Métadonnées en DB (oeuvres)
    ↓
rag/traitement/chunk_creator_postgres.py
    - Découpage sémantique
    - Paragraphes logiques
    - DELETE avant INSERT (évite doublons)
    ↓
Sauvegarde PostgreSQL (table: chunk)
    ✅ FONCTIONNEL
```

**Fichier utilisé**: `backend/rag/traitement/chunk_creator_postgres.py`

---

### 3. Chunks → Embeddings

```
Chunks (table: chunk)
    ↓
rag/core/rag_engine_postgres.py
    - get_rag_engine()
    - create_embeddings_for_artwork(oeuvre_id)
    ↓
sentence-transformers: all-MiniLM-L6-v2
    - Dimension: 384
    - Modèle léger et rapide
    ↓
Sauvegarde PostgreSQL (table: embeddings)
    - embedding_vector: BYTEA
    - model_name: 'all-MiniLM-L6-v2'
    ✅ FONCTIONNEL
```

**Fichier utilisé**: `backend/rag/core/rag_engine_postgres.py`

---

### 4. Embeddings → Index FAISS

```
Embeddings (table: embeddings)
    ↓
rag/core/rag_engine_postgres.py
    - build_faiss_index_for_artwork(oeuvre_id)
    ↓
FAISS IndexFlatIP
    - Produit scalaire (similarité cosinus)
    - Index par œuvre
    ↓
Sauvegarde disque
    - /app/rag/indexes/museum_postgres/artwork_{id}.faiss
    - /app/rag/indexes/museum_postgres/artwork_{id}.mapping
    ✅ FONCTIONNEL
```

**Fichier utilisé**: `backend/rag/core/rag_engine_postgres.py`

---

### 5. RAG Context Retrieval

```
Query utilisateur
    ↓
rag/core/rag_engine_postgres.py
    - retrieve_context(oeuvre_id, query, top_k=5)
    ↓
FAISS Search (similarité cosinus)
    ↓
Top-K chunks les plus pertinents
    ↓
Contexte RAG (string concaténé)
    ✅ FONCTIONNEL
```

**Fichier utilisé**: `backend/rag/core/rag_engine_postgres.py`

---

### 6. RAG Context → LLM (Ollama) → Narrations

```
Contexte RAG + Métadonnées œuvre
    ↓
rag/core/ollama_generator.py
    - get_ollama_generator()
    - generate_narration(artwork, chunks, rag_context, age, theme, style)
    ↓
Prompts adaptatifs avec variations
    - Règles strictes: singulier, gender-neutral, sans temporel
    - Anti-hallucination (factuel uniquement)
    ↓
Ollama API (gemma:2b)
    - Température: 0.4
    - num_predict: 180 tokens
    - num_ctx: 2048
    - num_batch: 1024
    ↓
Narration générée (180-250 mots)
    ✅ FONCTIONNEL
```

**Fichier utilisé**: `backend/rag/core/ollama_generator.py`

---

### 7. Prégénération Complète (36 narrations)

```
POST /api/pregenerate-artwork/{oeuvre_id}
    ↓
rag/core/ollama_pregeneration_complete.py
    - get_ollama_pregeneration_system()
    - pregenerate_artwork(oeuvre_id)
    ↓
ÉTAPE 1: Setup RAG
    - create_embeddings_for_artwork()
    - build_faiss_index_for_artwork()
    ↓
ÉTAPE 2: Récupération contexte RAG
    - get_artwork_chunks()
    - _build_artwork_rag_context()
    ↓
ÉTAPE 3: Génération 36 narrations
    - 4 ages × 3 thèmes × 3 styles
    - Boucle sur toutes combinaisons
    - generate_narration() pour chaque
    ↓
Sauvegarde PostgreSQL (table: pregenerations)
    - UNIQUE(oeuvre_id, age_cible, thematique, style_texte)
    ✅ FONCTIONNEL
```

**Fichier utilisé**: `backend/rag/core/ollama_pregeneration_complete.py`

---

### 8. Génération Parcours Intelligent

```
POST /api/parcours/generate
    Body: {age_cible, thematique, style_texte, max_artworks}
    ↓
rag/parcours/intelligent_path_generator.py
    - generer_parcours_intelligent()
    ↓
ÉTAPE 1: Récupération œuvres + narrations
    - Query JOIN oeuvres + pregenerations
    - Filtrage par profil (age, thème, style)
    ↓
ÉTAPE 2: Sélection intelligente
    - Diversité géographique (différentes salles)
    - Respect max_artworks
    - Équilibrage étages
    ↓
ÉTAPE 3: Optimisation chemin
    - Nearest Neighbor Algorithm
    - Minimise distance totale
    - Pénalité changement étage (+1000m virtuel)
    ↓
ÉTAPE 4: Calcul métriques
    - Distance totale (mètres)
    - Durée estimée (marche + écoute)
    - Étages/salles visités
    ↓
Export JSON complet
    - Liste ordonnée œuvres
    - Narrations complètes
    - Positions géographiques
    - Distances entre œuvres
    ✅ FONCTIONNEL
```

**Fichier utilisé**: `backend/rag/parcours/intelligent_path_generator.py`

---

## 📁 Fichiers Actifs Validés

### Core (rag/core/)
- ✅ `db_postgres.py` - Connexion + CRUD PostgreSQL
- ✅ `pregeneration_db.py` - Gestion prégénérations
- ✅ `ollama_generator.py` - Génération narrations Ollama
- ✅ `ollama_pregeneration_complete.py` - Système 36 narrations
- ✅ `rag_engine_postgres.py` - Embeddings + FAISS
- ✅ `config.py` - Configuration

### Traitement (rag/traitement/)
- ✅ `chunk_creator_postgres.py` - Création chunks
- ✅ `doc_processing.py` - Traitement documents
- ✅ `model_pdf_processor.py` - Extraction PDF

### Parcours (rag/parcours/)
- ✅ `intelligent_path_generator.py` - Parcours optimisés

### API (rag/)
- ✅ `main_postgres.py` - API Flask principale

---

## 🗄️ Schéma Base de Données

```
oeuvres
├─ oeuvre_id (PK)
├─ title, artist, date, materiaux_technique
├─ description, contexte_commande, analyse...
└─ room, created_at, updated_at

chunk
├─ chunk_id (PK)
├─ chunk_text
├─ chunk_index
└─ oeuvre_id (FK → oeuvres)

embeddings
├─ embedding_id (PK)
├─ chunk_id (FK → chunk)
├─ embedding_vector (BYTEA)
├─ model_name
└─ vector_dimension

pregenerations
├─ pregeneration_id (PK)
├─ oeuvre_id (FK → oeuvres)
├─ age_cible (enfant|ado|adulte|senior)
├─ thematique (technique_picturale|biographie|historique)
├─ style_texte (analyse|decouverte|anecdote)
├─ pregeneration_text
└─ UNIQUE(oeuvre_id, age_cible, thematique, style_texte)

entities (plan musée)
├─ entity_id (PK)
├─ plan_id, name, entity_type
├─ oeuvre_id (FK → oeuvres)
└─ description

points (positions géographiques)
├─ point_id (PK)
├─ entity_id (FK → entities)
├─ x, y (coordonnées)
└─ ordre
```

---

## 🔧 Technologies Stack

- **Base de données**: PostgreSQL 16
- **Framework**: Flask + Flask-CORS
- **LLM**: Ollama (gemma:2b - 2B params)
- **Embeddings**: sentence-transformers (all-MiniLM-L6-v2, 384D)
- **Recherche vectorielle**: FAISS (IndexFlatIP)
- **PDF**: PyPDF2, pdfplumber
- **Python**: 3.11+

---

## ✅ Status Validation

| Module | Status | Fichier | Utilisé dans API |
|--------|--------|---------|------------------|
| PDF Extraction | ✅ | `model_pdf_processor.py` | `/api/pdf/extract-metadata` |
| Chunk Creation | ✅ | `chunk_creator_postgres.py` | Via RAG setup |
| Embeddings | ✅ | `rag_engine_postgres.py` | `/api/rag/embeddings/create` |
| FAISS Index | ✅ | `rag_engine_postgres.py` | Auto via RAG setup |
| RAG Context | ✅ | `rag_engine_postgres.py` | Auto via prégénération |
| LLM Generation | ✅ | `ollama_generator.py` | Via prégénération |
| Prégénération 36 | ✅ | `ollama_pregeneration_complete.py` | `/api/pregenerate-artwork` |
| Parcours Intelligent | ✅ | `intelligent_path_generator.py` | `/api/parcours/generate` |

**🎉 Tous les modules sont validés et opérationnels!**

---

## 🧪 Tests Frontend

### Page Test Parcours
- ✅ `/app/admin/test-parcours/page.tsx` créée
- ✅ Lien ajouté dans dashboard admin
- ✅ Configuration profil (age, thème, style)
- ✅ Affichage parcours complet
- ✅ Modal narration complète

---

## 🗂️ Legacy (Conservé pour Référence)

Fichiers déplacés dans `backend/legacy/`:
- `main.py` (ancien SQLite)
- `db.py` (connecteur SQLite)
- `model_db.py`, `llm_generator.py`, etc.

**⚠️ Ne pas utiliser**

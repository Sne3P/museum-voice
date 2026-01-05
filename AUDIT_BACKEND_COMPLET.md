# 🔍 AUDIT BACKEND MUSEUM VOICE - Architecture & Fonctionnement

## 📊 État Actuel

### ✅ PostgreSQL Opérationnel
- **18 tables** créées et fonctionnelles
- **Structure complète** avec métadonnées enrichies
- **Docker** : Connecté à `museum-db` (PostgreSQL 16)

### 🗄️ Tables Principales

| Table | Rôle | Champs Clés |
|-------|------|-------------|
| **oeuvres** | Œuvres d'art avec métadonnées complètes | title, artist, date_oeuvre, materiaux_technique, contexte_commande, analyse_materielle_technique, iconographie_symbolique, etc. (24 colonnes) |
| **chunk** | Segments de texte pour RAG | chunk_text, chunk_index, oeuvre_id |
| **pregenerations** | Narrations prégénérées | oeuvre_id, age_cible, thematique, style_texte, pregeneration_text |
| **artistes** | Base artistes | nom, lieu_naissance, biographie |
| **mouvements** | Mouvements artistiques | nom, description, periode |
| **anecdotes** | Anecdotes par œuvre | oeuvre_id, contenu |

---

## 🏗️ Architecture Backend

### Structure des Dossiers

```
backend/rag/
├── core/                        # Module core
│   ├── db_postgres.py          # ✅ Connexion PostgreSQL
│   ├── pregeneration_db.py     # ✅ Gestion prégénérations
│   └── model_db.py             # ⚠️  SQLite (non utilisé en prod)
│
├── pregeneration/               # Système de prégénération
│   ├── auto_pregeneration_optimized.py    # ✅ Génération parallèle
│   ├── pregeneration_api.py               # ✅ API prégénération
│   └── pregeneration_retrieval.py         # ✅ Récupération narrations
│
├── traitement/                  # Traitement documents
│   ├── doc_processing.py        # ✅ Extraction texte PDF
│   └── model_pdf_processor.py   # ⚠️  Doublon (à nettoyer)
│
├── utils/                       # Utilitaires
│   └── intelligent_generator.py # ✅ Génération contenu IA
│
├── main_postgres.py             # ✅ API Flask principale (ACTIF)
└── model_pdf_processor.py       # ✅ Extraction métadonnées PDF
```

---

## 🔄 Flux Complet du Système

### 1️⃣ **Upload & Extraction PDF**

```
Frontend upload PDF
      ↓
/api/artwork-pdf (Next.js)
      ↓
Sauvegarde: /uploads/pdfs/artwork_xxx.pdf
      ↓
/api/extract-pdf-metadata
      ↓
Backend Flask: /api/pdf/extract-metadata
      ↓
ModelCompliantPDFProcessor.extract_field()
      ↓
Retourne: {titre, artiste, date, matériaux, contexte, description, analyse, iconographie, anecdotes}
      ↓
Frontend met à jour artwork.metadata
```

**Pourquoi ?** → Les métadonnées structurées permettent :
- Affichage riche dans l'interface
- Recherche par critères
- Génération de narrations contextuelles

### 2️⃣ **Création de Chunks (Segmentation)**

```
PDF enregistré en DB
      ↓
Backend: doc_processing.extract_text_from_pdf()
      ↓
Texte brut extrait
      ↓
Segmentation intelligente (paragraphes/sections)
      ↓
Stockage: table CHUNK
```

**Pourquoi les chunks ?** → 
- **RAG (Retrieval Augmented Generation)** : Récupérer les segments pertinents pour générer des réponses
- **Embeddings** : Convertir chaque chunk en vecteur pour recherche sémantique
- **Performance** : Chercher dans petits segments vs document entier
- **Précision** : Répondre avec contexte exact vs texte global

### 3️⃣ **Embeddings & Index FAISS**

```
Chunks créés
      ↓
Sentence Transformers
      ↓
Conversion texte → vecteurs (embeddings)
      ↓
FAISS Index (recherche vectorielle ultra-rapide)
      ↓
Stockage: indexes/faiss_index
```

**Pourquoi FAISS ?**
- **Recherche sémantique** : Trouver chunks similaires par sens (pas juste mots-clés)
- **Performance** : Millions de vecteurs en millisecondes
- **RAG** : Récupérer contexte pertinent pour LLM

### 4️⃣ **Prégénération de Narrations**

```
Œuvre en DB avec métadonnées + chunks
      ↓
AutoPregenerationSystemOptimized
      ↓
Pour chaque œuvre × (âge × thème × style)
      ↓
IntelligentContentGenerator.generate_content()
      ↓
Utilise: métadonnées + chunks + anecdotes
      ↓
Génère narration personnalisée
      ↓
Stockage: table PREGENERATIONS
```

**Paramètres de prégénération :**
- **Âges** : enfant, ado, adulte, senior
- **Thèmes** : technique_picturale, biographie, historique
- **Styles** : analyse, découverte, anecdote

**Résultat** : 4 × 3 × 3 = **36 narrations par œuvre**

**Pourquoi prégénérer ?**
- **Rapidité** : Réponse instantanée (pas d'attente LLM)
- **Qualité** : Contenu révisé et cohérent
- **Coût** : Génération 1 fois vs à chaque visite
- **Offline** : Fonctionne sans connexion internet

### 5️⃣ **Génération Parcours Visiteur**

```
Profil utilisateur {âge, centres_intérêt, durée}
      ↓
Récupère œuvres du musée
      ↓
Filtre selon profil + position dans plan
      ↓
Calcule parcours optimal
      ↓
Pour chaque œuvre: récupère prégénération correspondante
      ↓
Génère parcours personnalisé avec narrations
```

### 6️⃣ **Audio Guide IA Temps Réel**

```
Utilisateur devant œuvre (QR code / position)
      ↓
Frontend: /api/parcours/narration
      ↓
Backend récupère prégénération (age_cible + thematique)
      ↓
Si pas de prégénération:
   ↓
   RAG: Recherche chunks pertinents (FAISS)
   ↓
   LLM: Génère narration à la volée
      ↓
Text-to-Speech (optionnel)
      ↓
Retourne audio + texte
```

---

## 🎯 Pourquoi Cette Architecture ?

### Métadonnées ≠ Chunks

| Aspect | Métadonnées | Chunks |
|--------|-------------|--------|
| **Contenu** | Structuré (titre, date, artiste) | Texte libre (paragraphes) |
| **Usage** | Filtres, affichage, index | RAG, recherche sémantique |
| **Source** | Extraction patterns | Texte brut PDF |
| **Stockage** | Colonnes DB | Table séparée |
| **Exemple** | `date_oeuvre: "1982"` | `"Cette œuvre réalisée en 1982..."` |

**Complémentaires** : 
- Métadonnées = Squelette (structure)
- Chunks = Chair (contenu)

### RAG vs Prégénération

| Mode | Quand | Avantage | Inconvénient |
|------|-------|----------|--------------|
| **Prégénération** | Contenu standard (36 variantes) | Instantané, qualité | Rigide, stockage |
| **RAG temps réel** | Questions spécifiques | Flexible, personnalisé | Lent (LLM), coût |

**Stratégie hybride** :
- Prégénération pour 95% des cas (parcours guidés)
- RAG pour questions libres ("Pourquoi ce tableau est bleu?")

---

## ✅ Services Opérationnels

### Actuellement Fonctionnels

| Service | Fichier | État | Test |
|---------|---------|------|------|
| **API Flask** | `main_postgres.py` | ✅ | `curl http://backend:5000/health` |
| **Extraction PDF** | `model_pdf_processor.py` | ✅ | Testé: 10/10 champs extraits |
| **Connexion PostgreSQL** | `core/db_postgres.py` | ✅ | Tables OK |
| **Prégénération** | `pregeneration/auto_pregeneration_optimized.py` | ✅ | Code présent |
| **Chunks** | `traitement/doc_processing.py` | ✅ | Fonction `extract_text_from_pdf` OK |

### À Vérifier/Compléter

| Composant | Statut | Action |
|-----------|--------|--------|
| **FAISS Index** | ⚠️ | Vérifier création/chargement |
| **Embeddings** | ⚠️ | Tester génération vecteurs |
| **RAG Engine** | ⚠️ | Vérifier endpoint RAG |
| **Text-to-Speech** | ⚠️ | Vérifier intégration audio |
| **Nettoyage doublons** | ⚠️ | Supprimer `traitement/model_pdf_processor.py` (doublon) |

---

## 📋 Endpoints API Disponibles

### Backend Flask (Port 5000)

```python
# Santé
GET  /health

# Œuvres
GET  /api/artworks                    # Liste toutes
GET  /api/artworks/<id>               # Détails + sections + anecdotes
GET  /api/artworks/search?q=...       # Recherche
POST /api/artworks                    # Créer

# PDF
POST /api/pdf/extract-metadata        # Extraction métadonnées
POST /api/pdf/process-full            # Traitement complet (chunks + embeddings)

# Prégénération
POST /api/pregeneration/generate      # Générer narrations
GET  /api/pregeneration/<oeuvre_id>   # Récupérer prégénérations
GET  /api/pregeneration/stats         # Statistiques

# RAG (à vérifier)
POST /api/rag/query                   # Question libre
GET  /api/rag/chunks/<oeuvre_id>      # Chunks d'une œuvre
```

---

## 🚀 Prochaines Étapes

### 1. Tester le Flux Complet
```bash
# 1. Uploader PDF depuis l'éditeur
# 2. Exporter vers DB
# 3. Lancer prégénération
curl -X POST http://localhost:5000/api/pregeneration/generate \
  -H "Content-Type: application/json" \
  -d '{"oeuvre_id": 1}'

# 4. Vérifier prégénérations
curl http://localhost:5000/api/pregeneration/1
```

### 2. Vérifier FAISS
```bash
docker exec museum-backend ls -la /app/indexes/
# Devrait contenir: faiss_index.bin, metadata.json
```

### 3. Tester RAG
```bash
curl -X POST http://localhost:5000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Qui a peint cette œuvre?", "oeuvre_id": 1}'
```

### 4. Nettoyer Doublons
- Supprimer `traitement/model_pdf_processor.py` (même fichier que racine)
- Supprimer `core/model_db.py` (SQLite, pas utilisé)

---

## ✅ Résumé

### Ce Qui Fonctionne
✅ PostgreSQL avec toutes les tables nécessaires
✅ Extraction métadonnées PDF (10+ champs)
✅ Enregistrement enrichi en DB
✅ Structure prégénération complète
✅ Structure chunks/embeddings en place

### Ce Qui Manque/À Vérifier
⚠️ Endpoints RAG fonctionnels
⚠️ Index FAISS créé et chargé
⚠️ Pipeline complet end-to-end testé
⚠️ Génération audio (TTS)

### Recommandation
**Prochaine action** : Tester le flux complet avec 1 œuvre :
1. Upload PDF → 2. Extract metadata → 3. Create chunks → 4. Generate embeddings → 5. Pregenerate narrations → 6. Test audio guide

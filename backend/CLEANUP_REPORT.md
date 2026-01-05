# Backend Structure Cleanup

## ✅ Fichiers Actifs (PostgreSQL)

### Core
```
rag/core/
├── db_postgres.py              # Connexion PostgreSQL + requêtes CRUD
├── pregeneration_db.py         # Gestion prégénérations en DB
├── ollama_generator.py         # Générateur narrations avec Ollama
├── ollama_pregeneration_complete.py  # Système complet 36 narrations
├── rag_engine_postgres.py      # RAG (embeddings + FAISS)
└── config.py                   # Configuration générale
```

### Traitement
```
rag/traitement/
├── chunk_creator_postgres.py   # Création chunks sémantiques
├── doc_processing.py           # Traitement documents
└── model_pdf_processor.py      # Extraction métadonnées PDF
```

### Parcours
```
rag/parcours/
├── intelligent_path_generator.py  # Générateur parcours optimisés
└── README_PARCOURS.md            # Documentation parcours
```

### API
```
rag/
├── main_postgres.py            # API Flask principale
└── model_pdf_processor.py      # Processeur PDF (utilisé par API)
```

## 🗑️ Fichiers Legacy (SQLite/MySQL - Déplacés)

Anciens fichiers utilisant SQLite/MySQL, conservés pour référence :

```
backend/legacy/
├── main.py                     # Ancien main SQLite
├── run.py                      # Ancien runner
├── traitement.py               # Ancien traitement
├── pregeneration.py            # Ancienne prégénération
├── parcours.py                 # Ancien parcours
├── update_pregeneration_table.py
├── model_pdf_processor_backup.py
├── db.py                       # Ancien connecteur SQLite
├── model_db.py                 # Ancien modèle DB
├── llm_generator.py            # Ancien générateur LLM
└── llm_pregeneration.py        # Ancienne prégénération LLM
```

## 🗂️ Fichiers Non Utilisés (À Supprimer)

### Parcours - Doublons/Obsolètes
- `rag/parcours/parcours_generator.py` (ancien, remplacé par intelligent_path_generator)
- `rag/parcours/generation_rapide.py` (test, non utilisé)

### Pregeneration - Doublons/Obsolètes
- `rag/pregeneration/simple_pregeneration_postgres.py` (remplacé par ollama_pregeneration_complete)
- `rag/pregeneration/auto_pregeneration_optimized.py` (non utilisé)
- `rag/pregeneration/pregeneration_db_optimized.py` (doublons avec core/pregeneration_db)
- `rag/pregeneration/pregeneration_api.py` (non utilisé, API dans main_postgres)
- `rag/pregeneration/pregeneration_retrieval.py` (non utilisé)

### Traitement - Doublons/Obsolètes
- `rag/traitement/cli.py` (non utilisé)

## 📁 Structure Finale Recommandée

```
backend/
├── legacy/                     # Anciens fichiers SQLite/MySQL
├── rag/
│   ├── core/                   # Modules PostgreSQL actifs
│   │   ├── db_postgres.py
│   │   ├── pregeneration_db.py
│   │   ├── ollama_generator.py
│   │   ├── ollama_pregeneration_complete.py
│   │   ├── rag_engine_postgres.py
│   │   └── config.py
│   ├── traitement/             # Traitement documents/chunks
│   │   ├── chunk_creator_postgres.py
│   │   ├── doc_processing.py
│   │   └── model_pdf_processor.py
│   ├── parcours/               # Génération parcours
│   │   ├── intelligent_path_generator.py
│   │   └── README_PARCOURS.md
│   ├── indexes/                # Index FAISS (données)
│   ├── main_postgres.py        # API Flask principale
│   └── model_pdf_processor.py  # Processeur PDF
├── test_parcours_generator.py  # Tests
├── test_new_prompts.py         # Tests
└── requirements.txt
```

## 🧹 Commandes de Nettoyage

```powershell
# Déjà fait
# - Fichiers legacy déplacés dans backend/legacy/

# À faire
# - Supprimer fichiers doublons dans rag/parcours/
# - Supprimer fichiers doublons dans rag/pregeneration/
# - Supprimer fichiers inutilisés dans rag/traitement/
```

## 📊 Imports Actifs (main_postgres.py)

```python
# Core PostgreSQL
from .core.db_postgres import (...)
from .core.pregeneration_db import (...)
from .core.ollama_pregeneration_complete import get_ollama_pregeneration_system

# Traitement
from .model_pdf_processor import ModelCompliantPDFProcessor

# Parcours (nouveau)
from .parcours.intelligent_path_generator import generer_parcours_intelligent
```

Tout le reste est INUTILISÉ ou LEGACY.

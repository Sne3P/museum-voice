# Système d'Upload et Gestion des PDFs - Museum Voice

## 📋 Fonctionnalités Implémentées

### 1. **Extraction Automatique des Métadonnées PDF**
- **Backend**: Processeur PDF intelligent (`model_pdf_processor.py`)
- **Extraction de 10+ champs**: titre, artiste, date, matériaux, mouvement, contexte, description, analyse, iconographie, anecdotes, etc.
- **Universel**: Gère différents formats de PDFs avec patterns flexibles
- **Endpoint API**: `/api/extract-pdf-metadata`

### 2. **Upload et Sauvegarde des PDFs**
- **Upload sécurisé**: Validation du format PDF
- **Stockage organisé**: `uploads/pdfs/artwork_{id}_{timestamp}_{nom}.pdf`
- **Métadonnées liées**: Les métadonnées extraites sont automatiquement attachées à l'œuvre

### 3. **Nettoyage Automatique des PDFs Orphelins**
- **Détection automatique**: Identifie les PDFs uploadés mais non enregistrés en DB
- **Nettoyage post-sauvegarde**: Supprime automatiquement les fichiers orphelins après chaque export vers la DB
- **API dédiée**: `/api/cleanup-orphan-pdfs` (GET = liste, POST = supprime)

### 4. **Enregistrement Enrichi en Base de Données**
- **Table `oeuvres`** avec 17+ colonnes enrichies
- **Métadonnées complètes** : date_oeuvre, materiaux_technique, provenance, contexte_commande, analyse_materielle_technique, iconographie_symbolique, etc.
- **Cascade DELETE**: Les PDFs associés sont automatiquement nettoyés

## 🔄 Flux de Travail Complet

### Création d'une Œuvre avec PDF

```
1. Utilisateur dessine une zone artwork sur le plan
   ↓
2. Modal s'ouvre pour saisir les détails
   ↓
3. Utilisateur upload un PDF
   ↓
4. Frontend upload le PDF vers /api/artwork-pdf
   ↓
5. Frontend appelle /api/extract-pdf-metadata
   ↓
6. Backend extrait les métadonnées du PDF
   ↓
7. Frontend met à jour l'artwork avec:
   - name (titre extrait)
   - artist (artiste extrait)
   - metadata (toutes les métadonnées)
   - pdfPath (chemin du fichier)
   ↓
8. Utilisateur confirme
   ↓
9. Artwork ajouté à l'état avec métadonnées
```

### Sauvegarde en Base de Données

```
1. Utilisateur clique "Export vers DB"
   ↓
2. Frontend convertit l'état en format export
   - Inclut toutes les métadonnées extraites
   ↓
3. POST /api/save-to-db
   ↓
4. Backend commence transaction
   ↓
5. TRUNCATE CASCADE (nettoie tout)
   ↓
6. INSERT avec métadonnées enrichies:
   - Champs de base (title, artist, description)
   - Métadonnées PDF (date, matériaux, contexte, etc.)
   ↓
7. COMMIT transaction
   ↓
8. Nettoyage automatique des PDFs orphelins
   - Compare fichiers uploads/ vs DB
   - Supprime les fichiers non référencés
```

## 🗑️ Gestion des Suppressions

### Suppression d'Œuvre
- ✅ Fichier PDF automatiquement nettoyé lors du prochain export
- ✅ Aucun fichier orphelin ne persiste

### Modification de PDF
- ✅ Ancien PDF supprimé avant upload du nouveau
- ✅ Géré par `/api/artwork-pdf` avec paramètre `oldPdfPath`

### Annulation Sans Sauvegarde
- ✅ PDFs uploadés mais non exportés sont nettoyés automatiquement
- ✅ Fonction `cleanupOrphanPdfs()` s'exécute après chaque export

## 📁 Structure des Fichiers

### Frontend
```
features/canvas/components/
  └── ArtworkPropertiesModal.tsx    # Modal upload PDF + extraction
  
core/services/
  └── database.service.ts            # Conversion état → export avec métadonnées
```

### Backend
```
backend/rag/
  └── model_pdf_processor.py         # Extraction métadonnées PDF
  └── main_postgres.py                # API Flask endpoints
```

### API Routes
```
app/api/
  ├── artwork-pdf/route.ts           # Upload/suppression PDF
  ├── extract-pdf-metadata/route.ts  # Extraction métadonnées
  ├── save-to-db/route.ts            # Sauvegarde DB + nettoyage auto
  └── cleanup-orphan-pdfs/route.ts   # API nettoyage manuel
```

## 🧪 Tests

### Tester l'Extraction de Métadonnées
```bash
# Depuis le container backend
docker exec museum-backend python -c "
from rag.model_pdf_processor import ModelCompliantPDFProcessor
p = ModelCompliantPDFProcessor()
text = p.extract_text_from_pdf('/app/uploads/pdfs/votre_pdf.pdf')
metadata = {}
for field in ['titre', 'artiste', 'date_oeuvre', 'materiaux', 'contexte', 'description']:
    metadata[field] = p.extract_field(text, field)
print(metadata)
"
```

### Vérifier les PDFs Orphelins
```bash
# Via API
curl http://localhost:3000/api/cleanup-orphan-pdfs
```

### Nettoyer les PDFs Orphelins
```bash
# Simulation (dry run)
curl -X POST http://localhost:3000/api/cleanup-orphan-pdfs \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# Suppression réelle
curl -X POST http://localhost:3000/api/cleanup-orphan-pdfs \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

## ✅ Points de Contrôle

### Avant Chaque Export
1. ✅ Toutes les œuvres avec PDF ont leurs métadonnées extraites
2. ✅ Fichiers PDF présents dans `uploads/pdfs/`

### Après Chaque Export  
1. ✅ Données en DB avec métadonnées complètes
2. ✅ Aucun PDF orphelin restant
3. ✅ Logs confirmant le nettoyage

### Logs à Surveiller
```
Backend (Flask):
  ✅ "PDF sauvegardé: artwork_xxx.pdf"
  ✅ "Métadonnées extraites: 10 champs"
  ✅ "✓ titre: ..."
  ✅ "✓ artiste: ..."

Frontend (Next.js):
  ✅ "✅ PDF uploadé: /uploads/pdfs/..."
  ✅ "✅ Métadonnées extraites: {title, artist}"
  🗑️  "PDF orphelin supprimé: artwork_xxx.pdf"
  ✅ "3 PDF(s) orphelin(s) nettoyé(s)"
```

## 🔧 Configuration

### Variables d'Environnement
```env
# Backend URL pour extraction métadonnées
BACKEND_API_URL=http://backend:5000  # Docker
BACKEND_API_URL=http://localhost:5000  # Local dev
```

### Permissions Fichiers
```bash
# S'assurer que le dossier uploads est accessible
chmod 755 uploads/pdfs/
```

## 🚀 Production

### Recommandations
1. **Backup régulier** du dossier `uploads/pdfs/`
2. **Nettoyage planifié** via cron: `POST /api/cleanup-orphan-pdfs`
3. **Monitoring** de l'espace disque
4. **Logs centralisés** pour tracer les suppressions

### Sécurité
- ✅ Validation format PDF (magic bytes)
- ✅ Noms de fichiers sécurisés (pas d'injection path)
- ✅ Taille limite upload (configurable)
- ✅ Transaction DB avec ROLLBACK en cas d'erreur

## 📊 Schéma Base de Données

```sql
CREATE TABLE oeuvres (
    oeuvre_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    description TEXT,
    -- Métadonnées extraites du PDF
    date_oeuvre TEXT,
    materiaux_technique TEXT,
    provenance TEXT,
    contexte_commande TEXT,
    analyse_materielle_technique TEXT,
    iconographie_symbolique TEXT,
    reception_circulation_posterite TEXT,
    parcours_conservation_doc TEXT,
    -- Fichiers
    file_name TEXT,
    file_path TEXT,
    pdf_link TEXT,
    image_link TEXT,
    -- Références
    artiste_id INTEGER REFERENCES artistes(artiste_id) ON DELETE SET NULL,
    mouvement_id INTEGER REFERENCES mouvements(mouvement_id) ON DELETE SET NULL,
    room INTEGER,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎯 Résultat Final

Un système complet et robuste qui :
- ✅ Extrait automatiquement les métadonnées des PDFs
- ✅ Enregistre toutes les informations en base de données
- ✅ Nettoie automatiquement les fichiers orphelins
- ✅ Garantit la cohérence entre fichiers et DB
- ✅ Évite l'accumulation de fichiers inutiles
- ✅ Fonctionne en production avec Docker

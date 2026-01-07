# 🎯 MIGRATION SYSTÈME VRAIMENT DYNAMIQUE
**Support de N critères variables - Plus de hardcoding !**

## ❌ AVANT (Hardcodé pour 3 critères fixes)

### Base de données
```sql
CREATE TABLE pregenerations (
    age_cible_id INTEGER NOT NULL,      -- ❌ Hardcodé
    thematique_id INTEGER NOT NULL,     -- ❌ Hardcodé
    style_texte_id INTEGER NOT NULL     -- ❌ Hardcodé
);
```

### Code Python
```python
def generate_parcours(age_cible_id, thematique_id, style_texte_id):
    # ❌ Assume toujours 3 paramètres fixes
```

### API
```json
{
  "age_cible": "adulte",           // ❌ Hardcodé
  "thematique": "technique",       // ❌ Hardcodé
  "style_texte": "analyse"         // ❌ Hardcodé
}
```

**Problèmes** : 
- Impossible d'avoir 2 critères ou 5 critères
- Impossible d'ajouter de nouveaux types de critères sans modifier le code
- Noms de critères hardcodés (`age`, `thematique`, `style_texte`)

---

## ✅ MAINTENANT (Vraiment dynamique pour N critères)

### Base de données
```sql
-- Table flexible avec JSONB pour N critères
CREATE TABLE pregenerations (
    pregeneration_id SERIAL PRIMARY KEY,
    oeuvre_id INTEGER NOT NULL,
    criteria_combination JSONB NOT NULL,  -- ✅ {"age": 1, "thematique": 4} ou {"age": 1, "niveau": 3, "humeur": 2}
    pregeneration_text TEXT NOT NULL,
    UNIQUE(oeuvre_id, criteria_combination)
);

-- Table de liaison pour faciliter les JOIN
CREATE TABLE pregeneration_criterias (
    pregeneration_id INTEGER NOT NULL,
    criteria_id INTEGER NOT NULL,
    PRIMARY KEY (pregeneration_id, criteria_id)
);
```

### Code Python
```python
def generate_parcours(criteria_dict: Dict[str, int]):
    """
    criteria_dict peut contenir 1 à N critères :
    - {"age": 1}
    - {"age": 1, "thematique": 4}
    - {"age": 1, "thematique": 4, "style_texte": 7}
    - {"age": 1, "niveau": 3, "humeur": 2, "accessibilite": 5}
    """
```

### API
```json
{
  "criteria": {                    // ✅ Dict flexible
    "age": "adulte",               // Peut avoir N critères
    "thematique": "technique",
    "style_texte": "analyse"
    // Ou juste {"age": "enfant"}
    // Ou {"age": "adulte", "niveau": "expert", "humeur": "curieux"}
  },
  "target_duration_minutes": 60
}
```

---

## 📋 FICHIERS MODIFIÉS

### 1. Base de données
- ✅ `database/init.sql` 
  - Table `pregenerations` avec `criteria_combination JSONB`
  - Table `pregeneration_criterias` pour liaison
  - Indexes GIN pour recherche rapide

### 2. Backend Python
- ✅ `backend/rag/core/pregeneration_db.py`
  - `add_pregeneration(criteria_dict)` au lieu de 3 params
  - `get_pregeneration(criteria_dict)`
  - `get_artwork_pregenerations()` avec JOIN dynamique

- ✅ `backend/rag/core/criteria_service.py`
  - `validate_criteria_combination(criteria_dict)`
  - `get_required_criteria_types()` - Liste des types obligatoires
  - `validate_required_criteria(criteria_dict)` - Vérifie présence

- ✅ `backend/rag/parcours/intelligent_path_generator.py`
  - `generer_parcours_intelligent(criteria_dict)`
  - `generate_parcours(criteria_dict)`
  - `_fetch_artworks_with_narrations(criteria_dict)` - Query JSONB

- ✅ `backend/rag/main_postgres.py`
  - `/api/pregenerations` POST - Accepte `{"criteria": {...}}`
  - `/api/parcours/generate` POST - Accepte `{"criteria": {...}}`
  - `/api/debug/pregenerations` - Affiche dict de critères

- ❌ `backend/rag/utils/intelligent_generator.py` - **SUPPRIMÉ** (non utilisé, hardcodé)

### 3. Frontend
- ✅ `museum-voice/src/pages/mes_choix/MesChoix.jsx`
  - Envoie `{"criteria": {type: name}}` au lieu de props séparées
  - Support dynamique de N critères actifs

---

## 🔄 MIGRATION DES DONNÉES

Si vous avez des prégénérations existantes avec anciennes colonnes :

```sql
-- Migration des anciennes données vers le nouveau format
INSERT INTO pregenerations (oeuvre_id, criteria_combination, pregeneration_text, voice_link)
SELECT 
    oeuvre_id,
    jsonb_build_object(
        'age', age_cible_id,
        'thematique', thematique_id,
        'style_texte', style_texte_id
    ) as criteria_combination,
    pregeneration_text,
    voice_link
FROM pregenerations_old;

-- Peupler la table de liaison
INSERT INTO pregeneration_criterias (pregeneration_id, criteria_id)
SELECT p.pregeneration_id, criteria_id
FROM pregenerations p,
     LATERAL jsonb_each_text(p.criteria_combination) AS kv(key, value)
WHERE criteria_id::text = value;
```

---

## 🎯 AVANTAGES DU NOUVEAU SYSTÈME

### ✅ Flexibilité totale
- **2 critères** : `{"age": 1, "niveau": 3}`
- **3 critères** : `{"age": 1, "thematique": 4, "style_texte": 7}`
- **5 critères** : `{"age": 1, "niveau": 3, "humeur": 2, "accessibilite": 5, "langue": 1}`

### ✅ Extensibilité sans code
Ajouter un nouveau type de critère :
1. INSERT dans `criteria_types` : `{'type_name': 'niveau', 'label': 'Niveau de connaissance', 'is_required': false}`
2. INSERT dans `criterias` : Les paramètres (débutant, expert...)
3. **Aucun code à modifier !**

### ✅ Critères optionnels vs obligatoires
- `criteria_types.is_required = true` → Critère obligatoire
- `criteria_types.is_required = false` → Critère optionnel
- Le backend valide automatiquement

### ✅ Performance
- Index GIN sur JSONB pour recherche rapide
- Table de liaison pour JOIN efficaces
- Pas de colonnes NULL inutiles

---

## 🧪 EXEMPLE D'UTILISATION

### Frontend - Génération de parcours
```javascript
const apiPayload = {
  criteria: {
    age: "adulte",
    thematique: "biographie",
    style_texte: "decouverte"
  },
  target_duration_minutes: 60,
  generate_audio: true
};

fetch('/api/parcours/generate', {
  method: 'POST',
  body: JSON.stringify(apiPayload)
});
```

### Backend - Créer une prégénération
```python
from backend.rag.core.pregeneration_db import add_pregeneration

pregeneration_id = add_pregeneration(
    oeuvre_id=123,
    criteria_dict={
        "age": 1,           # enfant
        "thematique": 4,    # technique_picturale
        "style_texte": 7    # analyse
    },
    pregeneration_text="Texte généré..."
)
```

### Backend - Récupérer une prégénération
```python
from backend.rag.core.pregeneration_db import get_pregeneration

pregen = get_pregeneration(
    oeuvre_id=123,
    criteria_dict={"age": 1, "thematique": 4, "style_texte": 7}
)
```

---

## ⚠️ BREAKING CHANGES

### Pour les anciens appels API

**Ancien format (ne fonctionne plus)** :
```json
{
  "age_cible": "adulte",
  "thematique": "technique",
  "style_texte": "analyse"
}
```

**Nouveau format** :
```json
{
  "criteria": {
    "age": "adulte",
    "thematique": "technique",
    "style_texte": "analyse"
  }
}
```

### Pour les scripts Python

**Ancien** :
```python
generator.generate_parcours(
    age_cible_id=1,
    thematique_id=4,
    style_texte_id=7
)
```

**Nouveau** :
```python
generator.generate_parcours(
    criteria_dict={
        "age": 1,
        "thematique": 4,
        "style_texte": 7
    }
)
```

---

## 🚀 PROCHAINES ÉTAPES

1. **Rebuild Docker** : `docker-compose down && docker-compose up --build`
2. **Migration données** : Exécuter le script SQL si vous avez des données existantes
3. **Tester** : Vérifier que la génération de parcours fonctionne avec différentes combinaisons
4. **Ajouter de nouveaux critères** : Via l'admin `/admin/profils`

---

## 📊 COMPARAISON

| Fonctionnalité | Ancien système | Nouveau système |
|---------------|----------------|-----------------|
| Nombre de critères | ❌ 3 fixes | ✅ 1 à N variables |
| Ajout nouveau critère | ❌ Modifier code + BDD | ✅ INSERT en BDD seulement |
| Critères optionnels | ❌ Impossible | ✅ is_required flag |
| Performance | ⚠️ Colonnes NULL | ✅ JSONB + GIN index |
| Flexibilité | ❌ 0% | ✅ 100% |
| Maintenance | ❌ Complexe | ✅ Simple |

**Le système est maintenant VRAIMENT dynamique ! 🎉**

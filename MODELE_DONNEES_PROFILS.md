# Modèle de Données - Gestion des Profils

## 📋 Structure Simplifiée

### 1. Types de Critères

**Formulaire de Création** :
- ✅ **Nom** (requis) - Ex: "Âge", "Thématique", "Accessibilité"

**Génération Automatique** :
- 🔢 **ID numérique** (`type_id`) - Auto-incrémenté par PostgreSQL
- 🔧 **ID technique** (`type`) - Généré depuis le nom (ex: "Âge" → `age`)

**Exemple** :
```
Nom saisi : "Âge du visiteur"
↓
Base de données :
- type_id: 1 (auto)
- type: "age_du_visiteur" (auto)
- label: "Âge du visiteur"
```

### 2. Critères

**Formulaire de Création** :
- ✅ **Nom** (requis) - Ex: "Enfant", "Adulte", "Senior"
- ✅ **Description** (requis) - Description complète du critère
- ❌ **Image** (optionnel) - URL de l'image
- ❌ **Instruction IA** (optionnel) - Instructions spécifiques pour la génération

**Génération Automatique** :
- 🔢 **ID numérique** (`criteria_id`) - Auto-incrémenté
- 🔧 **ID technique** (`name`) - Généré depuis le nom (ex: "Enfant (6-12 ans)" → `enfant_6_12_ans`)
- 🔢 **Ordre** (`ordre`) - Position dans la liste (auto)

**Exemple** :
```
Type : age (déjà créé)
Nom saisi : "Enfant (6-12 ans)"
Description : "Pour les jeunes visiteurs"
Image : (vide)
Instruction IA : "Utilise un langage simple et ludique"
↓
Base de données :
- criteria_id: 1 (auto)
- type: "age"
- name: "enfant_6_12_ans" (auto)
- label: "Enfant (6-12 ans)"
- description: "Pour les jeunes visiteurs"
- image_link: NULL
- ai_indication: "Utilise un langage simple et ludique"
- ordre: 0 (auto)
```

## 🗄️ Schéma PostgreSQL

```sql
-- Table des types de critères
CREATE TABLE criteria_types (
    type_id SERIAL PRIMARY KEY,           -- ID numérique auto
    type TEXT NOT NULL UNIQUE,            -- ID technique (généré auto)
    label TEXT NOT NULL,                  -- Nom affiché
    description TEXT,                     -- Description du type
    ordre INTEGER DEFAULT 0,              -- Ordre d'affichage
    is_required BOOLEAN DEFAULT TRUE,     -- Si obligatoire
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des critères
CREATE TABLE criterias (
    criteria_id SERIAL PRIMARY KEY,       -- ID numérique auto
    type TEXT NOT NULL,                   -- Référence au type (via ID technique)
    name TEXT NOT NULL,                   -- ID technique (généré auto)
    label TEXT NOT NULL,                  -- Nom affiché (requis)
    description TEXT,                     -- Description (requis)
    image_link TEXT,                      -- URL image (OPTIONNEL)
    ai_indication TEXT,                   -- Instructions IA (OPTIONNEL)
    ordre INTEGER DEFAULT 0,              -- Ordre (généré auto)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, name),                   -- Un critère unique par type
    FOREIGN KEY (type) REFERENCES criteria_types(type) ON DELETE CASCADE
);
```

## 🔄 Génération des IDs Techniques

**Fonction de transformation** :
```javascript
function generateTechnicalName(label) {
  return label
    .toLowerCase()                        // Minuscules
    .normalize('NFD')                     // Décomposition Unicode
    .replace(/[\u0300-\u036f]/g, '')     // Suppression accents
    .replace(/[^a-z0-9\s]/g, '')         // Suppression caractères spéciaux
    .trim()                               // Suppression espaces début/fin
    .replace(/\s+/g, '_')                // Espaces → underscores
}
```

**Exemples** :
| Nom Saisi | ID Technique Généré |
|-----------|---------------------|
| "Âge" | `age` |
| "Thématique Artistique" | `thematique_artistique` |
| "PMR - Accessibilité" | `pmr_accessibilite` |
| "Enfant (6-12 ans)" | `enfant_6_12_ans` |
| "Analyse Technique" | `analyse_technique` |

## 🎨 Interface Utilisateur

### Formulaire "Nouveau Type"
```
┌────────────────────────────────────┐
│ Nouveau Type de Critère            │
├────────────────────────────────────┤
│ Nom du Type *                      │
│ ┌────────────────────────────────┐ │
│ │ Âge du visiteur                │ │
│ └────────────────────────────────┘ │
│ L'identifiant technique sera       │
│ généré automatiquement             │
│                                    │
│ [Annuler]  [Créer]                 │
└────────────────────────────────────┘
```

### Formulaire "Nouveau Critère"
```
┌────────────────────────────────────┐
│ Nouveau Critère                    │
├────────────────────────────────────┤
│ Type : Âge du visiteur             │
│                                    │
│ Nom *                              │
│ ┌────────────────────────────────┐ │
│ │ Enfant (6-12 ans)              │ │
│ └────────────────────────────────┘ │
│                                    │
│ Description *                      │
│ ┌────────────────────────────────┐ │
│ │ Pour les jeunes visiteurs      │ │
│ │                                │ │
│ └────────────────────────────────┘ │
│                                    │
│ URL de l'Image (optionnel)         │
│ ┌────────────────────────────────┐ │
│ │ https://...                    │ │
│ └────────────────────────────────┘ │
│                                    │
│ Instruction pour l'IA (optionnel)  │
│ ┌────────────────────────────────┐ │
│ │ Utilise un langage simple      │ │
│ │ et ludique                     │ │
│ └────────────────────────────────┘ │
│                                    │
│ [Annuler]  [Créer]                 │
└────────────────────────────────────┘
```

### Affichage des Critères

**Les IDs techniques ne sont PAS affichés** - Seules les informations utiles :

```
╔════════════════════════════════════════╗
║ Âge du Visiteur              [+] [🗑️] ║
║ 3 critère(s)                           ║
╠════════════════════════════════════════╣
║ [IMG] Enfant (6-12 ans)     [✏️] [🗑️] ║
║       Pour les jeunes visiteurs        ║
║       ┌──────────────────────────────┐ ║
║       │ IA: Langage simple et ludique│ ║
║       └──────────────────────────────┘ ║
╚════════════════════════════════════════╝
```

## ⚙️ Logique API

**POST /api/criterias** (Créer critère) :
1. Reçoit : `{ type, label, description, image_link?, ai_indication? }`
2. Génère automatiquement `name` depuis `label`
3. Génère automatiquement `ordre` (nombre de critères existants dans le type)
4. Vérifie/crée le type dans `criteria_types` si nécessaire
5. Insère dans `criterias`

**PUT /api/criterias** (Modifier critère) :
1. Reçoit : `{ criteria_id, label, description, image_link?, ai_indication? }`
2. Met à jour uniquement les champs modifiables
3. **Le `name` (ID technique) ne change jamais** une fois créé

**DELETE /api/criterias** (Supprimer critère) :
1. Suppression CASCADE : supprime aussi les prégénérations liées
2. Hard delete (pas de soft delete)

## 📊 Statistiques Calculées

```typescript
// Nombre de types
totalTypes = unique(criterias.type).length

// Nombre de critères
totalCriterias = criterias.length

// Combinaisons possibles
totalCombinations = criterias
  .groupBy('type')
  .reduce((acc, group) => acc * group.length, 1)
```

**Exemple** :
- Type "Âge" : 3 critères → 3 options
- Type "Thématique" : 4 critères → 4 options
- Type "Style" : 2 critères → 2 options

**Combinaisons** : 3 × 4 × 2 = **24 profils possibles**

## ✅ Récapitulatif

### Champs Requis
- ✅ Type : **Nom** uniquement
- ✅ Critère : **Nom** + **Description**

### Champs Optionnels
- ❌ Critère : **Image** + **Instruction IA**

### Champs Auto-Générés (Invisibles)
- 🔢 IDs numériques (`type_id`, `criteria_id`)
- 🔧 IDs techniques (`type`, `name`)
- 🔢 Ordre (`ordre`)
- 📅 Timestamps (`created_at`, `updated_at`)

### Interface
- **Pas d'affichage** des IDs techniques (sauf debug/dev)
- **Formulaires simples** : uniquement les champs utiles
- **Génération transparente** : tout se passe en arrière-plan
- **Validation** : Contraintes `UNIQUE` en base pour éviter doublons

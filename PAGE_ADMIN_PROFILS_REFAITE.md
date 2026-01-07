# Gestion des Profils - Page Admin Refaite

## ✅ Modifications Effectuées

### 1. Interface Complètement Refaite
- **Vue globale en tableau** : Affichage de tous les types de critères avec leurs critères associés
- **Design compact et scrollable** : Interface optimisée pour gérer beaucoup de données
- **Modals pour CRUD** : Formulaires dans des modals (pas d'emojis, que des icônes)
- **Calcul automatique** : Nombre de types, critères totaux et **combinaisons possibles**

### 2. Génération Automatique des IDs Techniques
**Nouveau comportement** : Le champ `name` (ID technique) est généré automatiquement depuis le `label`

**Exemples de transformation** :
- "Enfant (6-12 ans)" → `enfant_6_12_ans`
- "Analyse Technique" → `analyse_technique`
- "PMR - Accessibilité" → `pmr_accessibilite`

**Règles** :
1. Tout en minuscules
2. Suppression des accents (é → e, à → a)
3. Suppression des caractères spéciaux (parenthèses, tirets, etc.)
4. Espaces remplacés par des underscores `_`

### 3. Structure de la Page

#### **Header avec Stats**
```
┌─────────────────────────────────────────────────────────┐
│  Gestion des Profils                [Nouveau Type]      │
│  Critères Types et Critères Individuels                 │
├─────────────────────────────────────────────────────────┤
│  [3 Types]  [12 Critères]  [108 Combinaisons Possibles] │
└─────────────────────────────────────────────────────────┘
```

#### **Groupes de Critères (Scrollable)**
Chaque type de critère affiche :
- **Header coloré** : Nom du type, ID technique, nombre de critères, boutons Ajouter/Supprimer
- **Grille de critères** : 2-3 colonnes avec :
  - Image (avec fallback)
  - Nom + ID technique
  - Description
  - Indication IA (si présente, en violet)
  - Boutons Modifier/Supprimer

```
╔═══════════════════════════════════════════════════════╗
║ Âge du Visiteur                          [+] [🗑️]     ║
║ age  •  3 critère(s)                                  ║
╠═══════════════════════════════════════════════════════╣
║ [IMG] Enfant                [✏️] [🗑️]                  ║
║       enfant_6_12_ans                                 ║
║       Pour les jeunes visiteurs                       ║
║       ┌──────────────────────────────┐                ║
║       │ IA: Langage simple et ludique│                ║
║       └──────────────────────────────┘                ║
╚═══════════════════════════════════════════════════════╝
```

### 4. Modals

#### **Modal "Nouveau Type"**
- Champ : Nom du Type
- Affichage en temps réel de l'ID technique généré
- Boutons : Annuler / Créer

#### **Modal "Nouveau Critère"**
- Type : (affiché en info, non modifiable)
- Nom du Critère (requis) → ID généré automatiquement
- Description (optionnel)
- URL de l'Image (optionnel)
- Indication pour l'IA (optionnel, en violet)
- Boutons : Annuler / Créer

#### **Modal "Modifier Critère"**
- Info : Type + ID technique (non modifiables)
- Nom, Description, Image, Indication IA (modifiables)
- Boutons : Annuler / Enregistrer

### 5. Base de Données Ajustée

#### **Modifications dans l'API** (`app/api/criterias/route.ts`)
- ✅ Utilise `type` au lieu de `type_name`
- ✅ Plus de colonne `is_active`
- ✅ **Création automatique du type** dans `criteria_types` si nécessaire (via `ON CONFLICT DO NOTHING`)
- ✅ DELETE réel (pas de soft delete)

#### **Schéma PostgreSQL** (`database/init.sql`)
```sql
CREATE TABLE criteria_types (
    type_id SERIAL PRIMARY KEY,
    type TEXT NOT NULL UNIQUE,         -- ID technique
    label TEXT NOT NULL,               -- Nom affiché
    ordre INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE
);

CREATE TABLE criterias (
    criteria_id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,                -- Référence au type
    name TEXT NOT NULL,                -- ID technique généré auto
    label TEXT NOT NULL,               -- Nom affiché
    description TEXT,
    image_link TEXT,
    ai_indication TEXT,                -- Instructions pour l'IA (optionnel)
    ordre INTEGER DEFAULT 0,
    UNIQUE(type, name),
    FOREIGN KEY (type) REFERENCES criteria_types(type) ON DELETE CASCADE
);
```

### 6. Workflow Utilisateur

#### **Créer un nouveau type de critère**
1. Cliquer sur "Nouveau Type"
2. Entrer le nom (ex: "Niveau d'Expertise")
3. Voir l'ID généré automatiquement (`niveau_d_expertise`)
4. Créer
5. Le type apparaît vide → Ajouter des critères

#### **Ajouter un critère à un type**
1. Dans le header du type, cliquer sur "Ajouter"
2. Entrer le nom (ex: "Débutant")
3. (Optionnel) Description, Image, Indication IA
4. Voir l'ID technique généré (`debutant`)
5. Créer

#### **Modifier un critère**
1. Cliquer sur l'icône crayon
2. Modifier label, description, image, indication IA
3. L'ID technique reste inchangé (affiché en lecture seule)
4. Enregistrer

#### **Supprimer un critère**
1. Cliquer sur l'icône poubelle
2. Confirmation : "Toutes les prégénérations liées seront supprimées"
3. Suppression CASCADE

#### **Supprimer un type**
1. Cliquer sur la poubelle dans le header du type
2. Confirmation : "Cela supprimera X critères associés et toutes les prégénérations"
3. Suppression CASCADE de tous les critères du type

### 7. Calcul des Combinaisons

**Formule** : Produit du nombre de critères par type

**Exemple** :
- Âge : 3 critères (Enfant, Adulte, Senior)
- Thématique : 4 critères (Technique, Biographie, Historique, Symbolisme)
- Style : 3 critères (Analyse, Récit, Vulgarisé)

**Combinaisons** : 3 × 4 × 3 = **36 profils possibles**

### 8. Icônes Utilisées (Lucide React)

- `FolderPlus` : Nouveau type
- `Plus` : Ajouter critère
- `Pencil` : Modifier
- `Trash2` : Supprimer
- `X` : Fermer modal
- `Save` : Enregistrer
- `ImageIcon` : URL image
- `ListTree` : État vide
- `ArrowLeft` : Retour

**Pas d'emojis** : Uniquement des icônes SVG propres

### 9. Champs du Formulaire

| Champ | Type | Requis | Généré Auto | Notes |
|-------|------|--------|-------------|-------|
| `type` (Type de Critère) | Modal Nouveau Type | ✅ | ✅ depuis label | ex: `accessibilite` |
| `name` (ID Critère) | Auto | ❌ | ✅ depuis label | ex: `pmr` |
| `label` (Nom) | Text | ✅ | ❌ | Affiché partout |
| `description` | Textarea | ❌ | ❌ | Description longue |
| `image_link` | URL | ❌ | ❌ | Lien vers image |
| `ai_indication` | Textarea | ❌ | ❌ | Instructions pour IA |
| `ordre` | Auto | ❌ | ✅ | Position dans la liste |

### 10. Points Clés

✅ **Pas besoin de remplir l'ID** : Généré automatiquement
✅ **Type créé automatiquement** : Dans `criteria_types` si besoin
✅ **Calcul en temps réel** : Stats mises à jour après chaque action
✅ **Interface compacte** : Scroll si beaucoup de données
✅ **Hard delete** : Suppression CASCADE complète
✅ **Fallback image** : `/images/default-criteria.svg`
✅ **Validation** : Contrainte `UNIQUE(type, name)` en base

### 11. Exemple de Flux Complet

```
1. Créer type "Accessibilité" → génère `accessibilite`
2. Ajouter critère "PMR" → génère `pmr`
3. Ajouter critère "Malvoyant" → génère `malvoyant`
4. Ajouter critère "Sourd" → génère `sourd`

Base de données :
criteria_types: { type: 'accessibilite', label: 'Accessibilité' }
criterias:
  - { type: 'accessibilite', name: 'pmr', label: 'PMR' }
  - { type: 'accessibilite', name: 'malvoyant', label: 'Malvoyant' }
  - { type: 'accessibilite', name: 'sourd', label: 'Sourd' }

Combinaisons : ancien_total × 3 (nouveau)
```

## 🎯 Prochaines Étapes

1. ✅ **Page admin refaite**
2. ⏳ Tester la création de critères
3. ⏳ Vérifier le calcul des combinaisons
4. ⏳ Adapter les autres pages (parcours, qrcode) pour afficher dynamiquement
5. ⏳ Créer interface visiteur pour sélection des critères

## 📝 Notes Techniques

- **TypeScript** : Interfaces complètes pour type safety
- **React Hooks** : `useState`, `useEffect` pour gestion d'état
- **Next.js 16** : App Router avec Server/Client Components
- **Tailwind CSS** : Classes utilitaires pour design responsive
- **PostgreSQL** : Base relationnelle avec CASCADE DELETE
- **Lucide Icons** : Bibliothèque d'icônes modernes

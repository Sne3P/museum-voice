# 🌱 Seed des Narrations Dynamiques

## Vue d'ensemble

Script intelligent pour remplir automatiquement toutes les narrations prégénérées avec **critères dynamiques** depuis la base de données.

### Caractéristiques

✅ **Dynamique** - Charge les critères depuis `criteria_types` et `criterias`  
✅ **Intelligent** - N'ajoute QUE les narrations manquantes (pas de remplacement)  
✅ **Combinatoire** - Génère toutes les combinaisons possibles (produit cartésien)  
✅ **JSONB** - Format flexible `{"age": 1, "thematique": 4, "style_texte": 7}`  
✅ **Table de liaison** - Remplit automatiquement `pregeneration_criterias` pour JOIN rapides

---

## 📊 Exemple de sortie

Avec les 3 critères actuels :
- **age** : 4 options (enfant, ado, adulte, senior)
- **thematique** : 3 options (technique_picturale, biographie, historique)
- **style_texte** : 3 options (analyse, decouverte, anecdote)

**Total combinaisons** : 4 × 3 × 3 = **36 narrations par œuvre**

Pour 4 œuvres → **144 narrations** générées automatiquement

---

## 🚀 Commandes pnpm

### Seed complet (intelligent)
```powershell
pnpm db:seed
```

**Ce que ça fait :**
1. 🔌 Se connecte à PostgreSQL
2. 📋 Charge tous les types de critères et leurs options
3. 🔢 Génère toutes les combinaisons possibles
4. 📝 Insère SEULEMENT les narrations manquantes (skip si existe)
5. 🔗 Remplit la table de liaison `pregeneration_criterias`
6. 📊 Affiche les statistiques finales

**Sortie :**
```
📋 3 types de critères trouvés:
   [1] age - Âge du visiteur (✅ REQUIS)
      → 4 options: enfant, ado, adulte, senior
   [2] thematique - Thématique (✅ REQUIS)
      → 3 options: technique_picturale, biographie, historique
   [3] style_texte - Style de narration (✅ REQUIS)
      → 3 options: analyse, decouverte, anecdote

🔢 36 combinaisons totales générées

📝 Œuvre #1: Profil sombre (Eugène Leroy)
   Déjà prégénéré: 0/36
   ✅ 36 nouvelles narrations ajoutées

✅ Seed terminé!
   - 144 nouvelles narrations insérées
   - 0 combinaisons déjà existantes (non modifiées)
```

---

### Test rapide (vérification)
```powershell
pnpm db:seed:test
```

**Sortie :**
```
Total narrations: 144
Total oeuvres: 4
```

---

## 🔧 Fonctionnement technique

### 1. Chargement des critères dynamiques
```python
# Charge depuis criteria_types
types = ["age", "thematique", "style_texte"]

# Pour chaque type, charge les options depuis criterias
criteria_map = {
    "age": [
        {criteria_id: 1, name: "enfant", ...},
        {criteria_id: 2, name: "ado", ...},
        ...
    ],
    "thematique": [...],
    "style_texte": [...]
}
```

### 2. Génération des combinaisons
```python
# Produit cartésien de toutes les options
combinations = itertools.product(
    age_options,
    thematique_options,
    style_texte_options
)

# Résultat : Liste de dicts JSONB
[
    {"age": 1, "thematique": 4, "style_texte": 7},
    {"age": 1, "thematique": 4, "style_texte": 8},
    ...
]
```

### 3. Insertion intelligente
```sql
-- Pour chaque œuvre et chaque combinaison
INSERT INTO pregenerations (oeuvre_id, criteria_combination, pregeneration_text)
VALUES (1, '{"age": 1, "thematique": 4, "style_texte": 7}', 'Lorem ipsum...')
ON CONFLICT (oeuvre_id, criteria_combination) DO NOTHING
```

**ON CONFLICT DO NOTHING** = Skip si déjà existe (mode intelligent)

### 4. Table de liaison (performance)
```sql
-- Permet JOIN rapides sur criteria_id
INSERT INTO pregeneration_criterias (pregeneration_id, criteria_id)
VALUES 
    (1, 1),  -- age=enfant
    (1, 4),  -- thematique=technique_picturale
    (1, 7);  -- style_texte=analyse
```

---

## 📦 Structure des données

### Table `pregenerations`
| Colonne | Type | Exemple |
|---------|------|---------|
| `pregeneration_id` | SERIAL | 1 |
| `oeuvre_id` | INTEGER | 1 |
| `criteria_combination` | **JSONB** | `{"age": 1, "thematique": 4, "style_texte": 7}` |
| `pregeneration_text` | TEXT | "Lorem ipsum..." |
| `voice_link` | TEXT | NULL |

### Table `pregeneration_criterias` (jointure)
| Colonne | Type | Exemple |
|---------|------|---------|
| `pregeneration_id` | INTEGER | 1 |
| `criteria_id` | INTEGER | 1 (enfant) |

**Index GIN** sur `criteria_combination` pour recherche ultra-rapide

---

## 🎯 Cas d'usage

### Ajouter un nouveau critère
1. Ajouter le type dans `criteria_types` :
   ```sql
   INSERT INTO criteria_types (type, label, ordre, is_required)
   VALUES ('accessibilite', 'Accessibilité', 4, false);
   ```

2. Ajouter les options dans `criterias` :
   ```sql
   INSERT INTO criterias (type, name, label, ordre)
   VALUES 
       ('accessibilite', 'visuel', 'Déficience visuelle', 1),
       ('accessibilite', 'auditif', 'Déficience auditive', 2),
       ('accessibilite', 'moteur', 'Déficience motrice', 3);
   ```

3. Lancer le seed :
   ```powershell
   pnpm db:seed
   ```

**Résultat automatique :**
- Anciennes combinaisons : **skipped** (déjà existe)
- Nouvelles combinaisons : **36 × 3 = 108 nouvelles narrations** par œuvre

**Sans rebuild ni modification du code !** 🎉

---

### Ajouter une nouvelle œuvre
1. Insérer dans `oeuvres` :
   ```sql
   INSERT INTO oeuvres (title, artist, created_year, ...)
   VALUES ('Nouvelle œuvre', 'Artiste', 2024, ...);
   ```

2. Seed :
   ```powershell
   pnpm db:seed
   ```

**Résultat automatique :** 36 narrations créées pour cette œuvre

---

## 🧹 Maintenance

### Supprimer toutes les narrations
```sql
TRUNCATE pregenerations CASCADE;
```

Puis re-seed :
```powershell
pnpm db:seed
```

### Vérifier l'intégrité
```sql
-- Nombre de narrations par œuvre (devrait être identique)
SELECT o.title, COUNT(p.pregeneration_id) as nb_narrations
FROM oeuvres o
LEFT JOIN pregenerations p ON o.oeuvre_id = p.oeuvre_id
GROUP BY o.oeuvre_id, o.title
ORDER BY nb_narrations DESC;

-- Nombre total attendu
SELECT 
    (SELECT COUNT(*) FROM oeuvres) * 
    (SELECT COUNT(*) FROM criterias WHERE type='age') *
    (SELECT COUNT(*) FROM criterias WHERE type='thematique') *
    (SELECT COUNT(*) FROM criterias WHERE type='style_texte')
    AS expected_total;
```

---

## 🚨 Troubleshooting

### Erreur : "Aucun type de critère trouvé"
**Cause :** Table `criteria_types` vide

**Solution :** Vérifier que `init.sql` a bien seedé les types
```sql
SELECT * FROM criteria_types ORDER BY ordre;
```

---

### Erreur : "Aucune œuvre trouvée"
**Cause :** Table `oeuvres` vide

**Solution :** Importer des œuvres via l'éditeur ou SQL
```sql
SELECT COUNT(*) FROM oeuvres;
```

---

### Seed ne détecte pas les nouvelles combinaisons
**Cause :** Clé UNIQUE sur `(oeuvre_id, criteria_combination)`

**Solution :** Vérifier que le JSONB est bien normalisé (clés triées)
```python
# Le script trie automatiquement les clés
combo_normalized = json.dumps(combination, sort_keys=True)
```

---

## 📚 Références

**Fichiers :**
- Script : [`backend/seed_narrations_dynamic.py`](backend/seed_narrations_dynamic.py)
- Schema : [`database/init.sql`](database/init.sql#L205-L220)
- Commandes : [`package.json`](package.json#L21-L22)

**Requête API :**
```python
# Recherche de narration avec critères exacts
GET /api/narrations?oeuvre_id=1&age=1&thematique=4&style_texte=7

# Utilise l'index GIN sur criteria_combination
WHERE criteria_combination @> '{"age": 1, "thematique": 4, "style_texte": 7}'::jsonb
```

---

## ✅ Checklist déploiement

- [ ] Database initialisée avec `init.sql`
- [ ] Tables `criteria_types` et `criterias` remplies (10+ critères)
- [ ] Au moins 1 œuvre dans la table `oeuvres`
- [ ] Backend container démarré avec script seed copié
- [ ] Lancer `pnpm db:seed` une fois
- [ ] Vérifier avec `pnpm db:seed:test`
- [ ] Tester une génération de parcours via l'API

**Temps d'exécution :** ~2-5 secondes pour 144 narrations

**Fréquence :** 1 fois après chaque ajout d'œuvre ou critère

---

## 🎉 Résultat

**Avant :** Système hardcodé avec 3 critères fixes → impossible d'ajouter des critères

**Après :** Système 100% dynamique → ajouter un critère = 1 INSERT SQL + `pnpm db:seed` ✨

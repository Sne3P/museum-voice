# 📊 AUDIT COMPLET - PROFILS HARDCODÉS DANS MUSEUM VOICE

**Date**: 6 Janvier 2026  
**Objectif**: Identifier tous les endroits où les profils sont hardcodés pour les rendre paramétrables via la base de données

---

## 🎯 RÉSUMÉ EXÉCUTIF

Le projet Museum Voice utilise actuellement **3 paramètres de profil hardcodés** partout dans le code :

1. **`age_cible`** : `enfant`, `ado`, `adulte`, `senior`
2. **`thematique`** : `technique_picturale`, `biographie`, `historique`
3. **`style_texte`** : `analyse`, `decouverte`, `anecdote`

Ces valeurs sont hardcodées dans **4 couches distinctes** :
- Base de données (contraintes CHECK)
- Backend Python (validation, génération)
- Frontend React (museum-voice client)
- Frontend Next.js (dashboard admin)

---

## 🏗️ ARCHITECTURE DU PROJET

### Structure des conteneurs Docker

```
┌─────────────────────────────────────────────────────────────────┐
│                     MUSEUM VOICE SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ museum-app   │  │museum-client │  │museum-backend│         │
│  │ Next.js 16   │  │  React SPA   │  │ Flask Python │         │
│  │ Port 3000    │  │  Port 8080   │  │  Port 5000   │         │
│  │ (Dashboard)  │  │ (Audioguide) │  │  (RAG/TTS)   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                           │                                      │
│                    ┌──────▼───────┐                             │
│                    │  museum-db   │                             │
│                    │ PostgreSQL16 │                             │
│                    │  Port 5432   │                             │
│                    └──────────────┘                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           museum-ollama-dev (Mistral LLM)                 │  │
│  │                  Port 11434                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Flux de génération de narrations

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Admin Dashboard (Next.js)                                  │
│    └─> Bouton "Générer narrations" avec profils hardcodés    │
│        (enfant/ado/adulte/senior + thématiques + styles)     │
└────────────────────┬─────────────────────────────────────────┘
                     │ POST /api/pregenerations/generate
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Backend Flask (Python)                                     │
│    ├─> Validation des profils (hardcodé)                     │
│    ├─> Récupération PDF + Chunks                             │
│    ├─> Génération RAG/LLM (Ollama Mistral)                   │
│    └─> Sauvegarde dans table `pregenerations`                │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Base de données PostgreSQL                                 │
│    └─> Table `pregenerations` avec CHECK constraints         │
│        (age_cible, thematique, style_texte hardcodés)        │
└──────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Client Audioguide (React)                                  │
│    └─> Sélection profil via composants avec valeurs fixes    │
│        (AgeSelector, ThematiqueSelector, StyleTexteSelector)  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🗄️ COUCHE 1 : BASE DE DONNÉES

### Table `pregenerations` - Contraintes CHECK hardcodées

**Fichier**: `database/init.sql` (lignes 214-221)

```sql
CREATE TABLE IF NOT EXISTS pregenerations (
    pregeneration_id SERIAL PRIMARY KEY,
    oeuvre_id INTEGER NOT NULL REFERENCES oeuvres(oeuvre_id) ON DELETE CASCADE,
    age_cible TEXT NOT NULL CHECK (age_cible IN ('enfant', 'ado', 'adulte', 'senior')),
    thematique TEXT NOT NULL CHECK (thematique IN ('technique_picturale', 'biographie', 'historique')),
    style_texte TEXT NOT NULL CHECK (style_texte IN ('analyse', 'decouverte', 'anecdote')),
    pregeneration_text TEXT NOT NULL,
    voice_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(oeuvre_id, age_cible, thematique, style_texte)
);
```

### Tables existantes pour paramétrage

**Bonne nouvelle** : Le schéma contient déjà des tables pour gérer les critères de manière dynamique !

```sql
-- Table pour stocker les critères paramétrables
CREATE TABLE IF NOT EXISTS criterias (
    criteria_id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,           -- 'age_cible', 'thematique', 'style_texte'
    name TEXT NOT NULL,            -- 'enfant', 'technique_picturale', 'analyse'
    description TEXT,              -- Description du critère
    image_link TEXT                -- Image/icône pour l'UI
);

-- Table de liaison entre pregenerations et criterias
CREATE TABLE IF NOT EXISTS criterias_pregeneration (
    pregeneration_id INTEGER NOT NULL,
    criteria_id INTEGER NOT NULL,
    PRIMARY KEY (pregeneration_id, criteria_id),
    CONSTRAINT fk_criterias_pregeneration_pregen
        FOREIGN KEY (pregeneration_id)
        REFERENCES pregenerations(pregeneration_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_criterias_pregeneration_criteria
        FOREIGN KEY (criteria_id)
        REFERENCES criterias(criteria_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);
```

**⚠️ PROBLÈME** : Ces tables existent mais ne sont PAS utilisées ! Tout le code utilise les colonnes hardcodées.

---

## 🐍 COUCHE 2 : BACKEND PYTHON

### Fichiers à modifier

#### 2.1 Génération de narrations - `backend/rag/utils/intelligent_generator.py`

**Lignes 48-49, 121-143, 243-249, 389-395**

```python
def generate_content_for_artwork(self, oeuvre_id: int, age_cible: str, 
                               thematique: str, style_texte: str,
                               max_length: int = 400) -> Optional[str]:
    # ...
    
def _extract_thematic_content(self, pdf_content: str, artwork: Dict, thematique: str) -> str:
    """Extraction thématique HARDCODÉE"""
    if thematique == 'technique_picturale':
        sections = ['Analyse matérielle', 'Technique']
    elif thematique == 'biographie': 
        sections = ['Biographie', 'Parcours']
    elif thematique == 'historique':
        sections = ['Contexte historique', 'Époque']
    # ...

def _apply_text_style(self, content: str, style_texte: str, 
                     anecdotes: List, artwork: Dict) -> str:
    """Application du style HARDCODÉE"""
    if style_texte == 'analyse':
        # Format analytique
    elif style_texte == 'decouverte':
        # Format découverte
    elif style_texte == 'anecdote':
        # Format anecdotique
    # ...

def _adapt_for_age(self, content: str, age_cible: str, artwork: Dict) -> str:
    """Adaptation à l'âge HARDCODÉE"""
    if age_cible == 'enfant':
        # Simplification enfant
    elif age_cible == 'ado':
        # Adaptation ado
    elif age_cible == 'adulte':
        # Niveau adulte
    # ...
```

#### 2.2 Génération de parcours - `backend/rag/parcours/intelligent_path_generator.py`

**Lignes 685-696, 724, 741, 755-756, 774-776, 833-835, 936, 943, 1287-1289, 1305-1307**

```python
def generate_parcours(self,
                     age_cible: str,
                     thematique: str,
                     style_texte: str,
                     target_duration_minutes: int = 60,
                     variation_seed: Optional[int] = None) -> Parcours:
    """
    Args:
        age_cible: Âge du visiteur (enfant, ado, adulte, senior)  ← HARDCODÉ
        thematique: Thématique du parcours (technique_picturale, biographie, historique)  ← HARDCODÉ
        style_texte: Style narratif (analyse, decouverte, anecdote)  ← HARDCODÉ
    """
    # ...
    
def _score_artwork_for_profile(self, artwork: Artwork, age_cible: str, thematique: str) -> float:
    """Score basé sur thématiques HARDCODÉES"""
    theme_keywords = {
        'technique_picturale': ['huile', 'acrylique', 'aquarelle', ...],
        'biographie': ['autoportrait', 'portrait', 'vie', ...],
        'historique': ['guerre', 'révolution', 'siècle', ...]
    }
    
    if age_cible == 'enfant':
        if any(word in artwork.title.lower() for word in ['couleur', 'animal', 'nature']):
            score += 0.2
    # ...

def _fetch_artworks_with_narrations(self, cur, age_cible: str, 
                                   thematique: str, style_texte: str):
    """Requête SQL avec profils HARDCODÉS"""
    query = """
        SELECT ...
        WHERE 
            p.age_cible = %s
            AND p.thematique = %s
            AND p.style_texte = %s
    """
    cur.execute(query, (age_cible, thematique, style_texte))
```

#### 2.3 API Flask - `backend/rag/main_postgres.py`

**Lignes 270-272, 796-798, 813-815**

```python
@app.route('/api/pregenerations', methods=['POST'])
def create_pregeneration():
    """Création de prégenération avec validation HARDCODÉE"""
    data = request.get_json()
    
    # Validation (devrait être dynamique)
    required = ['oeuvre_id', 'age_cible', 'thematique', 'style_texte', 'text']
    
    pregeneration_id = add_pregeneration(
        oeuvre_id=data['oeuvre_id'],
        age_cible=data['age_cible'],       # ← Valeur hardcodée attendue
        thematique=data['thematique'],     # ← Valeur hardcodée attendue
        style_texte=data['style_texte'],   # ← Valeur hardcodée attendue
        text=data['text']
    )
```

#### 2.4 Scripts de seed - `backend/seed_narrations.py`

**Lignes 14-16, 35-37**

```python
AGE_OPTIONS = ['enfant', 'ado', 'adulte', 'senior']  # ← HARDCODÉ
THEMATIQUE_OPTIONS = ['technique_picturale', 'biographie', 'historique']  # ← HARDCODÉ
STYLE_OPTIONS = ['analyse', 'decouverte', 'anecdote']  # ← HARDCODÉ

# SQL avec contraintes hardcodées
CREATE TABLE IF NOT EXISTS pregenerations (
    age_cible TEXT NOT NULL CHECK (age_cible IN ('enfant', 'ado', 'adulte', 'senior')),
    thematique TEXT NOT NULL CHECK (thematique IN ('technique_picturale', 'biographie', 'historique')),
    style_texte TEXT NOT NULL CHECK (style_texte IN ('analyse', 'decouverte', 'anecdote')),
    ...
)
```

---

## ⚛️ COUCHE 3 : FRONTEND REACT (museum-voice client)

### Composants avec valeurs hardcodées

#### 3.1 AgeSelector - `museum-voice/src/components/age_selector/AgeSelector.jsx`

**Lignes 7-14**

```jsx
const ageOptions = [
  { id: 'enfant', title: 'Enfant', imageUrl: '/assets/images/testmuseum.png' },
  { id: 'ado', title: 'Adolescent', imageUrl: '/assets/images/testmuseum.png' },
  { id: 'adulte', title: 'Adulte', imageUrl: '/assets/images/testmuseum.png' },
  { id: 'senior', title: 'Senior', imageUrl: '/assets/images/testmuseum.png' },
];

const [selectedAge, setSelectedAge] = useState('adulte');  // Valeur par défaut hardcodée
```

#### 3.2 ThematiqueSelector - `museum-voice/src/components/thematique_selector/ThematiqueSelector.jsx`

**Lignes 7-13**

```jsx
const thematiqueOptions = [
  { id: 'technique_picturale', title: 'Technique Picturale', imageUrl: '/assets/images/testmuseum.png' },
  { id: 'biographie', title: 'Biographie', imageUrl: '/assets/images/testmuseum.png' },
  { id: 'historique', title: 'Contexte Historique', imageUrl: '/assets/images/testmuseum.png' },
];

const [selectedThematique, setSelectedThematique] = useState('technique_picturale');
```

#### 3.3 StyleTexteSelector - `museum-voice/src/components/style_texte_selector/StyleTexteSelector.jsx`

**Lignes 7-13**

```jsx
const styleTexteOptions = [
  { id: 'analyse', title: 'Analyse', imageUrl: '/assets/images/testmuseum.png' },
  { id: 'decouverte', title: 'Découverte', imageUrl: '/assets/images/testmuseum.png' },
  { id: 'anecdote', title: 'Anecdote', imageUrl: '/assets/images/testmuseum.png' },
];

const [selectedStyle, setSelectedStyle] = useState('analyse');
```

#### 3.4 Page MesChoix - `museum-voice/src/pages/mes_choix/MesChoix.jsx`

**Lignes 15-17, 50**

```jsx
const [ageCible, setAgeCible] = useState('adulte');
const [thematique, setThematique] = useState('technique_picturale');
const [styleTexte, setStyleTexte] = useState('analyse');

// Envoi à l'API
const requestData = {
  age_cible: ageCible,      // 'enfant', 'ado', 'adulte', 'senior'
  thematique: thematique,   // 'technique_picturale', 'biographie', 'historique'
  style_texte: styleTexte,  // 'analyse', 'decouverte', 'anecdote'
  duree_souhaitee: dureeSouhaitee
};
```

---

## 🖥️ COUCHE 4 : FRONTEND NEXT.JS (Dashboard Admin)

### Fichiers à identifier

Les fichiers Next.js ne sont pas encore créés pour la gestion des profils dans le dashboard admin, mais quand ils le seront, ils devront :

1. **Afficher** les critères depuis la table `criterias`
2. **Permettre l'édition** (ajouter/modifier/supprimer des critères)
3. **Gérer les images** associées aux critères
4. **Valider** que les profils utilisés existent en BDD

---

## 📋 PLAN DE MIGRATION VERS PROFILS PARAMÉTRABLES

### Phase 1 : Base de données (PRIORITAIRE)

#### 1.1 Peupler la table `criterias`

```sql
-- Insérer les critères d'âge
INSERT INTO criterias (type, name, description, image_link) VALUES
('age_cible', 'enfant', 'Parcours adapté aux enfants (6-12 ans)', '/images/age/enfant.png'),
('age_cible', 'ado', 'Parcours pour adolescents (13-17 ans)', '/images/age/ado.png'),
('age_cible', 'adulte', 'Parcours adulte standard', '/images/age/adulte.png'),
('age_cible', 'senior', 'Parcours adapté aux seniors (65+ ans)', '/images/age/senior.png');

-- Insérer les thématiques
INSERT INTO criterias (type, name, description, image_link) VALUES
('thematique', 'technique_picturale', 'Focus sur les techniques artistiques', '/images/theme/technique.png'),
('thematique', 'biographie', 'Histoire de vie des artistes', '/images/theme/biographie.png'),
('thematique', 'historique', 'Contexte historique des œuvres', '/images/theme/historique.png');

-- Insérer les styles de texte
INSERT INTO criterias (type, name, description, image_link) VALUES
('style_texte', 'analyse', 'Analyse approfondie et structurée', '/images/style/analyse.png'),
('style_texte', 'decouverte', 'Ton engageant et exploratoire', '/images/style/decouverte.png'),
('style_texte', 'anecdote', 'Récits et histoires captivantes', '/images/style/anecdote.png');
```

#### 1.2 Supprimer les contraintes CHECK

**⚠️ MIGRATION COMPLEXE** car il faut :

```sql
-- 1. Créer nouvelle table sans contraintes CHECK
CREATE TABLE pregenerations_new (
    pregeneration_id SERIAL PRIMARY KEY,
    oeuvre_id INTEGER NOT NULL REFERENCES oeuvres(oeuvre_id) ON DELETE CASCADE,
    age_cible_id INTEGER REFERENCES criterias(criteria_id),      -- ← Nouveau : FK vers criterias
    thematique_id INTEGER REFERENCES criterias(criteria_id),     -- ← Nouveau : FK vers criterias
    style_texte_id INTEGER REFERENCES criterias(criteria_id),    -- ← Nouveau : FK vers criterias
    pregeneration_text TEXT NOT NULL,
    voice_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(oeuvre_id, age_cible_id, thematique_id, style_texte_id)
);

-- 2. Migrer les données (mapper les anciens TEXT vers criteria_id)
INSERT INTO pregenerations_new (oeuvre_id, age_cible_id, thematique_id, style_texte_id, pregeneration_text, voice_link, created_at, updated_at)
SELECT 
    p.oeuvre_id,
    (SELECT criteria_id FROM criterias WHERE type = 'age_cible' AND name = p.age_cible),
    (SELECT criteria_id FROM criterias WHERE type = 'thematique' AND name = p.thematique),
    (SELECT criteria_id FROM criterias WHERE type = 'style_texte' AND name = p.style_texte),
    p.pregeneration_text,
    p.voice_link,
    p.created_at,
    p.updated_at
FROM pregenerations p;

-- 3. Renommer les tables
DROP TABLE pregenerations;
ALTER TABLE pregenerations_new RENAME TO pregenerations;
```

**OU OPTION PLUS SIMPLE** : Garder les colonnes TEXT mais ajouter validation via FK sur une vue/trigger.

### Phase 2 : Backend Python

#### 2.1 Créer service de gestion des critères

**Nouveau fichier** : `backend/rag/core/criteria_service.py`

```python
from typing import List, Dict, Optional
from .db_postgres import _connect_postgres

def get_criteria_by_type(criteria_type: str) -> List[Dict]:
    """Récupère tous les critères d'un type donné"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT criteria_id, type, name, description, image_link
        FROM criterias
        WHERE type = %s
        ORDER BY name
    """, (criteria_type,))
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    return [dict(row) for row in results]

def get_all_age_options() -> List[Dict]:
    """Récupère les options d'âge depuis la BDD"""
    return get_criteria_by_type('age_cible')

def get_all_thematique_options() -> List[Dict]:
    """Récupère les thématiques depuis la BDD"""
    return get_criteria_by_type('thematique')

def get_all_style_texte_options() -> List[Dict]:
    """Récupère les styles de texte depuis la BDD"""
    return get_criteria_by_type('style_texte')

def validate_criteria(criteria_type: str, criteria_name: str) -> bool:
    """Valide qu'un critère existe en BDD"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT COUNT(*) as count
        FROM criterias
        WHERE type = %s AND name = %s
    """, (criteria_type, criteria_name))
    
    result = cur.fetchone()
    cur.close()
    conn.close()
    
    return result['count'] > 0
```

#### 2.2 Modifier les endpoints API

**Fichier** : `backend/rag/main_postgres.py`

```python
from .core.criteria_service import (
    get_all_age_options, get_all_thematique_options,
    get_all_style_texte_options, validate_criteria
)

@app.route('/api/criteria/age', methods=['GET'])
def get_age_criteria():
    """Récupère les critères d'âge dynamiques"""
    try:
        criteria = get_all_age_options()
        return jsonify({'success': True, 'criteria': criteria})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/criteria/thematique', methods=['GET'])
def get_thematique_criteria():
    """Récupère les thématiques dynamiques"""
    try:
        criteria = get_all_thematique_options()
        return jsonify({'success': True, 'criteria': criteria})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/criteria/style_texte', methods=['GET'])
def get_style_texte_criteria():
    """Récupère les styles de texte dynamiques"""
    try:
        criteria = get_all_style_texte_options()
        return jsonify({'success': True, 'criteria': criteria})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/pregenerations/generate', methods=['POST'])
def generate_pregenerations_endpoint():
    """Génération avec VALIDATION dynamique"""
    data = request.get_json()
    
    age_cible = data.get('age_cible')
    thematique = data.get('thematique')
    style_texte = data.get('style_texte')
    
    # ✅ NOUVELLE VALIDATION DYNAMIQUE
    if not validate_criteria('age_cible', age_cible):
        return jsonify({'success': False, 'error': f'age_cible invalide: {age_cible}'}), 400
    
    if not validate_criteria('thematique', thematique):
        return jsonify({'success': False, 'error': f'thematique invalide: {thematique}'}), 400
    
    if not validate_criteria('style_texte', style_texte):
        return jsonify({'success': False, 'error': f'style_texte invalide: {style_texte}'}), 400
    
    # ... reste du code
```

### Phase 3 : Frontend React (museum-voice client)

#### 3.1 Créer hook pour charger les critères

**Nouveau fichier** : `museum-voice/src/hooks/useCriteria.js`

```jsx
import { useState, useEffect } from 'react';

export const useCriteria = (criteriaType) => {
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        const response = await fetch(`/api/criteria/${criteriaType}`);
        const data = await response.json();
        
        if (data.success) {
          setCriteria(data.criteria);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCriteria();
  }, [criteriaType]);

  return { criteria, loading, error };
};
```

#### 3.2 Modifier les composants de sélection

**Exemple** : `museum-voice/src/components/age_selector/AgeSelector.jsx`

```jsx
import { useCriteria } from '../../hooks/useCriteria';

const AgeSelector = ({ selectedAge, onSelectAge }) => {
  // ✅ CHARGEMENT DYNAMIQUE depuis l'API
  const { criteria: ageOptions, loading, error } = useCriteria('age');
  
  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div className="age-selector-container">
      <div className="age-selector-header">
        👤 Quel est votre profil d'âge ?
      </div>
      <div className="age-selector-grid">
        {ageOptions.map((age) => (
          <SelectorGridItem
            key={age.criteria_id}
            id={age.name}                    // ← Utilise le 'name' de la BDD
            title={age.description}          // ← Description depuis BDD
            imageUrl={age.image_link}        // ← Image depuis BDD
            isSelected={selectedAge === age.name}
            onClick={() => onSelectAge(age.name)}
          />
        ))}
      </div>
    </div>
  );
};
```

### Phase 4 : Frontend Next.js (Dashboard Admin)

#### 4.1 Page de gestion des critères

**Nouveau fichier** : `app/admin/criteria/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Criteria {
  criteria_id: number;
  type: string;
  name: string;
  description: string;
  image_link: string;
}

export default function CriteriaManagementPage() {
  const [ageOptions, setAgeOptions] = useState<Criteria[]>([]);
  const [themeOptions, setThemeOptions] = useState<Criteria[]>([]);
  const [styleOptions, setStyleOptions] = useState<Criteria[]>([]);

  useEffect(() => {
    loadCriteria();
  }, []);

  const loadCriteria = async () => {
    const [age, theme, style] = await Promise.all([
      fetch('/api/criteria/age').then(r => r.json()),
      fetch('/api/criteria/thematique').then(r => r.json()),
      fetch('/api/criteria/style_texte').then(r => r.json())
    ]);

    setAgeOptions(age.criteria);
    setThemeOptions(theme.criteria);
    setStyleOptions(style.criteria);
  };

  const handleAddCriteria = async (type: string, data: Partial<Criteria>) => {
    // POST /api/criteria
    await fetch('/api/criteria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...data })
    });
    loadCriteria();
  };

  const handleEditCriteria = async (id: number, data: Partial<Criteria>) => {
    // PUT /api/criteria/:id
    await fetch(`/api/criteria/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    loadCriteria();
  };

  const handleDeleteCriteria = async (id: number) => {
    // DELETE /api/criteria/:id
    if (confirm('Supprimer ce critère ?')) {
      await fetch(`/api/criteria/${id}`, { method: 'DELETE' });
      loadCriteria();
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Gestion des Profils</h1>

      {/* Section Âges */}
      <Card className="mb-8">
        <h2 className="text-xl font-semibold p-4 border-b">👤 Profils d'âge</h2>
        <div className="p-4">
          {ageOptions.map(age => (
            <CriteriaRow
              key={age.criteria_id}
              criteria={age}
              onEdit={handleEditCriteria}
              onDelete={handleDeleteCriteria}
            />
          ))}
          <Button onClick={() => handleAddCriteria('age_cible', {})}>
            + Ajouter un profil d'âge
          </Button>
        </div>
      </Card>

      {/* Section Thématiques */}
      <Card className="mb-8">
        <h2 className="text-xl font-semibold p-4 border-b">🎨 Thématiques</h2>
        {/* ... */}
      </Card>

      {/* Section Styles */}
      <Card>
        <h2 className="text-xl font-semibold p-4 border-b">✍️ Styles de narration</h2>
        {/* ... */}
      </Card>
    </div>
  );
}
```

---

## 📊 RÉCAPITULATIF DES MODIFICATIONS

### Fichiers à créer (NOUVEAUX)

| Fichier | Description |
|---------|-------------|
| `backend/rag/core/criteria_service.py` | Service de gestion des critères dynamiques |
| `museum-voice/src/hooks/useCriteria.js` | Hook React pour charger les critères |
| `app/admin/criteria/page.tsx` | Page admin de gestion des profils |
| `database/migrations/001_populate_criterias.sql` | Script de migration pour peupler criterias |

### Fichiers à modifier (EXISTANTS)

| Fichier | Lignes | Modification |
|---------|--------|--------------|
| `database/init.sql` | 214-221 | Supprimer CHECK constraints ou migrer vers FK |
| `backend/rag/main_postgres.py` | 270-272, 796-815 | Ajouter validation dynamique + endpoints |
| `backend/rag/utils/intelligent_generator.py` | 139-395 | Rendre logiques de génération configurables |
| `backend/rag/parcours/intelligent_path_generator.py` | 685-1307 | Remplacer hardcoded par queries BDD |
| `backend/seed_narrations.py` | 14-37 | Charger options depuis criterias table |
| `museum-voice/src/components/age_selector/AgeSelector.jsx` | 7-14 | Utiliser useCriteria hook |
| `museum-voice/src/components/thematique_selector/ThematiqueSelector.jsx` | 7-13 | Utiliser useCriteria hook |
| `museum-voice/src/components/style_texte_selector/StyleTexteSelector.jsx` | 7-13 | Utiliser useCriteria hook |
| `museum-voice/src/pages/mes_choix/MesChoix.jsx` | 15-50 | Valeurs par défaut depuis API |

### Impact estimé

- **Base de données** : Migration complexe (2-3h)
- **Backend Python** : Refactoring moyen (3-4h)
- **Frontend React** : Refactoring léger (2-3h)
- **Frontend Next.js** : Nouvelles pages (3-4h)
- **Tests & validation** : (2-3h)

**TOTAL ESTIMÉ** : 12-17 heures de développement

---

## ⚠️ POINTS D'ATTENTION

### Rétrocompatibilité

Pendant la migration, il faut :
1. Maintenir les anciennes routes API fonctionnelles
2. Supporter les deux formats (TEXT et criteria_id)
3. Avoir un système de fallback si criterias vide

### Validation

- Ajouter des contraintes UNIQUE sur (type, name) dans criterias
- Vérifier que les FK existent avant insertion dans pregenerations
- Gérer les cas où un critère est supprimé (soft delete recommandé)

### Performance

- Mettre en cache les critères côté frontend (localStorage)
- Indexer la table criterias sur (type, name)
- Utiliser des requêtes préparées côté backend

---

## 🎯 PROCHAINES ÉTAPES RECOMMANDÉES

1. ✅ **Vous allez faire un merge commit** avec vos modifications de la page dashboard
2. ⏳ **Analyser vos modifications** pour voir s'il y a déjà du code de gestion des critères
3. 🔄 **Créer un plan de migration détaillé** avec les scripts SQL
4. 🛠️ **Implémenter phase par phase** en commençant par la BDD
5. 🧪 **Tester chaque couche** avant de passer à la suivante
6. 📝 **Documenter** les nouveaux endpoints et le système de critères

---

**Audit terminé le 6 Janvier 2026**

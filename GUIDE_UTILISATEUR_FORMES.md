# Guide Utilisateur - Création de Formes

## 🎨 Outils de Création Disponibles

### 1. Formes Géométriques (Drag) 🖱️

Outils : **Rectangle**, **Cercle**, **Triangle**, **Arc**

**Mode d'emploi** :
1. Sélectionner l'outil dans la toolbar
2. **Cliquer** sur le canvas (point de départ)
3. **Maintenir et glisser** (drag) pour définir la taille
4. **Relâcher** pour créer la forme

**Feedback visuel** :
- Polygone avec **pointillés animés** pendant le drag
- **Vert** = forme valide ✅
- **Orange** = avertissement ⚠️
- **Rouge** = erreur (chevauchement) ❌
- Vertices visibles en blanc

---

### 2. Arc de Cercle (Amélioré) 🌙

**Nouveauté** : Arc simplifié et intuitif !

**Mode d'emploi** :
1. **Cliquer** = centre de l'arc
2. **Drag** dans n'importe quelle direction
   - La **distance** du drag = rayon
   - La **direction** du drag = orientation de l'arc
   - Arc toujours de 180° (demi-cercle)

**Exemples** :
- Drag vers la **droite** → Arc horizontal ➡️
- Drag vers le **haut** → Arc vertical ⬆️
- Drag en **diagonale** → Arc diagonal ↗️

---

### 3. Forme Libre (Point par Point) ✏️

Outil : **Room** (pièce custom)

**Mode d'emploi** :
1. Sélectionner l'outil **Room**
2. **Cliquer** pour ajouter chaque point (minimum 3)
3. Continuer à cliquer pour définir le polygone

**Terminer la création** (3 façons) :
- **Cliquer près du 1er point** → Auto-fermeture 🔄
- Appuyer sur **Enter** → Fermer le polygone ⏎
- Appuyer sur **Echap** → Annuler 🚫

**Édition pendant création** :
- **Backspace** / **Delete** → Supprimer le dernier point ⬅️
- **Hover** → Preview du prochain segment
- Message d'aide en haut de l'écran

**Feedback visuel** :
- Points ajoutés : **gros cercles colorés**
  - 🔵 **Bleu** = premier point (pour savoir où fermer)
  - 🟢 **Vert** = autres points
- Lignes entre points : **pointillés animés**
- Hover point : ligne preview vers la souris
- Message en haut :
  - `"X points"` → Nombre de points actuels
  - `"Cliquez pour fermer"` → Quand on hover le 1er point
  - `"Surface trop petite"` → Si erreur

---

## 🎯 Validation Automatique

### Règles de Validation

✅ **Contact autorisé** : Les pièces peuvent partager des arêtes ou des coins

❌ **Chevauchement interdit** : Les surfaces internes ne doivent **PAS** se chevaucher

**Feedback en temps réel** :
- **Vert** (#22c55e) = Forme valide
- **Orange** (#f59e0b) = Avertissement (ex: surface proche du minimum)
- **Rouge** (#dc2626) = Erreur (impossible de créer)

### Surface Minimale
- **Minimum** : 5 m² (contrainte `CONSTRAINTS.room.minArea`)
- **Maximum** : 1000 m² (contrainte `CONSTRAINTS.room.maxArea`)

---

## 🔧 Snap Intelligent

Le système snap **automatique** pour précision :

### Priorité de Snap
1. **Vertices** (coins existants) → Snap exact
2. **Edges** (arêtes) → Snap perpendiculaire
3. **Midpoints** (milieux d'arêtes) → Snap exact
4. **Grille** (carreaux 40px = 0.5m) → Snap au plus proche

**Indicateur visuel** : Petit cercle blanc quand snap actif

---

## ⌨️ Raccourcis Clavier

### Mode Forme Libre (Room)
| Touche | Action |
|--------|--------|
| `Enter` | Terminer la création (≥ 3 points) |
| `Echap` | Annuler la création |
| `Backspace` | Supprimer le dernier point |
| `Delete` | Supprimer le dernier point |

### Navigation Canvas
| Action | Commande |
|--------|----------|
| **Zoom** | Molette souris 🖱️ |
| **Pan** | Bouton central souris (maintenir + glisser) 🖱️ |

---

## 💡 Astuces & Conseils

### Arc de Cercle
- Pour un **petit arc** : drag court
- Pour un **grand arc** : drag long
- L'arc suit **toujours** la direction du drag → Intuitif !

### Forme Libre
1. Commencer par **définir le contour général** (4-5 points)
2. Utiliser **Backspace** si erreur (undo facile)
3. **Hover le 1er point** pour voir l'aperçu avant de fermer
4. Le message en haut indique **toujours** l'état de validation

### Précision
- Utiliser le **snap automatique** pour alignement parfait
- Les points s'alignent automatiquement sur la **grille** (0.5m)
- Cliquer sur les **vertices existants** pour connexion précise

---

## 🐛 Résolution de Problèmes

### "Surface trop petite"
- Créer une forme **plus grande** (> 5 m² soit ~2.2m × 2.2m)
- Sur la grille : au moins **5 carrés** (5 × 0.5m = 2.5m)

### "Chevauchement détecté"
- La nouvelle forme **chevauche** une pièce existante
- **Contact** est OK, **chevauchement** non
- Repositionner ou redimensionner

### La forme ne se ferme pas (forme libre)
- Vérifier qu'il y a **au moins 3 points**
- Appuyer sur **Enter** ou cliquer **près du 1er point**
- Message d'aide en haut explique le problème

### Le snap ne fonctionne pas
- Vérifier que vous êtes **assez proche** (rayon snap)
- Zoom pour plus de précision
- Le cercle blanc indique quand snap est actif

---

## 📐 Système de Grille

- **1 carré** = 40 pixels = **0.5 mètre**
- Snap automatique tous les **0.5m**
- Surface affichée en **m²** (mètres carrés)

**Exemple** :
- Forme de **4 × 4 carrés** = 2m × 2m = **4 m²**
- Forme de **10 × 6 carrés** = 5m × 3m = **15 m²**

---

## 🎥 Workflow Typique

### Créer une Pièce Rectangulaire
1. Cliquer sur **Rectangle**
2. Cliquer-glisser sur le canvas
3. La forme se crée instantanément ✅

### Créer une Pièce Custom
1. Cliquer sur **Room**
2. Cliquer point par point pour dessiner le contour
3. Fermer en cliquant près du 1er point ou **Enter**
4. La pièce est créée ✅

### Créer un Arc
1. Cliquer sur **Arc**
2. Cliquer = centre
3. Glisser dans la direction souhaitée
4. Relâcher = arc créé ✅

---

**Bonne création !** 🚀

Si vous rencontrez un problème, vérifiez :
- Message en haut du canvas
- Couleur de la preview (vert/orange/rouge)
- Console développeur (F12) pour logs

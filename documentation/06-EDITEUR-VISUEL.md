# 🎨 Éditeur Visuel

## Présentation

L'éditeur visuel permet de créer et modifier le plan du musée de manière interactive. Il s'agit d'un canvas 2D avec des outils de dessin pour les salles, œuvres, portes, escaliers et entrées.

## Accès

URL : `http://<SERVER>:3000/editor`

---

## Interface

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              TOOLBAR                                      │
│  [Select] [Room] [Artwork] [Door] [Stairs] [Entrance] [Vertical Link]   │
│  [Undo] [Redo] [Save] [Load]                            [Floor: ▼]      │
└─────────────────────────────────────────────────────────────────────────┘
│                                                                          │
│                                                                          │
│                            CANVAS                                        │
│                                                                          │
│       ┌─────────────────────────────────┐                               │
│       │           Salle 1               │                               │
│       │     🖼️(1)        🖼️(2)          │                               │
│       │                                 │                               │
│       │              🚪                 │                               │
│       └─────────────────────────────────┘                               │
│                                                                          │
│                      🚪 Entrée Principale                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┤
│                        PROPERTIES PANEL                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Salle sélectionnée : "Salle 1"                                  │    │
│  │ Couleur : [#f0f0f0]  Nom : [Salle 1_______]                    │    │
│  │ Points : (100,100) (300,100) (300,200) (100,200)                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Outils

### 1. Select (Sélection)

**Icône** : 🖱️ Curseur

**Usage** :
- Cliquer sur un élément pour le sélectionner
- Glisser pour déplacer
- Affiche les propriétés dans le panneau latéral

### 2. Room (Salle)

**Icône** : ⬛ Carré

**Usage** :
1. Cliquer pour placer le premier point du polygone
2. Cliquer pour ajouter des points
3. Double-cliquer ou cliquer près du premier point pour fermer

**Propriétés** :
- `name` : Nom de la salle
- `color` : Couleur de remplissage
- `polygon_points` : Liste des points (x, y)

### 3. Artwork (Œuvre)

**Icône** : 🖼️ Tableau

**Usage** :
1. Cliquer à l'emplacement souhaité
2. Une œuvre est créée (liée à la salle sous-jacente)

**Propriétés** :
- `title` : Titre de l'œuvre
- `artist` : Artiste
- `room_id` : Salle associée
- Position (x, y)

### 4. Door (Porte)

**Icône** : 🚪 Porte

**Usage** :
1. Cliquer sur le bord d'une salle pour placer une porte
2. Les portes créent des liens de navigation entre salles

**Propriétés** :
- `from_entity` : Salle source
- `to_entity` : Salle destination (ou null si extérieur)
- Position (x, y)
- `type` : "door"

### 5. Stairs (Escalier)

**Icône** : 🪜 Escalier

**Usage** :
1. Cliquer pour placer un point d'escalier
2. Doit être connecté à un Vertical Link pour lier les étages

**Propriétés** :
- Position (x, y)
- `type` : "stairs" ou "elevator"

### 6. Entrance (Entrée)

**Icône** : 🚪 Porte (vert)

**Usage** :
1. Sélectionner l'outil Entrance
2. Cliquer sur le canvas pour placer le point d'entrée

**Propriétés** :
- `name` : Nom de l'entrée (ex: "Entrée Principale")
- `icon` : Icône emoji (🚪 par défaut)
- `isActive` : Actif ou non
- Position (x, y)

### 7. Vertical Link (Lien Vertical)

**Icône** : ↕️ Flèches

**Usage** :
1. Sélectionner deux escaliers sur des étages différents
2. Créer un lien vertical entre eux

**Propriétés** :
- `stairs_id_top` : Escalier étage supérieur
- `stairs_id_bottom` : Escalier étage inférieur

---

## Navigation

### Zoom

- **Molette souris** : Zoom in/out
- **Boutons +/-** : Zoom progressif
- **Pinch** (mobile) : Zoom tactile

### Pan (Déplacement)

- **Clic droit + glisser** : Déplacer la vue
- **Touch + glisser** (mobile) : Déplacer

### Étages

- **Sélecteur d'étage** : Menu déroulant en haut à droite
- **Création d'étage** : Bouton "+ Ajouter étage"

---

## Grille et Mesures

### Système de coordonnées

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `GRID_SIZE` | 40 px | Taille d'une cellule de grille |
| `GRID_TO_METERS` | 0.5 m | Conversion pixels → mètres |

### Calcul des distances

```typescript
// 1 cellule = 40 pixels = 0.5 mètres
// Donc : 1 pixel = 0.5 / 40 = 0.0125 mètres

const distanceInPixels = Math.sqrt(dx*dx + dy*dy);
const distanceInMeters = distanceInPixels * 0.5 / 40;

// Exemple : 400 pixels = 5 mètres
```

### Affichage de la grille

La grille est affichée en arrière-plan avec :
- Lignes principales tous les 200px (5 cellules)
- Lignes secondaires tous les 40px
- Origine (0,0) en haut à gauche

---

## Sauvegarde

### Sauvegarde automatique

Le système sauvegarde automatiquement :
- À chaque modification majeure
- Toutes les 30 secondes si modifications

### Sauvegarde manuelle

Bouton **"Sauvegarder"** dans la toolbar :
1. Envoie l'état complet à l'API `/api/save-to-db`
2. Stocke en base PostgreSQL

### Structure sauvegardée

```typescript
interface MuseumState {
  floors: Floor[];
  // Chaque floor contient :
  // - rooms: Room[]
  // - artworks: Artwork[]
  // - links: Link[]
  // - entrances: Entrance[]
  // - verticalLinks: VerticalLink[]
}
```

---

## Chargement

### Au démarrage

L'éditeur charge automatiquement :
1. Plans depuis `plans` table
2. Salles depuis `entities` + `points`
3. Œuvres depuis `oeuvres`
4. Liens depuis `links`
5. Entrées depuis `museum_entrances`
6. Liens verticaux depuis `vertical_links`

### API de chargement

```
GET /api/load-from-db?plan_id=1
```

Réponse :
```json
{
  "floors": [
    {
      "id": 1,
      "name": "RDC",
      "rooms": [...],
      "artworks": [...],
      "links": [...],
      "entrances": [...],
      "verticalLinks": [...]
    }
  ]
}
```

---

## Raccourcis Clavier

| Touche | Action |
|--------|--------|
| `Ctrl+Z` | Annuler |
| `Ctrl+Y` | Refaire |
| `Ctrl+S` | Sauvegarder |
| `Delete` | Supprimer sélection |
| `Escape` | Désélectionner / Annuler outil |
| `1` | Outil Select |
| `2` | Outil Room |
| `3` | Outil Artwork |
| `4` | Outil Door |
| `5` | Outil Stairs |
| `6` | Outil Entrance |

---

## Rendu Canvas

### Ordre de rendu (z-index)

1. Grille (arrière-plan)
2. Salles (polygones remplis)
3. Liens/Portes (lignes + points)
4. Escaliers
5. Entrées
6. Œuvres (cercles numérotés)
7. Sélection (surbrillance)
8. Preview outil actif

### Couleurs par défaut

| Élément | Couleur |
|---------|---------|
| Salle | `#f0f0f0` (gris clair) |
| Œuvre | `#ff6b6b` (rouge) |
| Porte | `#4caf50` (vert) |
| Escalier | `#ff9800` (orange) |
| Entrée | `#2e7d32` (vert foncé) |
| Lien vertical | `#9c27b0` (violet) |
| Sélection | `#2196f3` (bleu) |

---

## Architecture Code

### Composants principaux

```
features/
├── editor/
│   └── MuseumEditor.tsx      # Composant principal
├── canvas/
│   ├── Canvas.tsx            # Canvas 2D
│   ├── hooks/
│   │   ├── useCanvasRender.ts     # Boucle de rendu
│   │   ├── useCanvasInteraction.ts # Interactions
│   │   └── useCanvasZoom.ts       # Zoom/Pan
│   └── utils/
│       ├── room.renderer.ts       # Rendu salles
│       ├── artwork.renderer.ts    # Rendu œuvres
│       ├── link.renderer.ts       # Rendu portes
│       ├── entrance.renderer.ts   # Rendu entrées
│       └── grid.renderer.ts       # Rendu grille
├── toolbar/
│   └── Toolbar.tsx           # Barre d'outils
└── properties/
    └── PropertiesPanel.tsx   # Panneau propriétés
```

### Flux de données

```
User Action → Canvas.tsx → State Update → useCanvasRender → Canvas Redraw
                  ↓
         MuseumEditor.tsx (state)
                  ↓
         /api/save-to-db → PostgreSQL
```

---

## Gestion des Étages

### Ajout d'un étage

1. Cliquer sur "+ Ajouter étage"
2. Entrer le nom (ex: "Étage 1")
3. L'étage est créé et devient actif

### Navigation entre étages

- Sélecteur dropdown dans la toolbar
- Chaque étage a ses propres éléments
- Les liens verticaux connectent les escaliers entre étages

### Données par étage

```typescript
interface Floor {
  id: string;
  name: string;
  floorNumber: number;
  rooms: Room[];
  artworks: Artwork[];
  links: Link[];
  entrances: Entrance[];
  verticalLinks: VerticalLink[];
}
```

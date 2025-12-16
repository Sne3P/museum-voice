# GitHub Copilot Instructions - Museum Floor Plan Editor

## 🏗️ Architecture du Projet

Ce projet suit une **architecture modulaire en 3 couches** strictement centralisée pour éviter la duplication.

### 📁 Structure des Dossiers

```
├── core/                    # Couche métier (TOUT centralisé ici)
│   ├── entities/           # Types TypeScript UNIQUEMENT (Point, Room, Wall, etc.)
│   ├── constants/          # TOUTES les constantes (grille, couleurs, contraintes, etc.)
│   ├── services/           # TOUTE la logique métier (géométrie, validation, murs, etc.)
│   └── utils/              # Utilitaires transversaux
│
├── features/               # Couche fonctionnalités (UI + présentation)
│   ├── canvas/            # Fonctionnalité Canvas
│   │   ├── Canvas.tsx     # Composant principal (orchestration SEULEMENT)
│   │   ├── hooks/         # Hooks Canvas (interaction, pas logique métier)
│   │   └── utils/         # Renderers (dessin SEULEMENT, pas de calculs)
│   │
│   └── editor/            # Fonctionnalité Éditeur
│       ├── MuseumEditor.tsx   # Orchestration état global
│       └── components/        # Composants UI purs
│
└── shared/                # Couche partagée (réutilisable entre features)
    ├── hooks/            # Hooks réutilisables (optimization, throttle)
    ├── components/       # Composants UI génériques
    └── utils/            # Utilitaires UI
```

---

## 🎯 Règles D'OR - À VÉRIFIER AVANT CHAQUE CODE

### 1. **TOUJOURS vérifier si ça existe déjà**

❌ **INTERDIT** :
```typescript
// Créer une nouvelle fonction de snap
function mySnapFunction(point: Point) { ... }

// Créer une nouvelle constante
const GRID = 40
```

✅ **OBLIGATOIRE** :
```typescript
// 1. CHERCHER dans core/services/
import { snapToGrid } from '@/core/services'

// 2. CHERCHER dans core/constants/
import { GRID_SIZE } from '@/core/constants'

// 3. SI N'EXISTE PAS → Ajouter dans core/ (pas ailleurs !)
```

### 2. **Système de Grille - Règles Strictes**

```typescript
// CONSTANTES GRILLE (core/constants/grid.constants.ts)
export const GRID_SIZE = 40        // pixels par unité grille
export const GRID_TO_METERS = 0.5  // 1 unité grille = 0.5 mètre
// → Donc 1 petit carré = 0.5m × 0.5m
```

**Points doivent TOUJOURS être snappés** :
```typescript
// ❌ MAUVAIS
const point = { x: mouseX / zoom, y: mouseY / zoom }

// ✅ BON
import { snapToGrid } from '@/core/services'
const worldPoint = screenToWorld({ x: mouseX, y: mouseY }, zoom, pan)
const snappedPoint = snapToGrid(worldPoint, GRID_SIZE)
```

### 3. **Création de Formes - Fonction Centralisée**

```typescript
// TOUTES dans core/services/geometry.service.ts
import { 
  createCirclePolygon,
  createTrianglePolygon,
  createArcPolygon 
} from '@/core/services'

// ❌ INTERDIT de recréer ces fonctions ailleurs
// ✅ Utiliser les existantes avec snapToGrid sur chaque point
```

### 4. **Renderers - DESSIN SEULEMENT**

```typescript
// features/canvas/utils/*.renderer.ts
// ✅ Doit contenir UNIQUEMENT du code Canvas
export function drawRoom(ctx, room, zoom, pan, selected, hovered) {
  // BON : Dessiner avec ctx
  ctx.fillStyle = 'blue'
  ctx.fill()
}

// ❌ INTERDIT : Calculs ou logique métier dans les renderers
export function drawRoom(ctx, room, zoom, pan) {
  const area = calculateArea(room) // ❌ NON ! Doit être dans geometry.service
  const isValid = checkOverlap(room) // ❌ NON ! Doit être dans validation.service
}
```

### 5. **Import UNIQUEMENT depuis index.ts**

❌ **MAUVAIS** :
```typescript
import { snapToGrid } from '@/core/services/geometry.service'
import { GRID_SIZE } from '@/core/constants/grid.constants'
import { drawRoom } from '@/features/canvas/utils/room.renderer'
```

✅ **BON** :
```typescript
import { snapToGrid } from '@/core/services'
import { GRID_SIZE } from '@/core/constants'
import { drawRoom } from '@/features/canvas/utils'
```

---

## 📦 Organisation des Fichiers - Règles Strictes

### core/services/
```
geometry.service.ts   → Snap, distance, polygones, formes géométriques
validation.service.ts → Validation rooms, walls, artworks
walls.service.ts      → Logique murs (snap, attachement, etc.)
```

**Règle** : 1 service = 1 responsabilité. Pas de "god file".

### core/constants/
```
grid.constants.ts         → GRID_SIZE, SNAP_THRESHOLD, GRID_TO_METERS
colors.constants.ts       → Toutes les couleurs
constraints.constants.ts  → Min/max surfaces, distances
feedback.constants.ts     → Visual feedback (VISUAL_FEEDBACK)
geometry.constants.ts     → GEOMETRY (circleSegments, etc.)
```

**Règle** : Grouper par domaine, pas par type.

### features/canvas/utils/
```
grid.renderer.ts             → Dessine la grille
room.renderer.ts             → Dessine les pièces
drawing-preview.renderer.ts  → Dessine l'indicateur de tracé
coordinates.utils.ts         → worldToScreen / screenToWorld
```

**Règle** : 1 renderer = 1 type d'élément. Rien d'autre.

---

## 🚫 Anti-Patterns INTERDITS

### 1. **Duplication de Code**

```typescript
// ❌ INTERDIT - Code en double
// Dans Canvas.tsx
const snapped = { x: Math.round(p.x / 40) * 40, y: Math.round(p.y / 40) * 40 }

// Dans Toolbar.tsx  
const snapped = { x: Math.round(p.x / 40) * 40, y: Math.round(p.y / 40) * 40 }

// ✅ OBLIGATOIRE - Service centralisé
import { snapToGrid, GRID_SIZE } from '@/core'
const snapped = snapToGrid(point, GRID_SIZE)
```

### 2. **Logique Métier dans les Composants**

```typescript
// ❌ INTERDIT
function Canvas() {
  const isValid = room.area > 5 && room.area < 1000 && !hasOverlaps(room)
  // Logique métier dans le composant !
}

// ✅ OBLIGATOIRE
import { validateRoomGeometry } from '@/core/services'
function Canvas() {
  const validation = validateRoomGeometry(room)
  // Service centralisé
}
```

### 3. **Constantes en Dur**

```typescript
// ❌ INTERDIT
const gridSize = 40
const snapThreshold = 0.1
const minArea = 5

// ✅ OBLIGATOIRE
import { GRID_SIZE, SNAP_THRESHOLD, CONSTRAINTS } from '@/core/constants'
```

### 4. **Imports Directs (non-index)**

```typescript
// ❌ INTERDIT
import { snapToGrid } from '@/core/services/geometry.service'

// ✅ OBLIGATOIRE
import { snapToGrid } from '@/core/services'
```

---

## 📝 Checklist OBLIGATOIRE Avant Commit

- [ ] **Vérifier** si fonction/constante existe dans `core/`
- [ ] **Imports** uniquement depuis `index.ts` (`@/core/services`, `@/core/constants`)
- [ ] **Types** importés depuis `@/core/entities`
- [ ] **Logique métier** UNIQUEMENT dans `core/services/`
- [ ] **Renderers** contiennent UNIQUEMENT du code Canvas
- [ ] **Aucune duplication** de code (rechercher avant de créer)
- [ ] **Nommage** conforme : camelCase (services), PascalCase (composants), kebab-case (fichiers)
- [ ] **TypeScript strict** : Pas de `any` sauf justification explicite

---

## 🎓 Workflow de Développement

### Étape 1 : Analyser l'Existant

```bash
# Avant d'écrire QUOI QUE CE SOIT :
1. Chercher dans core/services/     → La fonction existe-t-elle ?
2. Chercher dans core/constants/    → La constante existe-t-elle ?
3. Chercher dans core/entities/     → Le type existe-t-il ?
4. Chercher dans features/*/hooks/  → Le hook existe-t-il ?
```

### Étape 2 : Si N'Existe Pas → Créer au BON Endroit

```typescript
// Nouvelle fonction géométrique ?
→ core/services/geometry.service.ts

// Nouvelle constante ?
→ core/constants/[domaine].constants.ts

// Nouveau hook UI ?
→ features/[feature]/hooks/use[Nom].ts

// Nouveau renderer ?
→ features/canvas/utils/[element].renderer.ts
```

### Étape 3 : Export Centralisé

```typescript
// Toujours exporter depuis index.ts
// core/services/index.ts
export * from './geometry.service'
export * from './validation.service'
// ...
```

---

## 🚀 Exemples Conformes

### Composant avec Logique Centralisée

```typescript
import { useCallback } from 'react'
import type { EditorState, Point, Room } from '@/core/entities'
import { GRID_SIZE, CONSTRAINTS } from '@/core/constants'
import { snapToGrid, validateRoomGeometry, createCirclePolygon } from '@/core/services'
import { useCanvasDrawing } from '@/features/canvas/hooks'
import { drawRoom, drawGrid, drawDrawingPreview } from '@/features/canvas/utils'

export function Canvas({ state, updateState }: CanvasProps) {
  const handleCreateCircle = useCallback((center: Point, radius: number) => {
    // 1. Créer le polygone (service centralisé)
    const polygon = createCirclePolygon(center, radius)
    
    // 2. Snapper chaque point (service centralisé)
    const snappedPolygon = polygon.map(p => snapToGrid(p, GRID_SIZE))
    
    // 3. Valider (service centralisé)
    const room: Room = { id: uuidv4(), polygon: snappedPolygon, name: 'Circle' }
    const validation = validateRoomGeometry(room)
    
    // 4. Si valide, ajouter
    if (validation.isValid) {
      updateState({ /* ... */ }, true, 'Create circle room')
    }
  }, [updateState])
  
  return <canvas ref={canvasRef} />
}
```

### Service Centralisé

```typescript
// core/services/geometry.service.ts
import type { Point, Room } from '@/core/entities'
import { GRID_SIZE, GEOMETRY } from '@/core/constants'

export function createCirclePolygon(center: Point, radius: number): Point[] {
  const points: Point[] = []
  const segments = GEOMETRY.circleSegments
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    points.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius
    })
  }
  
  return points
}

export function snapToGrid(point: Point, gridSize: number = GRID_SIZE): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  }
}
```

---

## ⚠️ Règle Finale

> **SI TU HÉSITES** → Cherche dans `core/` d'abord.  
> **SI ÇA N'EXISTE PAS** → Crée dans `core/`, pas ailleurs.  
> **TOUJOURS** centraliser, **JAMAIS** dupliquer.

**Zero tolerance pour la duplication de code !**

### 📁 Structure des Dossiers

```
├── core/                    # Couche métier (domaine)
│   ├── entities/           # Types et interfaces TypeScript
│   ├── constants/          # Constantes globales (GRID_SIZE, COLORS, etc.)
│   ├── services/           # Logique métier (validation, géométrie, murs)
│   └── utils/              # Utilitaires communs
│
├── features/               # Couche fonctionnalités
│   ├── canvas/            # Fonctionnalité Canvas
│   │   ├── Canvas.tsx     # Composant principal
│   │   ├── hooks/         # Hooks spécifiques (zoom, drag, drawing)
│   │   └── utils/         # Renderers (grid, room, wall, etc.)
│   │
│   └── editor/            # Fonctionnalité Éditeur
│       ├── MuseumEditor.tsx
│       └── components/    # Toolbar, FloorTabs, PropertiesPanel
│
└── shared/                # Couche partagée
    ├── hooks/            # Hooks réutilisables (optimization)
    ├── components/       # Composants UI génériques
    └── utils/            # Utilitaires partagés
```

---

## 🎯 Principes de Codage

### 1. **Importer depuis les index.ts centralisés**

❌ **MAUVAIS** :
```typescript
import { snapToGrid } from '@/core/services/geometry.service'
import { GRID_SIZE } from '@/core/constants/grid.constants'
import { drawRoom } from '@/features/canvas/utils/room.renderer'
```

✅ **BON** :
```typescript
import { snapToGrid } from '@/core/services'
import { GRID_SIZE } from '@/core/constants'
import { drawRoom } from '@/features/canvas/utils'
```

### 2. **Utiliser les types du core/entities**

❌ **MAUVAIS** :
```typescript
interface MyPoint { x: number, y: number }
```

✅ **BON** :
```typescript
import type { Point } from '@/core/entities'
```

### 3. **Constantes depuis core/constants**

❌ **MAUVAIS** :
```typescript
const gridSize = 1.0
const snapThreshold = 0.1
```

✅ **BON** :
```typescript
import { GRID_SIZE, SNAP_THRESHOLD } from '@/core/constants'
```

### 4. **Services depuis core/services**

❌ **MAUVAIS** :
```typescript
function snapPoint(point: Point): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  }
}
```

✅ **BON** :
```typescript
import { snapToGrid } from '@/core/services'

const snappedPoint = snapToGrid(point, GRID_SIZE)
```

### 5. **Hooks personnalisés**

Pour Canvas :
```typescript
import { 
  useZoomPan,
  useCanvasDrawing,
  useCanvasSelection,
  useCanvasDrag
} from '@/features/canvas/hooks'
```

Pour optimisation :
```typescript
import { useRenderOptimization, useThrottle } from '@/shared/hooks'
```

### 6. **Renderers modulaires**

Chaque élément a son renderer :
```typescript
import { 
  drawGrid,
  drawRoom,
  drawWall,
  drawDoor,
  drawArtwork,
  drawDrawingPreview
} from '@/features/canvas/utils'
```

---

## 📦 Exports Centralisés

### core/entities/index.ts
```typescript
export type { 
  Point, 
  Room, 
  Wall, 
  Door, 
  Artwork, 
  Floor, 
  EditorState,
  Tool 
}
```

### core/constants/index.ts
```typescript
export {
  GRID_SIZE,
  MAJOR_GRID_INTERVAL,
  SNAP_THRESHOLD,
  COLORS,
  VISUAL_FEEDBACK
}
```

### core/services/index.ts
```typescript
export {
  snapToGrid,
  isPointInPolygon,
  calculatePolygonArea,
  validateRoomGeometry
}
```

### features/canvas/utils/index.ts
```typescript
export * from './grid.renderer'
export * from './room.renderer'
export * from './wall.renderer'
export * from './drawing-preview.renderer'
export * from './coordinates.utils'
```

---

## 🎨 Conventions de Nommage

### Fichiers
- **Composants** : `PascalCase.tsx` (ex: `MuseumEditor.tsx`)
- **Hooks** : `camelCase.ts` avec préfixe `use` (ex: `useZoomPan.ts`)
- **Services** : `camelCase.service.ts` (ex: `geometry.service.ts`)
- **Renderers** : `kebab-case.renderer.ts` (ex: `room.renderer.ts`)
- **Utils** : `kebab-case.utils.ts` (ex: `coordinates.utils.ts`)
- **Constants** : `kebab-case.constants.ts` (ex: `grid.constants.ts`)

### Variables
```typescript
// Constantes globales : SCREAMING_SNAKE_CASE
export const GRID_SIZE = 1.0
export const MAJOR_GRID_INTERVAL = 5

// Fonctions : camelCase
export function snapToGrid(point: Point): Point { }

// Composants : PascalCase
export function MuseumEditor() { }

// Hooks : camelCase avec préfixe "use"
export function useZoomPan() { }
```

---

## 🔧 Patterns Recommandés

### Rendu Canvas
```typescript
// ✅ Séparer la logique de rendu dans des renderers
export function drawRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  zoom: number,
  pan: Point,
  isSelected: boolean,
  isHovered: boolean
) {
  // Logique de rendu isolée
}
```

### Gestion d'État
```typescript
// ✅ Utiliser updateState avec history optionnelle
const handleAddRoom = useCallback((room: Room) => {
  updateState({
    floors: state.floors.map(floor => 
      floor.id === currentFloorId 
        ? { ...floor, rooms: [...floor.rooms, room] }
        : floor
    )
  }, true, 'Ajout d\'une pièce')
}, [state, currentFloorId, updateState])
```

### Hooks Custom
```typescript
// ✅ Encapsuler la logique dans des hooks
export function useCanvasDrawing(
  tool: Tool,
  onComplete: (points: Point[]) => void
) {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentPoints: [],
    previewPoint: null
  })
  
  // ... logique
  
  return { drawingState, startDrawing, continueDrawing, finishDrawing }
}
```

---

## 🚫 Anti-Patterns à Éviter

### ❌ Duplication de logique
```typescript
// MAUVAIS
function snapPoint1(p: Point) { return { x: Math.round(p.x), y: Math.round(p.y) } }
function snapPoint2(p: Point) { return { x: Math.round(p.x), y: Math.round(p.y) } }
```

### ❌ Imports directs au lieu d'index
```typescript
// MAUVAIS
import { snapToGrid } from '@/core/services/geometry.service'

// BON
import { snapToGrid } from '@/core/services'
```

### ❌ Constantes en dur
```typescript
// MAUVAIS
const snapDistance = 0.1

// BON
import { SNAP_THRESHOLD } from '@/core/constants'
```

### ❌ Logique métier dans les composants
```typescript
// MAUVAIS - logique de validation dans le composant
function MyComponent() {
  const isValid = room.area > 5 && room.area < 1000
  // ...
}

// BON - utiliser un service
import { validateRoomGeometry } from '@/core/services'
function MyComponent() {
  const validation = validateRoomGeometry(room)
  // ...
}
```

---

## 📝 Checklist Avant Commit

- [ ] Imports depuis index.ts centralisés (`@/core/services`, `@/core/constants`)
- [ ] Types importés depuis `@/core/entities`
- [ ] Constantes utilisées depuis `@/core/constants`
- [ ] Logique métier dans `core/services/`
- [ ] Hooks custom dans `features/*/hooks/`
- [ ] Renderers isolés dans `features/canvas/utils/`
- [ ] Pas de duplication de code
- [ ] Nommage conforme aux conventions
- [ ] TypeScript strict (pas de `any` sauf justifié)

---

## 🎓 Exemples de Code Conforme

### Composant avec hooks
```typescript
import { useCallback } from 'react'
import type { EditorState, Floor, Point } from '@/core/entities'
import { GRID_SIZE } from '@/core/constants'
import { snapToGrid } from '@/core/services'
import { useCanvasDrawing } from '@/features/canvas/hooks'
import { drawRoom, drawGrid } from '@/features/canvas/utils'

export function Canvas({ state, updateState }: CanvasProps) {
  const { drawingState, startDrawing, finishDrawing } = useCanvasDrawing(
    state.selectedTool,
    (points) => {
      // Logique de création
    }
  )
  
  // ... reste du composant
}
```

### Service avec types
```typescript
import type { Point, Room } from '@/core/entities'
import { GRID_SIZE, SNAP_THRESHOLD } from '@/core/constants'

export function validateRoomGeometry(room: Room): ValidationResult {
  const area = calculatePolygonArea(room.polygon)
  
  return {
    isValid: area > 5 && area < 1000,
    errors: area < 5 ? ['Surface trop petite'] : []
  }
}
```

---

## 🚀 Pour aller plus loin

- **Legacy code** : Disponible dans `/legacy/` à titre de référence uniquement
- **Tests** : Privilégier les tests unitaires pour les services
- **Documentation** : Commenter les fonctions complexes avec JSDoc
- **Performance** : Utiliser `useRenderOptimization` pour le Canvas

---

**⚠️ Important** : Toujours privilégier la centralisation et la réutilisabilité du code !

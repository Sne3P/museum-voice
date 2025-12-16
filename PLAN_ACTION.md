# Plan d'Action - Système Complet de Sélection/Modification/Éléments

## 📋 État des Lieux (Audit)

### ✅ Existant Fonctionnel
- **Types** : `EditorState`, `SelectedElement`, `Tool`, `ElementType` → `core/entities/`
- **Constantes** : Hit detection (`VERTEX_HIT_RADIUS`, `ENDPOINT_HIT_RADIUS`, `LINE_HIT_THRESHOLD`) → `core/constants/interaction.constants.ts`
- **Services** : `isPointInPolygon`, `distanceToSegment` → `core/services/geometry.service.ts`
- **Hook sélection** : `useCanvasSelection` (partiellement) → `features/canvas/hooks/useCanvasSelection.ts`
- **Renderers** : Tous les renderers avec support `isSelected` et `isHovered`

### ❌ Manquant / Incomplet
1. **Sélection** :
   - ❌ Box selection (zone de sélection rectangulaire)
   - ❌ Sélection vertices (édition points)
   - ❌ Sélection segments/edges
   - ❌ Intégration dans Canvas.tsx
   - ❌ Feedback visuel complet

2. **Déplacement/Modification** :
   - ❌ Hook `useElementDrag` inexistant
   - ❌ Hook `useVertexEdit` inexistant
   - ❌ Validation pendant déplacement
   - ❌ Feedback visuel déplacement

3. **Éléments** :
   - ❌ Création murs (wall tool)
   - ❌ Création portes (door tool)
   - ❌ Création escaliers/ascenseurs (stairs/elevator)
   - ❌ Création œuvres (artwork tool)
   - ❌ Contraintes spécifiques chaque élément
   - ❌ Validation attachement (portes sur murs, etc.)

---

## 🎯 Plan d'Implémentation par Phases

### **PHASE 1 : SÉLECTION COMPLÈTE** (Priorité 1)

#### 1.1 Sélection Simple (Clic)
**Objectif** : Cliquer sur élément → Sélection

**Fichiers** :
- ✅ `core/constants/interaction.constants.ts` - Constantes hit detection (existant)
- ✅ `features/canvas/hooks/useCanvasSelection.ts` - Hook sélection (à compléter)
- 🆕 `features/canvas/hooks/useSelection.ts` - Hook unifié avec tous modes
- ⚙️ `features/canvas/Canvas.tsx` - Intégration

**Actions** :
1. Compléter `useCanvasSelection` :
   - Ajouter sélection vertices (avec `vertexIndex`)
   - Ajouter sélection segments/edges
   - Hit test avec priorités : vertices → segments → éléments → pièces

2. Créer `useSelection` (hook principal) :
   ```typescript
   interface UseSelectionReturn {
     selectedElements: SelectedElement[]
     hoveredElement: HoverInfo | null
     selectAt: (point: Point, multiSelect: boolean) => void
     clearSelection: () => void
     isSelected: (type: ElementType, id: string) => boolean
   }
   ```

3. Intégrer dans `Canvas.tsx` :
   - `handleMouseDown` → Appeler `selectAt()`
   - Dessiner sélection avec renderers

**Validation** :
- Clic sur room → Room sélectionnée
- Clic sur vertex → Vertex sélectionné
- Ctrl+Clic → Sélection multiple
- Feedback visuel (highlight)

---

#### 1.2 Box Selection (Zone Rectangulaire)
**Objectif** : Drag zone → Sélection multiple

**Fichiers** :
- 🆕 `features/canvas/hooks/useBoxSelection.ts` - Hook box selection
- 🆕 `features/canvas/utils/box-selection.renderer.ts` - Renderer zone
- ⚙️ `features/canvas/Canvas.tsx` - Intégration

**Actions** :
1. Créer `useBoxSelection` :
   ```typescript
   interface BoxSelectionState {
     isActive: boolean
     startPoint: Point | null
     currentPoint: Point | null
     selectedElements: SelectedElement[]
   }
   ```

2. Créer renderer :
   ```typescript
   drawBoxSelection(
     ctx: CanvasRenderingContext2D,
     startPoint: Point,
     endPoint: Point,
     zoom: number,
     pan: Point
   )
   ```

3. Logique Canvas :
   - Tool `select` + Drag sur fond → Box selection
   - Calculer bbox → Trouver éléments dans zone
   - Support vertices dans zone

**Validation** :
- Drag zone → Éléments dans zone sélectionnés
- Shift+Drag → Ajouter à sélection existante
- Preview rectangulaire animée

---

### **PHASE 2 : DÉPLACEMENT & MODIFICATION** (Priorité 2)

#### 2.1 Déplacement Éléments
**Objectif** : Sélection → Drag → Déplace élément

**Fichiers** :
- 🆕 `features/canvas/hooks/useElementDrag.ts` - Hook déplacement
- 🆕 `core/services/transform.service.ts` - Fonctions transformation
- ⚙️ `features/canvas/Canvas.tsx` - Intégration

**Actions** :
1. Créer `transform.service.ts` :
   ```typescript
   translatePolygon(polygon: Point[], delta: Point): Point[]
   translateArtwork(artwork: Artwork, delta: Point): Artwork
   translateWall(wall: Wall, delta: Point): Wall
   ```

2. Créer `useElementDrag` :
   ```typescript
   interface DragState {
     isDragging: boolean
     draggedElements: SelectedElement[]
     startPosition: Point
     currentPosition: Point
     isValid: boolean
     validationMessage: string | null
   }
   ```

3. Validation temps réel :
   - Pendant drag → Valider nouvel emplacement
   - Chevauchement, contraintes, etc.
   - Preview avec feedback (vert/rouge)

**Validation** :
- Room sélectionnée + Drag → Room se déplace
- Validation chevauchement temps réel
- Snap à la grille pendant drag

---

#### 2.2 Édition Vertices
**Objectif** : Vertex sélectionné → Drag → Modifie forme

**Fichiers** :
- 🆕 `features/canvas/hooks/useVertexEdit.ts` - Hook édition vertices
- ⚙️ `core/services/geometry.service.ts` - Fonctions helper

**Actions** :
1. Créer `useVertexEdit` :
   ```typescript
   interface VertexEditState {
     isEditing: boolean
     roomId: string
     vertexIndex: number
     originalPosition: Point
     newPosition: Point
     isValid: boolean
   }
   ```

2. Logique :
   - Vertex sélectionné → Hover affiche poignée
   - Drag vertex → Modifie polygone
   - Validation : aire minimale, auto-intersection

3. Fonctions helper :
   ```typescript
   updateVertexInPolygon(
     polygon: Point[],
     vertexIndex: number,
     newPosition: Point
   ): Point[]
   ```

**Validation** :
- Vertex sélectionné → Poignée visible
- Drag vertex → Forme se déforme
- Validation temps réel (aire, intersection)

---

### **PHASE 3 : ÉLÉMENTS** (Priorité 3)

#### 3.1 Murs Intérieurs (Wall)
**Objectif** : Tool wall → Tracer mur

**Fichiers** :
- 🆕 `features/canvas/hooks/useWallCreation.ts` - Hook création mur
- ⚙️ `core/services/walls.service.ts` - Logique murs (existe, à compléter)
- ⚙️ `core/constants/constraints.constants.ts` - Contraintes murs

**Actions** :
1. Créer `useWallCreation` :
   ```typescript
   - Clic 1 → Début mur
   - Clic 2 → Fin mur
   - Preview pendant tracé
   - Snap intelligent (vertices, edges)
   ```

2. Contraintes :
   - Épaisseur minimale/maximale
   - Doit être dans une room OU connecté à structure existante
   - Pas de chevauchement avec autres murs

3. Validation :
   ```typescript
   validateWall(
     wall: Wall,
     floor: Floor
   ): ValidationResult
   ```

**Validation** :
- Tool wall + 2 clics → Mur créé
- Snap sur vertices/edges rooms
- Feedback visuel contraintes

---

#### 3.2 Portes (Door)
**Objectif** : Tool door → Placer porte sur mur

**Fichiers** :
- 🆕 `features/canvas/hooks/useDoorCreation.ts` - Hook création porte
- ⚙️ `core/services/walls.service.ts` - Attachement porte/mur
- 🆕 `core/services/door.service.ts` - Logique portes

**Actions** :
1. Créer `useDoorCreation` :
   ```typescript
   - Clic sur edge room ou wall → Place porte
   - Calcul automatique position/orientation
   - Preview pendant placement
   ```

2. Contraintes :
   - Doit être sur edge room ou wall
   - Largeur max = longueur segment
   - Pas de chevauchement avec autres portes

3. Service `door.service.ts` :
   ```typescript
   createDoor(
     segment: [Point, Point],
     roomA: string,
     roomB: string,
     width: number
   ): Door
   
   validateDoorPlacement(
     door: Door,
     floor: Floor
   ): ValidationResult
   ```

**Validation** :
- Tool door + Clic edge → Porte créée
- Attachement automatique à room_a/room_b
- Validation largeur/chevauchement

---

#### 3.3 Escaliers/Ascenseurs (Stairs/Elevator)
**Objectif** : Tool stairs/elevator → Placer lien vertical

**Fichiers** :
- 🆕 `features/canvas/hooks/useVerticalLinkCreation.ts` - Hook création
- 🆕 `core/services/verticalLink.service.ts` - Logique liens verticaux

**Actions** :
1. Créer `useVerticalLinkCreation` :
   ```typescript
   // Stairs : Segment (comme wall)
   - Clic 1 → Début
   - Clic 2 → Fin
   - Dialog pour sélectionner étage destination
   
   // Elevator : Point
   - Clic → Position
   - Dialog pour sélectionner étages connectés
   ```

2. Contraintes :
   - Doit être dans une room
   - Escalier : largeur min/max
   - Ascenseur : taille fixe (2x2 grid units)

3. Service :
   ```typescript
   createStairs(
     segment: [Point, Point],
     fromFloor: string,
     toFloor: string,
     direction: 'up' | 'down'
   ): VerticalLink
   
   createElevator(
     position: Point,
     connectedFloors: string[]
   ): Elevator
   ```

**Validation** :
- Tool stairs + 2 clics → Escalier créé
- Tool elevator + 1 clic → Ascenseur créé
- Validation room containment

---

#### 3.4 Œuvres d'Art (Artwork)
**Objectif** : Tool artwork → Placer œuvre

**Fichiers** :
- 🆕 `features/canvas/hooks/useArtworkCreation.ts` - Hook création
- 🆕 `core/services/artwork.service.ts` - Logique œuvres

**Actions** :
1. Créer `useArtworkCreation` :
   ```typescript
   - Clic → Place œuvre
   - Preview circulaire pendant placement
   - Snap optionnel sur edges (placement mural)
   ```

2. Contraintes :
   - Doit être dans une room
   - Taille par défaut : 1x1 grid unit
   - Pas de chevauchement avec autres artworks

3. Service :
   ```typescript
   createArtwork(
     position: [number, number],
     size?: [number, number]
   ): Artwork
   
   validateArtworkPlacement(
     artwork: Artwork,
     floor: Floor
   ): ValidationResult
   ```

**Validation** :
- Tool artwork + Clic → Œuvre créée
- Preview cercle pendant placement
- Validation room containment

---

## 📊 Architecture Fichiers

```
core/
├── constants/
│   ├── interaction.constants.ts  ✅ (existant)
│   └── constraints.constants.ts  ⚙️ (à compléter)
├── services/
│   ├── geometry.service.ts       ✅ (existant)
│   ├── walls.service.ts          ⚙️ (à compléter)
│   ├── transform.service.ts      🆕 (à créer)
│   ├── door.service.ts           🆕 (à créer)
│   ├── verticalLink.service.ts   🆕 (à créer)
│   └── artwork.service.ts        🆕 (à créer)

features/canvas/
├── hooks/
│   ├── useCanvasSelection.ts     ⚙️ (à compléter)
│   ├── useSelection.ts           🆕 (hook principal)
│   ├── useBoxSelection.ts        🆕
│   ├── useElementDrag.ts         🆕
│   ├── useVertexEdit.ts          🆕
│   ├── useWallCreation.ts        🆕
│   ├── useDoorCreation.ts        🆕
│   ├── useVerticalLinkCreation.ts 🆕
│   └── useArtworkCreation.ts     🆕
├── utils/
│   ├── box-selection.renderer.ts 🆕
│   └── [autres renderers]        ✅ (existants)
└── Canvas.tsx                    ⚙️ (orchestration)
```

---

## 🔄 Ordre d'Exécution Méthodique

### Semaine 1 : Sélection
1. **Jour 1-2** : Compléter `useCanvasSelection` (vertices, segments, priorités)
2. **Jour 3** : Créer `useSelection` (hook principal)
3. **Jour 4** : Intégrer sélection simple dans Canvas
4. **Jour 5** : Créer `useBoxSelection` + renderer
5. **Jour 6** : Intégrer box selection dans Canvas
6. **Jour 7** : Tests et validation phase 1

### Semaine 2 : Modification
1. **Jour 8-9** : Créer `transform.service.ts`
2. **Jour 10-11** : Créer `useElementDrag`
3. **Jour 12** : Intégrer drag dans Canvas
4. **Jour 13** : Créer `useVertexEdit`
5. **Jour 14** : Intégrer vertex edit dans Canvas
6. **Jour 15** : Tests et validation phase 2

### Semaine 3 : Éléments
1. **Jour 16-17** : Murs (`useWallCreation`, `walls.service.ts`)
2. **Jour 18-19** : Portes (`useDoorCreation`, `door.service.ts`)
3. **Jour 20-21** : Escaliers/Ascenseurs (`useVerticalLinkCreation`, `verticalLink.service.ts`)
4. **Jour 22** : Œuvres (`useArtworkCreation`, `artwork.service.ts`)
5. **Jour 23-24** : Tests et validation phase 3

### Semaine 4 : Intégration & Polish
1. **Jour 25-26** : Tests end-to-end
2. **Jour 27** : Optimisations performance
3. **Jour 28** : Documentation
4. **Jour 29-30** : Corrections bugs

---

## ✅ Checklist par Phase

### Phase 1 : Sélection
- [ ] `useCanvasSelection` complet (vertices, segments, priorités)
- [ ] `useSelection` hook principal
- [ ] Sélection simple intégrée Canvas
- [ ] `useBoxSelection` créé
- [ ] Box selection renderer
- [ ] Box selection intégrée Canvas
- [ ] Tests sélection simple/multiple/box

### Phase 2 : Modification
- [ ] `transform.service.ts` créé
- [ ] `useElementDrag` créé
- [ ] Drag intégré Canvas avec validation
- [ ] `useVertexEdit` créé
- [ ] Vertex edit intégré Canvas
- [ ] Tests drag/modification

### Phase 3 : Éléments
- [ ] Wall : `useWallCreation` + contraintes + validation
- [ ] Door : `useDoorCreation` + attachement + validation
- [ ] Stairs/Elevator : `useVerticalLinkCreation` + validation
- [ ] Artwork : `useArtworkCreation` + validation
- [ ] Tests tous éléments

---

## 🎯 Principes de Code

### Séparation Responsabilités
```
Hook         → Gère l'interaction (clics, drag)
Service      → Gère la logique métier (calculs, validation)
Renderer     → Gère l'affichage (dessin Canvas)
Canvas.tsx   → Orchestre tout
```

### Validation
```typescript
interface ValidationResult {
  valid: boolean
  severity: 'error' | 'warning' | 'info'
  message: string
  visualFeedback: {
    color: string
    opacity: number
    strokeWidth?: number
  }
}
```

### Feedback Visuel
- **Preview** pendant création/modification
- **Couleurs** selon validation (vert/orange/rouge)
- **Animation** pour indiquer action en cours
- **Poignées** pour vertices éditables

---

## 📝 Notes Importantes

1. **Pas de duplication** : Réutiliser services/constantes existants
2. **TypeScript strict** : Pas de `any`
3. **Compact et efficace** : Éviter 3000 lignes de code
4. **Tester au fur et à mesure** : Valider chaque étape avant suivante
5. **Documentation** : Commenter code complexe uniquement

---

**Prêt à démarrer Phase 1** ! 🚀

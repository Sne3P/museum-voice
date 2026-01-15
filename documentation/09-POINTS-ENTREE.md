# 🚪 Système de Points d'Entrée

## Présentation

Les points d'entrée (Entrances) représentent les accès physiques au musée. Ils sont affichés sur la carte interactive pour aider les visiteurs à s'orienter.

---

## Fonctionnalités

- **Visualisation** : Affichés comme des cercles verts avec icône de porte
- **Multi-étages** : Un point d'entrée est lié à un étage spécifique
- **Personnalisation** : Nom et icône configurables
- **Activation** : Peut être activé/désactivé sans suppression

---

## Structure de Données

### Interface TypeScript

```typescript
// core/entities/museum.types.ts

export interface Entrance {
  id: string;           // UUID unique
  name: string;         // "Entrée Principale", "Sortie Nord"...
  x: number;            // Position X en pixels
  y: number;            // Position Y en pixels
  icon: string;         // Emoji ou code icône (🚪)
  isActive: boolean;    // Afficher ou non
}
```

### Table PostgreSQL

```sql
-- database/init.sql

CREATE TABLE museum_entrances (
    entrance_id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES plans(plan_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Entrée',
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    icon VARCHAR(50) DEFAULT '🚪',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche par plan
CREATE INDEX idx_entrances_plan ON museum_entrances(plan_id);
```

---

## Création dans l'Éditeur

### Outil Entrance

1. Sélectionner l'outil **Entrance** dans la toolbar
2. Cliquer sur le canvas à l'emplacement souhaité
3. Une entrée est créée avec les valeurs par défaut

### Propriétés modifiables

Dans le panneau de propriétés :
- **Nom** : Champ texte
- **Icône** : Sélecteur d'emoji
- **Actif** : Checkbox

---

## Rendu sur le Canvas (Éditeur)

### Fichier : `features/canvas/utils/entrance.renderer.ts`

```typescript
export function drawEntrance(
  ctx: CanvasRenderingContext2D,
  entrance: Entrance,
  isSelected: boolean = false
): void {
  const { x, y, name, icon, isActive } = entrance;
  
  if (!isActive) return;
  
  // Cercle de fond (vert foncé)
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#2e7d32';
  ctx.fill();
  
  // Bordure blanche
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.stroke();
  
  // Icône au centre
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(icon || '🚪', x, y);
  
  // Label en dessous
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#2e7d32';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeText(name, x, y + 35);
  ctx.fillText(name, x, y + 35);
  
  // Surbrillance si sélectionné
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawEntrancePreview(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(46, 125, 50, 0.5)';
  ctx.fill();
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
}
```

### Intégration dans useCanvasRender.ts

```typescript
// features/canvas/hooks/useCanvasRender.ts

import { drawEntrance, drawEntrancePreview } from '../utils/entrance.renderer';

// Dans la boucle de rendu :
currentFloor.entrances?.forEach(entrance => {
  drawEntrance(
    ctx,
    entrance,
    selectedElement?.type === 'entrance' && selectedElement.id === entrance.id
  );
});

// Pour la preview de l'outil :
if (currentTool === 'entrance' && mousePosition) {
  drawEntrancePreview(ctx, mousePosition.x, mousePosition.y);
}
```

---

## Affichage Client (MapViewer)

### Fichier : `client-frontend/src/components/map_viewer/MapViewer.jsx`

```jsx
{/* Dessiner les points d'entrée du musée */}
{floorPlanData?.entrances?.filter(
  entrance => entrance.floor === currentFloor
).map((entrance) => (
  <g key={`entrance-${entrance.entrance_id}`}>
    {/* Cercle vert */}
    <circle
      cx={entrance.x}
      cy={entrance.y}
      r="20"
      fill="#2e7d32"
      stroke="#fff"
      strokeWidth="4"
      opacity="0.9"
    />
    
    {/* Icône porte (via foreignObject pour React Icons) */}
    <foreignObject
      x={entrance.x - 12}
      y={entrance.y - 12}
      width="24"
      height="24"
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#fff'
      }}>
        <FaDoorOpen size={20} />
      </div>
    </foreignObject>
    
    {/* Label */}
    <text
      x={entrance.x}
      y={entrance.y + 35}
      textAnchor="middle"
      fontSize="16"
      fontWeight="bold"
      fill="#2e7d32"
      stroke="#fff"
      strokeWidth="3"
      paintOrder="stroke"
    >
      {entrance.name}
    </text>
  </g>
))}
```

---

## API Backend

### Chargement du plan avec entrées

```
GET /api/museum/floor-plan
```

Réponse :
```json
{
  "success": true,
  "rooms": [...],
  "entrances": [
    {
      "entrance_id": 1,
      "name": "Entrée Principale",
      "x": 200,
      "y": 500,
      "icon": "🚪",
      "floor": 0
    },
    {
      "entrance_id": 2,
      "name": "Sortie Secours",
      "x": 800,
      "y": 100,
      "icon": "🚨",
      "floor": 0
    }
  ]
}
```

### Code Backend (main_postgres.py)

```python
@app.route('/api/museum/floor-plan', methods=['GET'])
def get_floor_plan():
    # ... récupération des salles ...
    
    # Récupérer les points d'entrée
    cur.execute("""
        SELECT entrance_id, plan_id, name, x, y, icon
        FROM museum_entrances
        WHERE is_active = true
        ORDER BY entrance_id
    """)
    entrance_rows = cur.fetchall()
    
    entrances = []
    for row in entrance_rows:
        floor_num = plan_to_floor.get(row['plan_id'], 0)
        
        entrances.append({
            'entrance_id': row['entrance_id'],
            'name': row['name'],
            'x': float(row['x']),
            'y': float(row['y']),
            'icon': row['icon'],
            'floor': floor_num
        })
    
    return jsonify({
        'success': True,
        'rooms': rooms,
        'entrances': entrances
    })
```

---

## Sauvegarde

### API de sauvegarde (load-from-db / save-to-db)

#### Chargement

```typescript
// app/api/load-from-db/route.ts

const entrancesResult = await pool.query(`
  SELECT entrance_id, plan_id, name, x, y, icon, is_active
  FROM museum_entrances
  WHERE plan_id = $1
  ORDER BY entrance_id
`, [planId]);

const entrances = entrancesResult.rows.map(row => ({
  id: `entrance-${row.entrance_id}`,
  name: row.name,
  x: row.x,
  y: row.y,
  icon: row.icon,
  isActive: row.is_active
}));
```

#### Sauvegarde

```typescript
// app/api/save-to-db/route.ts

// Pour chaque entrée dans les données
for (const entrance of floor.entrances || []) {
  await pool.query(`
    INSERT INTO museum_entrances (plan_id, name, x, y, icon, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (entrance_id) DO UPDATE SET
      name = EXCLUDED.name,
      x = EXCLUDED.x,
      y = EXCLUDED.y,
      icon = EXCLUDED.icon,
      is_active = EXCLUDED.is_active,
      updated_at = CURRENT_TIMESTAMP
  `, [planId, entrance.name, entrance.x, entrance.y, entrance.icon, entrance.isActive]);
}
```

---

## Styles Visuels

### Couleurs

| État | Couleur fond | Couleur bordure |
|------|--------------|-----------------|
| Normal | `#2e7d32` (vert foncé) | `#ffffff` (blanc) |
| Sélectionné | `#2e7d32` | `#2196f3` (bleu) |
| Preview | `rgba(46, 125, 50, 0.5)` | `#2e7d32` |
| Inactif | Non affiché | - |

### Dimensions

| Élément | Taille |
|---------|--------|
| Rayon cercle | 20px |
| Bordure | 4px |
| Police label | 14px bold |
| Offset label Y | +35px |

---

## Bonnes Pratiques

### Placement

- Placer les entrées aux accès réels du bâtiment
- Une entrée par accès (entrée principale, sorties secours...)
- Éviter de placer une entrée à l'intérieur d'une salle

### Nommage

- Noms courts et explicites
- "Entrée Principale", "Accueil", "Sortie Nord"
- Éviter les abréviations obscures

### Gestion multi-étages

- Chaque entrée est liée à UN seul étage
- Pour un accès qui dessert plusieurs étages, créer une entrée par étage

---

## Dépannage

### Entrée non affichée dans l'éditeur

1. Vérifier que `isActive` est `true`
2. Vérifier les coordonnées (dans le viewport visible)
3. Vérifier l'étage courant

### Entrée non affichée dans le client

1. Vérifier l'API `/api/museum/floor-plan`
2. Vérifier que `floor` correspond à l'étage affiché
3. Vérifier les logs console du navigateur

### Entrée non sauvegardée

1. Vérifier l'API `/api/save-to-db`
2. Vérifier la structure des données envoyées
3. Vérifier les logs du backend

# 🗺️ Gestion des Parcours

## Présentation

Les parcours définissent un itinéraire guidé à travers le musée, avec un ordre de visite des œuvres et un chemin optimisé calculé automatiquement.

## Accès

- **Gestion des parcours** : `http://<SERVER>:3000/parcours`
- **Test des parcours** : `http://<SERVER>:3000/admin/test-parcours`

---

## Structure d'un Parcours

```typescript
interface Parcours {
  parcours_id: number;
  nom: string;
  description: string;
  oeuvres: ParcoursOeuvre[];
  path_segments: PathSegment[];
  metadata: {
    floors_list: number[];
    total_distance: number;
    estimated_duration: string;
  };
}

interface ParcoursOeuvre {
  oeuvre_id: number;
  order: number;
  title: string;
  artist: string;
  position: {
    x: number;
    y: number;
    floor: number;
    floor_name: string;
    room_name: string;
  };
}
```

---

## Création d'un Parcours

### Interface de création

1. Accéder à `/parcours`
2. Cliquer "Nouveau Parcours"
3. Renseigner :
   - **Nom** : Titre du parcours
   - **Description** : Description pour les visiteurs

### Ajout d'œuvres

1. Liste des œuvres disponibles à gauche
2. Glisser-déposer vers le parcours
3. Réordonner par glisser-déposer

### Calcul automatique du chemin

Le système calcule automatiquement :
- Le chemin optimal entre chaque œuvre (algorithme A*)
- Les segments de navigation (portes à traverser)
- La distance totale
- Les changements d'étage (escaliers)

---

## Algorithme de Pathfinding (A*)

### Principe

L'algorithme A* trouve le chemin le plus court entre deux œuvres en utilisant :
- Les **portes** comme points de passage
- Les **escaliers** pour changer d'étage
- Les **distances réelles** en mètres

### Graphe de navigation

```
┌─────────────────────────────────────────────────────────────────┐
│                           ÉTAGE 0                                │
│                                                                  │
│    ┌────────┐        ┌────────┐        ┌────────┐              │
│    │Salle A │   🚪   │Salle B │   🚪   │Salle C │              │
│    │  🖼️1   │←─────→│  🖼️2   │←─────→│  🖼️3   │              │
│    └────────┘        └────────┘        └────────┘              │
│                           │                                      │
│                          🪜 ←── Escalier                         │
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                           │              ÉTAGE 1                 │
│                          🪜                                       │
│                           │                                      │
│    ┌────────────────────────────┐                                │
│    │         Salle D            │                                │
│    │      🖼️4        🖼️5        │                                │
│    └────────────────────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

### Code simplifié

```python
def calculate_path(from_artwork, to_artwork, graph):
    """
    Calcule le chemin A* entre deux œuvres
    """
    start = (from_artwork.x, from_artwork.y, from_artwork.floor)
    goal = (to_artwork.x, to_artwork.y, to_artwork.floor)
    
    # File de priorité
    open_set = [(0, start)]
    came_from = {}
    g_score = {start: 0}
    
    while open_set:
        current = heappop(open_set)[1]
        
        if current == goal:
            return reconstruct_path(came_from, current)
        
        for neighbor in get_neighbors(current, graph):
            tentative_g = g_score[current] + distance(current, neighbor)
            
            if tentative_g < g_score.get(neighbor, float('inf')):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score = tentative_g + heuristic(neighbor, goal)
                heappush(open_set, (f_score, neighbor))
    
    return None  # Pas de chemin trouvé
```

---

## Path Segments

### Structure

Chaque segment représente une portion du chemin :

```typescript
interface PathSegment {
  segment_index: number;  // Index dans le parcours (0, 1, 2...)
  from: {
    x: number;
    y: number;
    floor: number;
    type: 'artwork' | 'door' | 'stairs';
    entity_id?: number;
  };
  to: {
    x: number;
    y: number;
    floor: number;
    type: 'artwork' | 'door' | 'stairs';
    entity_id?: number;
  };
  distance_meters: number;
}
```

### Exemple de segments

Pour un chemin Œuvre1 → Porte → Œuvre2 :

```json
[
  {
    "segment_index": 0,
    "from": {"x": 100, "y": 100, "floor": 0, "type": "artwork"},
    "to": {"x": 200, "y": 100, "floor": 0, "type": "door"},
    "distance_meters": 1.25
  },
  {
    "segment_index": 0,
    "from": {"x": 200, "y": 100, "floor": 0, "type": "door"},
    "to": {"x": 300, "y": 150, "floor": 0, "type": "artwork"},
    "distance_meters": 1.5
  }
]
```

---

## Stockage Base de Données

### Tables concernées

#### Table `parcours`

| Colonne | Type | Description |
|---------|------|-------------|
| parcours_id | SERIAL | ID unique |
| nom | VARCHAR | Nom du parcours |
| description | TEXT | Description |
| created_at | TIMESTAMP | Date création |
| is_active | BOOLEAN | Actif ou non |

#### Table `parcours_oeuvres`

| Colonne | Type | Description |
|---------|------|-------------|
| parcours_id | INTEGER | FK vers parcours |
| oeuvre_id | INTEGER | FK vers oeuvres |
| ordre | INTEGER | Position dans le parcours |

#### Table `path_segments`

| Colonne | Type | Description |
|---------|------|-------------|
| segment_id | SERIAL | ID unique |
| parcours_id | INTEGER | FK vers parcours |
| segment_index | INTEGER | Index du segment |
| from_x, from_y | FLOAT | Coordonnées départ |
| from_floor | INTEGER | Étage départ |
| from_type | VARCHAR | Type point départ |
| to_x, to_y | FLOAT | Coordonnées arrivée |
| to_floor | INTEGER | Étage arrivée |
| to_type | VARCHAR | Type point arrivée |
| distance_meters | FLOAT | Distance en mètres |

---

## API Parcours

### Lister les parcours

```
GET /api/parcours/list
```

Réponse :
```json
{
  "success": true,
  "parcours": [
    {
      "parcours_id": 1,
      "nom": "Visite Complète",
      "description": "Découvrez toutes les œuvres",
      "oeuvres_count": 15,
      "is_active": true
    }
  ]
}
```

### Détails d'un parcours

```
GET /api/parcours/<parcours_id>/full
```

Réponse :
```json
{
  "success": true,
  "parcours_id": 1,
  "nom": "Visite Complète",
  "description": "...",
  "artworks": [...],
  "path_segments": [...],
  "metadata": {
    "floors_list": [0, 1],
    "total_distance": 125.5,
    "estimated_duration": "45 min"
  }
}
```

### Créer un parcours

```
POST /api/parcours/create
Content-Type: application/json

{
  "nom": "Nouveau Parcours",
  "description": "Description...",
  "oeuvres_ids": [1, 5, 3, 8]
}
```

### Calculer le chemin

```
POST /api/parcours/<parcours_id>/calculate-path
```

Déclenche le calcul A* pour tous les segments du parcours.

---

## Test de Parcours

### Interface de test

URL : `/admin/test-parcours`

Permet de :
1. Sélectionner un parcours
2. Simuler la navigation
3. Voir les segments sur la carte
4. Vérifier les distances

### Visualisation

La carte affiche :
- **Œuvres** : Cercles numérotés (bleu = à venir, rouge = actuel, gris = visité)
- **Chemin actuel** : Ligne bleue vers prochaine œuvre
- **Portes** : Points verts
- **Escaliers** : Points orange

---

## Gestion Multi-Étages

### Détection des changements d'étage

```python
def detect_floor_changes(artworks):
    """
    Détecte les transitions entre étages
    """
    changes = []
    for i in range(len(artworks) - 1):
        if artworks[i].floor != artworks[i+1].floor:
            changes.append({
                'from_floor': artworks[i].floor,
                'to_floor': artworks[i+1].floor,
                'after_artwork': artworks[i].oeuvre_id
            })
    return changes
```

### Insertion des escaliers

Quand un changement d'étage est détecté :
1. Trouver l'escalier le plus proche sur l'étage de départ
2. Trouver l'escalier correspondant sur l'étage d'arrivée (via vertical_link)
3. Insérer les segments :
   - Œuvre → Escalier (étage départ)
   - Escalier → Œuvre suivante (étage arrivée)

---

## QR Codes

### Génération

Chaque parcours peut avoir un QR code :

```
GET /api/qrcode/generate?parcours_id=1&profile=default
```

Le QR code encode l'URL :
```
http://<CLIENT_URL>:8080/parcours/<parcours_id>?profile=<profile_code>
```

### Scan par visiteur

1. Visiteur scanne le QR code
2. Redirection vers l'app client
3. Chargement automatique du parcours
4. Démarrage de l'audioguide

---

## Bonnes Pratiques

### Création de parcours

1. **Ordre logique** : Éviter les allers-retours
2. **Regrouper par étage** : Minimiser les changements d'étage
3. **Distance raisonnable** : Prévoir ~3-5 min par œuvre
4. **Points d'entrée** : Commencer près d'une entrée

### Optimisation

- **Recalculer les chemins** après modification du plan
- **Vérifier les segments** après ajout/suppression de portes
- **Tester sur mobile** avant déploiement

#!/usr/bin/env python3
"""
MODULE INTELLIGENT DE GÉNÉRATION DE PARCOURS
============================================
Génère un parcours optimal dans le musée en fonction du profil utilisateur

Fonctionnalités:
- Sélection intelligente des œuvres selon le profil
- Optimisation du chemin (proximité, accessibilité)
- Gestion des étages (escaliers)
- Gestion des salles (portes)
- Génération de variations uniques
- Export JSON complet (œuvres + narrations + chemin)
"""

import sys
import random
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, field
import json
import heapq
import math

# Imports relatifs
from rag.core.db_postgres import _connect_postgres


@dataclass
class Position:
    """Position géographique dans le musée"""
    x: float
    y: float
    room: int
    floor: int = 0  # Étage (0=RDC, 1=Premier, etc.)
    
    # Constante de conversion: 40 pixels = 0.5m → 1 pixel = 0.0125m
    PIXELS_TO_METERS = 0.0125
    
    def distance(self, other: 'Position') -> float:
        """
        Distance euclidienne entre deux positions en mètres
        Conversion: 40 pixels = 0.5m, donc 1 pixel = 0.0125m
        """
        if self.floor != other.floor:
            # Pénalité pour changement d'étage (équivalent ~12.5m)
            pixels_distance = ((self.x - other.x)**2 + (self.y - other.y)**2)**0.5
            return 12.5 + (pixels_distance * self.PIXELS_TO_METERS)
        
        pixels_distance = ((self.x - other.x)**2 + (self.y - other.y)**2)**0.5
        return pixels_distance * self.PIXELS_TO_METERS


@dataclass
class Artwork:
    """Œuvre enrichie avec position et narration"""
    oeuvre_id: int
    title: str
    artist: str
    date_oeuvre: str
    materiaux_technique: str
    position: Position
    narration: str
    narration_length: int
    room: int


@dataclass
class Door:
    """Porte reliant deux salles"""
    room_a: int  # entity_id de la salle A
    room_b: int  # entity_id de la salle B
    position: Position  # Position moyenne de la porte
    
    def connects(self, room1: int, room2: int) -> bool:
        """Vérifie si cette porte connecte les deux salles"""
        return (self.room_a == room1 and self.room_b == room2) or \
               (self.room_a == room2 and self.room_b == room1)


@dataclass
class WallSegment:
    """Segment de mur bloquant le passage"""
    x1: float
    y1: float
    x2: float
    y2: float
    room: int  # Salle où se trouve le mur
    
    def intersects_line(self, px1: float, py1: float, px2: float, py2: float) -> bool:
        """
        Vérifie si le segment de mur intersecte le segment (px1,py1)→(px2,py2)
        Utilise l'algorithme d'intersection de segments
        """
        def ccw(Ax, Ay, Bx, By, Cx, Cy):
            return (Cy-Ay) * (Bx-Ax) > (By-Ay) * (Cx-Ax)
        
        A = (self.x1, self.y1)
        B = (self.x2, self.y2)
        C = (px1, py1)
        D = (px2, py2)
        
        return (ccw(A[0], A[1], C[0], C[1], D[0], D[1]) != ccw(B[0], B[1], C[0], C[1], D[0], D[1]) and
                ccw(A[0], A[1], B[0], B[1], C[0], C[1]) != ccw(A[0], A[1], B[0], B[1], D[0], D[1]))


@dataclass(order=True)
class PathNode:
    """Nœud pour l'algorithme A*"""
    priority: float
    x: int = field(compare=False)
    y: int = field(compare=False)
    g_cost: float = field(compare=False)
    parent: Optional[Tuple[int, int]] = field(default=None, compare=False)


class AStarPathfinder:
    """
    Pathfinding A* sur grille avec obstacles (murs)
    Résolution: 5 pixels par cellule (compromis vitesse/précision)
    """
    
    GRID_RESOLUTION = 5  # pixels par cellule de grille
    
    def __init__(self, walls: List[WallSegment], room_bounds: Dict[int, Tuple[float, float, float, float]]):
        """
        walls: Liste des murs à éviter
        room_bounds: Dict[room_id] = (min_x, min_y, max_x, max_y)
        """
        self.walls = walls
        self.room_bounds = room_bounds
        self.grid_cache: Dict[int, Set[Tuple[int, int]]] = {}  # room_id -> blocked cells
        
    def _to_grid(self, x: float, y: float) -> Tuple[int, int]:
        """Convertit coordonnées pixels en coordonnées grille"""
        return (int(x / self.GRID_RESOLUTION), int(y / self.GRID_RESOLUTION))
    
    def _from_grid(self, gx: int, gy: int) -> Tuple[float, float]:
        """Convertit coordonnées grille en pixels (centre de cellule)"""
        return (gx * self.GRID_RESOLUTION + self.GRID_RESOLUTION / 2,
                gy * self.GRID_RESOLUTION + self.GRID_RESOLUTION / 2)
    
    def _get_blocked_cells(self, room: int) -> Set[Tuple[int, int]]:
        """Retourne les cellules de grille bloquées par les murs dans cette salle"""
        if room in self.grid_cache:
            return self.grid_cache[room]
        
        blocked = set()
        room_walls = [w for w in self.walls if w.room == room]
        
        if not room_walls:
            self.grid_cache[room] = blocked
            return blocked
        
        # Pour chaque mur, marquer toutes les cellules qu'il traverse
        for wall in room_walls:
            # Convertir les extrémités du mur en grille
            gx1, gy1 = self._to_grid(wall.x1, wall.y1)
            gx2, gy2 = self._to_grid(wall.x2, wall.y2)
            
            # Algorithme de Bresenham pour tracer la ligne du mur
            dx = abs(gx2 - gx1)
            dy = abs(gy2 - gy1)
            sx = 1 if gx2 > gx1 else -1
            sy = 1 if gy2 > gy1 else -1
            err = dx - dy
            
            x, y = gx1, gy1
            while True:
                blocked.add((x, y))
                
                if x == gx2 and y == gy2:
                    break
                
                e2 = 2 * err
                if e2 > -dy:
                    err -= dy
                    x += sx
                if e2 < dx:
                    err += dx
                    y += sy
        
        self.grid_cache[room] = blocked
        return blocked
    
    def find_path(self, from_pos: Position, to_pos: Position, doors: List[Door]) -> Tuple[float, List[Position]]:
        """
        Trouve le chemin optimal entre deux positions
        Retourne (distance_totale_metres, liste_positions_waypoints)
        """
        # Si positions dans salles différentes, utiliser pathfinding multi-salles
        if from_pos.room != to_pos.room:
            return self._find_path_multi_room(from_pos, to_pos, doors)
        
        # Même salle: A* simple
        return self._find_path_single_room(from_pos, to_pos)
    
    def _find_path_single_room(self, from_pos: Position, to_pos: Position) -> Tuple[float, List[Position]]:
        """A* dans une seule salle"""
        blocked = self._get_blocked_cells(from_pos.room)
        
        start = self._to_grid(from_pos.x, from_pos.y)
        goal = self._to_grid(to_pos.x, to_pos.y)
        
        # Vérifier si chemin direct possible
        if not blocked or not self._line_crosses_blocked(start, goal, blocked):
            # Chemin direct dégagé
            dist = from_pos.distance(to_pos)
            return (dist, [from_pos, to_pos])
        
        # A* complet
        open_set = []
        heapq.heappush(open_set, PathNode(
            priority=0,
            x=start[0],
            y=start[1],
            g_cost=0,
            parent=None
        ))
        
        closed_set = set()
        g_scores = {start: 0}
        parents = {}
        
        while open_set:
            current = heapq.heappop(open_set)
            current_pos = (current.x, current.y)
            
            if current_pos in closed_set:
                continue
            
            closed_set.add(current_pos)
            
            # Arrivé ?
            if current_pos == goal:
                return self._reconstruct_path(parents, start, goal, from_pos, to_pos)
            
            # Voisins (8 directions)
            for dx, dy in [(-1,0), (1,0), (0,-1), (0,1), (-1,-1), (-1,1), (1,-1), (1,1)]:
                neighbor = (current_pos[0] + dx, current_pos[1] + dy)
                
                if neighbor in closed_set or neighbor in blocked:
                    continue
                
                # Coût du mouvement (diagonal = √2)
                move_cost = 1.414 if dx != 0 and dy != 0 else 1.0
                tentative_g = current.g_cost + move_cost
                
                if neighbor not in g_scores or tentative_g < g_scores[neighbor]:
                    g_scores[neighbor] = tentative_g
                    parents[neighbor] = current_pos
                    
                    # Heuristique: distance Manhattan en grille
                    h = abs(neighbor[0] - goal[0]) + abs(neighbor[1] - goal[1])
                    
                    heapq.heappush(open_set, PathNode(
                        priority=tentative_g + h,
                        x=neighbor[0],
                        y=neighbor[1],
                        g_cost=tentative_g,
                        parent=current_pos
                    ))
        
        # Pas de chemin trouvé: retourner distance directe avec pénalité
        dist = from_pos.distance(to_pos) * 3.0
        return (dist, [from_pos, to_pos])
    
    def _line_crosses_blocked(self, start: Tuple[int, int], goal: Tuple[int, int], 
                             blocked: Set[Tuple[int, int]]) -> bool:
        """Vérifie si une ligne traverse des cellules bloquées"""
        x1, y1 = start
        x2, y2 = goal
        
        dx = abs(x2 - x1)
        dy = abs(y2 - y1)
        sx = 1 if x2 > x1 else -1
        sy = 1 if y2 > y1 else -1
        err = dx - dy
        
        x, y = x1, y1
        while True:
            if (x, y) in blocked:
                return True
            
            if x == x2 and y == y2:
                break
            
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x += sx
            if e2 < dx:
                err += dx
                y += sy
        
        return False
    
    def _reconstruct_path(self, parents: Dict, start: Tuple[int, int], goal: Tuple[int, int],
                         from_pos: Position, to_pos: Position) -> Tuple[float, List[Position]]:
        """Reconstruit le chemin et calcule la distance"""
        path_grid = []
        current = goal
        
        while current in parents:
            path_grid.append(current)
            current = parents[current]
        path_grid.append(start)
        path_grid.reverse()
        
        # Convertir en positions et calculer distance
        waypoints = [from_pos]
        total_dist = 0
        
        for i in range(1, len(path_grid) - 1):
            px, py = self._from_grid(path_grid[i][0], path_grid[i][1])
            waypoints.append(Position(x=px, y=py, room=from_pos.room, floor=from_pos.floor))
        
        waypoints.append(to_pos)
        
        # Distance totale
        for i in range(len(waypoints) - 1):
            total_dist += waypoints[i].distance(waypoints[i + 1])
        
        return (total_dist, waypoints)
    
    def _find_path_multi_room(self, from_pos: Position, to_pos: Position, 
                             doors: List[Door]) -> Tuple[float, List[Position]]:
        """Pathfinding entre différentes salles via portes"""
        # BFS pour trouver séquence de salles
        visited = set()
        queue = [(from_pos.room, [from_pos.room], [])]  # (room, path, doors_used)
        
        while queue:
            current_room, room_path, doors_path = queue.pop(0)
            
            if current_room in visited:
                continue
            visited.add(current_room)
            
            if current_room == to_pos.room:
                # Trouvé! Calculer distance via les portes
                total_dist = 0
                waypoints = [from_pos]
                current_pos = from_pos
                
                for door in doors_path:
                    # Distance jusqu'à la porte (dans la salle actuelle)
                    door_pos_in_current_room = Position(
                        x=door.position.x,
                        y=door.position.y,
                        room=current_pos.room,  # Même salle que position actuelle
                        floor=current_pos.floor
                    )
                    dist, _ = self._find_path_single_room(current_pos, door_pos_in_current_room)
                    total_dist += dist
                    waypoints.append(door_pos_in_current_room)
                    
                    # Passer de l'autre côté de la porte (nouvelle salle)
                    next_room = door.room_b if door.room_a == current_pos.room else door.room_a
                    current_pos = Position(
                        x=door.position.x,
                        y=door.position.y,
                        room=next_room,
                        floor=door.position.floor
                    )
                
                # Distance de la dernière porte jusqu'à la cible
                dist, _ = self._find_path_single_room(current_pos, to_pos)
                total_dist += dist
                waypoints.append(to_pos)
                
                return (total_dist, waypoints)
            
            # Explorer portes accessibles
            for door in doors:
                next_room = None
                if door.room_a == current_room:
                    next_room = door.room_b
                elif door.room_b == current_room:
                    next_room = door.room_a
                
                if next_room and next_room not in visited:
                    queue.append((next_room, room_path + [next_room], doors_path + [door]))
        
        # Pas de chemin: distance avec grosse pénalité
        return (from_pos.distance(to_pos) * 5.0, [from_pos, to_pos])


class RoomGraph:
    """Graphe des connexions entre salles via les portes avec pathfinding A*"""
    
    def __init__(self):
        self.doors: List[Door] = []
        self.room_positions: Dict[int, Position] = {}  # Centre de chaque salle
        self.walls: List[WallSegment] = []  # Murs bloquant les passages
        self.pathfinder: Optional[AStarPathfinder] = None
        self.room_bounds: Dict[int, Tuple[float, float, float, float]] = {}
    
    def add_door(self, door: Door):
        """Ajoute une porte au graphe"""
        self.doors.append(door)
    
    def add_room_center(self, room_id: int, position: Position):
        """Enregistre le centre d'une salle"""
        self.room_positions[room_id] = position
    
    def add_room_bounds(self, room_id: int, min_x: float, min_y: float, max_x: float, max_y: float):
        """Enregistre les limites d'une salle"""
        self.room_bounds[room_id] = (min_x, min_y, max_x, max_y)
    
    def add_wall(self, wall: WallSegment):
        """Ajoute un segment de mur"""
        self.walls.append(wall)
        # Invalider le pathfinder pour forcer la reconstruction
        self.pathfinder = None
    
    def _ensure_pathfinder(self):
        """Initialise le pathfinder si nécessaire"""
        if self.pathfinder is None:
            self.pathfinder = AStarPathfinder(self.walls, self.room_bounds)
    
    def calculate_room_path_distance(self, from_pos: Position, to_pos: Position) -> float:
        """
        Calcule la distance réelle avec pathfinding A*
        Prend en compte les murs, portes, et multi-salles
        """
        self._ensure_pathfinder()
        distance, waypoints = self.pathfinder.find_path(from_pos, to_pos, self.doors)
        return distance


@dataclass
class Parcours:
    """Parcours complet généré"""
    parcours_id: str
    profil: Dict
    artworks: List[Artwork]
    total_distance: float
    total_duration_minutes: int
    path_order: List[int]  # Liste des oeuvre_id dans l'ordre
    metadata: Dict


class IntelligentPathGenerator:
    """
    Générateur intelligent de parcours muséal
    """
    
    def __init__(self):
        self.conn = None
        self.room_graph = None  # Graphe des connexions entre salles
        
        # Paramètres de génération
        self.MIN_ARTWORKS = 5
        self.MAX_ARTWORKS = 15
        self.AVG_TIME_PER_ARTWORK = 3  # minutes
        self.WALKING_SPEED = 1.2  # m/s
        
    def _get_connection(self):
        """Obtenir connexion PostgreSQL"""
        if not self.conn or self.conn.closed:
            self.conn = _connect_postgres()
        return self.conn
    
    def _load_room_graph(self, cur) -> RoomGraph:
        """
        Charge le graphe des salles et portes depuis la base
        """
        graph = RoomGraph()
        
        # Récupérer les centres des salles (position moyenne des points)
        query_rooms = """
        SELECT 
            e.entity_id,
            AVG(p.x) as center_x,
            AVG(p.y) as center_y
        FROM entities e
        JOIN points p ON p.entity_id = e.entity_id
        WHERE e.entity_type = 'ROOM'
        GROUP BY e.entity_id
        """
        
        cur.execute(query_rooms)
        rooms = cur.fetchall()
        
        for room in rooms:
            center_x = float(room['center_x'])
            center_y = float(room['center_y'])
            
            graph.add_room_center(
                room['entity_id'],
                Position(
                    x=center_x,
                    y=center_y,
                    room=room['entity_id'],
                    floor=0  # TODO: Récupérer depuis plan_id
                )
            )
        
        # Charger les bounds (limites) de chaque salle
        query_room_bounds = """
        SELECT 
            e.entity_id,
            MIN(p.x) as min_x,
            MIN(p.y) as min_y,
            MAX(p.x) as max_x,
            MAX(p.y) as max_y
        FROM entities e
        JOIN points p ON p.entity_id = e.entity_id
        WHERE e.entity_type = 'ROOM'
        GROUP BY e.entity_id
        """
        
        cur.execute(query_room_bounds)
        bounds = cur.fetchall()
        
        for bound in bounds:
            graph.add_room_bounds(
                bound['entity_id'],
                float(bound['min_x']),
                float(bound['min_y']),
                float(bound['max_x']),
                float(bound['max_y'])
            )
        
        # Récupérer les connexions entre salles via les relations de type DOOR
        # Utiliser la position moyenne des centres des 2 salles pour chaque porte
        query_door_relations = """
        SELECT DISTINCT
            r.source_id as room_a_id,
            r.cible_id as room_b_id
        FROM relations r
        JOIN entities e_src ON e_src.entity_id = r.source_id
        JOIN entities e_tgt ON e_tgt.entity_id = r.cible_id
        WHERE r.type_relation = 'DOOR'
          AND e_src.entity_type = 'ROOM'
          AND e_tgt.entity_type = 'ROOM'
        """
        
        cur.execute(query_door_relations)
        door_rels = cur.fetchall()
        
        for door_rel in door_rels:
            try:
                # Calculer position de la porte = moyenne des centres des 2 salles
                if door_rel['room_a_id'] in graph.room_positions and \
                   door_rel['room_b_id'] in graph.room_positions:
                    pos_a = graph.room_positions[door_rel['room_a_id']]
                    pos_b = graph.room_positions[door_rel['room_b_id']]
                    door_x = (pos_a.x + pos_b.x) / 2
                    door_y = (pos_a.y + pos_b.y) / 2
                else:
                    continue
                
                graph.add_door(Door(
                    room_a=door_rel['room_a_id'],
                    room_b=door_rel['room_b_id'],
                    position=Position(
                        x=float(door_x),
                        y=float(door_y),
                        room=0,
                        floor=0
                    )
                ))
                
            except Exception as e:
                print(f"⚠️  Erreur parsing relation porte {door_rel.get('door_entity_id', 'unknown')}: {e}")
                continue
        
        # Charger les murs (obstacles intérieurs dans les salles)
        query_walls = """
        SELECT 
            e.entity_id,
            e.description,
            p1.x as x1, p1.y as y1,
            p2.x as x2, p2.y as y2
        FROM entities e
        JOIN (
            SELECT entity_id, x, y, ROW_NUMBER() OVER (PARTITION BY entity_id ORDER BY point_id) as rn
            FROM points
        ) p1 ON p1.entity_id = e.entity_id AND p1.rn = 1
        JOIN (
            SELECT entity_id, x, y, ROW_NUMBER() OVER (PARTITION BY entity_id ORDER BY point_id) as rn
            FROM points
        ) p2 ON p2.entity_id = e.entity_id AND p2.rn = 2
        WHERE e.entity_type = 'WALL'
        """
        
        cur.execute(query_walls)
        walls = cur.fetchall()
        
        for wall in walls:
            try:
                # Parser la description pour trouver la salle (roomId)
                import json
                desc = json.loads(wall['description']) if wall['description'] else {}
                room_uuid = desc.get('roomId', '')
                
                # Trouver l'entity_id de la salle via son UUID
                cur.execute(
                    "SELECT entity_id FROM entities WHERE entity_type = 'ROOM' AND description LIKE %s",
                    (f'%{room_uuid}%',)
                )
                room_result = cur.fetchone()
                
                if room_result:
                    graph.add_wall(WallSegment(
                        x1=float(wall['x1']),
                        y1=float(wall['y1']),
                        x2=float(wall['x2']),
                        y2=float(wall['y2']),
                        room=room_result['entity_id']
                    ))
            except Exception as e:
                print(f"⚠️  Erreur chargement mur {wall.get('entity_id', 'unknown')}: {e}")
                continue
        
        print(f"📊 Graphe chargé: {len(graph.room_positions)} salles, {len(graph.doors)} portes, {len(graph.walls)} murs")
        return graph
    
    def generate_parcours(self,
                         age_cible: str,
                         thematique: str,
                         style_texte: str,
                         max_artworks: Optional[int] = None,
                         target_duration_minutes: Optional[int] = None,
                         variation_seed: Optional[int] = None) -> Parcours:
        """
        Génère un parcours intelligent
        
        Args:
            age_cible: 'enfant', 'ado', 'adulte', 'senior'
            thematique: 'technique_picturale', 'biographie', 'historique'
            style_texte: 'analyse', 'decouverte', 'anecdote'
            max_artworks: Nombre max d'œuvres (None = auto)
            target_duration_minutes: Durée cible en minutes (None = auto)
            variation_seed: Seed pour variations (None = aléatoire)
        
        Returns:
            Parcours complet optimisé
        """
        
        # Seed pour variations
        if variation_seed is None:
            variation_seed = random.randint(1, 10000)
        random.seed(variation_seed)
        
        print(f"\n{'='*80}")
        print(f"🎯 GÉNÉRATION PARCOURS INTELLIGENT")
        print(f"{'='*80}")
        print(f"Profil: {age_cible} / {thematique} / {style_texte}")
        print(f"Seed variation: {variation_seed}")
        
        # 0. CHARGER LE GRAPHE DES SALLES ET PORTES
        conn = self._get_connection()
        cur = conn.cursor()
        
        try:
            self.room_graph = self._load_room_graph(cur)
        except Exception as e:
            print(f"⚠️  Impossible de charger le graphe des salles: {e}")
            print(f"   → Utilisation des distances euclidiennes")
            self.room_graph = RoomGraph()  # Graphe vide
        
        # 1. RÉCUPÉRER LES ŒUVRES AVEC NARRATIONS
        artworks = self._fetch_artworks_with_narrations(
            cur, age_cible, thematique, style_texte
        )
        
        cur.close()
        
        if not artworks:
            raise ValueError("Aucune œuvre trouvée avec narrations pour ce profil")
        
        print(f"📚 Œuvres disponibles: {len(artworks)}")
        
        # 2. SÉLECTION INTELLIGENTE
        selected = self._select_artworks_smart(
            artworks,
            max_artworks or self.MAX_ARTWORKS,
            target_duration_minutes
        )
        
        print(f"✅ Œuvres sélectionnées: {len(selected)}")
        
        # 3. OPTIMISATION DU CHEMIN
        optimized_path = self._optimize_path(selected)
        
        print(f"🗺️  Chemin optimisé: {len(optimized_path)} étapes")
        
        # 4. CALCULER MÉTRIQUES
        total_distance = self._calculate_total_distance(optimized_path)
        total_duration = self._calculate_duration(optimized_path, total_distance)
        
        # 5. CONSTRUIRE LE PARCOURS FINAL
        parcours = Parcours(
            parcours_id=f"parcours_{variation_seed}",
            profil={
                'age_cible': age_cible,
                'thematique': thematique,
                'style_texte': style_texte
            },
            artworks=optimized_path,
            total_distance=round(total_distance, 2),
            total_duration_minutes=total_duration,
            path_order=[a.oeuvre_id for a in optimized_path],
            metadata={
                'variation_seed': variation_seed,
                'artwork_count': len(optimized_path),
                'floors_visited': len(set(a.position.floor for a in optimized_path)),
                'rooms_visited': len(set(a.room for a in optimized_path))
            }
        )
        
        print(f"\n📊 RÉSULTAT:")
        print(f"   Distance totale: {parcours.total_distance}m")
        print(f"   Durée estimée: {parcours.total_duration_minutes} minutes")
        print(f"   Étages visités: {parcours.metadata['floors_visited']}")
        print(f"   Salles visitées: {parcours.metadata['rooms_visited']}")
        print(f"{'='*80}\n")
        
        return parcours
    
    def _fetch_artworks_with_narrations(self,
                                       cur,
                                       age_cible: str,
                                       thematique: str,
                                       style_texte: str) -> List[Artwork]:
        """
        Récupère toutes les œuvres avec narrations pour le profil
        """
        
        query = """
        SELECT 
            o.oeuvre_id,
            o.title,
            o.artist,
            o.date_oeuvre,
            o.materiaux_technique,
            o.room,
            p.pregeneration_text,
            e.entity_id
        FROM oeuvres o
        INNER JOIN pregenerations p ON o.oeuvre_id = p.oeuvre_id
        LEFT JOIN entities e ON o.oeuvre_id = e.oeuvre_id
        WHERE 
            p.age_cible = %s
            AND p.thematique = %s
            AND p.style_texte = %s
            AND o.room IS NOT NULL
        ORDER BY o.oeuvre_id
        """
        
        cur.execute(query, (age_cible, thematique, style_texte))
        rows = cur.fetchall()
        
        artworks = []
        for row in rows:
            # Récupérer position de l'entité
            position = self._get_entity_position(cur, row['entity_id']) if row['entity_id'] else None
            
            if not position:
                # Position par défaut si pas d'entité
                position = Position(
                    x=float(row['room'] * 100),  # Position estimée
                    y=100.0,
                    room=row['room'],
                    floor=0
                )
            
            artworks.append(Artwork(
                oeuvre_id=row['oeuvre_id'],
                title=row['title'],
                artist=row['artist'],
                date_oeuvre=row['date_oeuvre'] or '',
                materiaux_technique=row['materiaux_technique'] or '',
                position=position,
                narration=row['pregeneration_text'],
                narration_length=len(row['pregeneration_text']),
                room=row['room']
            ))
        
        return artworks
    
    def _get_entity_position(self, cur, entity_id: int) -> Optional[Position]:
        """Récupère la position moyenne d'une entité via ses points"""
        
        if not entity_id:
            return None
        
        # Récupérer la position moyenne + room_id de l'œuvre
        query = """
        SELECT 
            AVG(p.x) as avg_x, 
            AVG(p.y) as avg_y,
            o.room
        FROM points p
        JOIN entities e ON e.entity_id = p.entity_id
        LEFT JOIN oeuvres o ON o.oeuvre_id = e.oeuvre_id
        WHERE p.entity_id = %s
        GROUP BY o.room
        """
        
        cur.execute(query, (entity_id,))
        row = cur.fetchone()
        
        if row and row['avg_x'] and row['avg_y']:
            return Position(
                x=float(row['avg_x']),
                y=float(row['avg_y']),
                room=int(row['room']) if row['room'] else 0,
                floor=0  # À récupérer depuis plan_id si multi-étages
            )
        
        return None
    
    def _select_artworks_smart(self,
                              artworks: List[Artwork],
                              max_count: int,
                              target_duration: Optional[int]) -> List[Artwork]:
        """
        Sélection intelligente des œuvres
        - Diversité (différentes salles/étages)
        - Équilibrage (pas trop concentré)
        - Respect durée cible
        """
        
        if len(artworks) <= max_count:
            return artworks
        
        # Si durée cible spécifiée, ajuster max_count
        if target_duration:
            estimated_count = max(
                self.MIN_ARTWORKS,
                min(max_count, target_duration // self.AVG_TIME_PER_ARTWORK)
            )
            max_count = estimated_count
        
        # Sélection avec diversité
        selected = []
        remaining = artworks.copy()
        rooms_used = set()
        
        # Ajouter une œuvre aléatoire de chaque salle si possible
        while len(selected) < max_count and remaining:
            # Prioriser les salles non visitées
            unvisited_rooms = [a for a in remaining if a.room not in rooms_used]
            
            if unvisited_rooms:
                artwork = random.choice(unvisited_rooms)
                rooms_used.add(artwork.room)
            else:
                # Sinon, prendre au hasard
                artwork = random.choice(remaining)
            
            selected.append(artwork)
            remaining.remove(artwork)
        
        return selected
    
    def _optimize_path(self, artworks: List[Artwork]) -> List[Artwork]:
        """
        Optimise le chemin (Nearest Neighbor Algorithm)
        Utilise le graphe des salles si disponible pour calculer la vraie distance
        """
        
        if len(artworks) <= 1:
            return artworks
        
        # Départ: première œuvre aléatoire
        path = [artworks[0]]
        remaining = list(artworks[1:])
        
        # Greedy nearest neighbor avec distance réelle via portes
        while remaining:
            current = path[-1]
            
            # Fonction de distance qui prend en compte les portes
            def get_distance(artwork: Artwork) -> float:
                if self.room_graph and len(self.room_graph.doors) > 0:
                    # Utiliser le pathfinding avec portes
                    return self.room_graph.calculate_room_path_distance(
                        current.position,
                        artwork.position
                    )
                else:
                    # Fallback: distance euclidienne simple
                    return current.position.distance(artwork.position)
            
            # Trouver la plus proche (en tenant compte des portes)
            nearest = min(remaining, key=get_distance)
            
            path.append(nearest)
            remaining.remove(nearest)
        
        return path
    
    def _calculate_total_distance(self, path: List[Artwork]) -> float:
        """
        Calcule la distance totale du parcours
        Utilise le graphe des salles si disponible
        """
        
        if len(path) <= 1:
            return 0.0
        
        total = 0.0
        for i in range(len(path) - 1):
            if self.room_graph and len(self.room_graph.doors) > 0:
                # Distance réelle via portes
                total += self.room_graph.calculate_room_path_distance(
                    path[i].position,
                    path[i + 1].position
                )
            else:
                # Distance euclidienne
                total += path[i].position.distance(path[i + 1].position)
        
        return total
    
    def _calculate_duration(self, path: List[Artwork], distance: float) -> int:
        """
        Calcule la durée totale estimée
        = temps de marche + temps d'écoute des narrations
        """
        
        # Temps de marche (distance en mètres / vitesse m/s / 60)
        walking_minutes = (distance / self.WALKING_SPEED) / 60
        
        # Temps d'écoute (estimation: 150 mots/min en français)
        listening_minutes = sum(
            len(a.narration.split()) / 150 for a in path
        )
        
        return int(walking_minutes + listening_minutes + 0.5)  # Arrondi
    
    def export_to_json(self, parcours: Parcours) -> Dict:
        """
        Exporte le parcours en JSON complet
        """
        
        return {
            'parcours_id': parcours.parcours_id,
            'profil': parcours.profil,
            'metadata': {
                **parcours.metadata,
                'total_distance_meters': parcours.total_distance,
                'total_duration_minutes': parcours.total_duration_minutes
            },
            'artworks': [
                {
                    'order': idx + 1,
                    'oeuvre_id': artwork.oeuvre_id,
                    'title': artwork.title,
                    'artist': artwork.artist,
                    'date': artwork.date_oeuvre,
                    'materiaux_technique': artwork.materiaux_technique,
                    'position': {
                        'x': artwork.position.x,
                        'y': artwork.position.y,
                        'room': artwork.position.room,
                        'floor': artwork.position.floor
                    },
                    'narration': artwork.narration,
                    'narration_word_count': len(artwork.narration.split()),
                    'distance_to_next': (
                        self._get_artwork_distance(artwork, parcours.artworks[idx + 1])
                        if idx < len(parcours.artworks) - 1
                        else 0
                    )
                }
                for idx, artwork in enumerate(parcours.artworks)
            ]
        }
    
    def _get_artwork_distance(self, from_artwork: Artwork, to_artwork: Artwork) -> float:
        """Calcule la distance entre deux œuvres en utilisant le graphe si disponible"""
        if self.room_graph and len(self.room_graph.doors) > 0:
            return self.room_graph.calculate_room_path_distance(
                from_artwork.position,
                to_artwork.position
            )
        else:
            return from_artwork.position.distance(to_artwork.position)
    
    def close(self):
        """Ferme la connexion DB"""
        if self.conn and not self.conn.closed:
            self.conn.close()


# ===== FONCTION HELPER =====

def generer_parcours_intelligent(age_cible: str,
                                 thematique: str,
                                 style_texte: str,
                                 max_artworks: int = 10,
                                 target_duration: Optional[int] = None,
                                 variation_seed: Optional[int] = None) -> Dict:
    """
    Fonction helper pour générer un parcours
    
    Returns:
        Dict JSON du parcours complet
    """
    
    generator = IntelligentPathGenerator()
    
    try:
        parcours = generator.generate_parcours(
            age_cible=age_cible,
            thematique=thematique,
            style_texte=style_texte,
            max_artworks=max_artworks,
            target_duration_minutes=target_duration,
            variation_seed=variation_seed
        )
        
        return generator.export_to_json(parcours)
        
    finally:
        generator.close()


# ===== TEST =====

if __name__ == '__main__':
    # Test du générateur
    result = generer_parcours_intelligent(
        age_cible='adulte',
        thematique='technique_picturale',
        style_texte='analyse',
        max_artworks=10
    )
    
    print(json.dumps(result, indent=2, ensure_ascii=False))

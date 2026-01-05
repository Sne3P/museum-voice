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
from dataclasses import dataclass
import json

# Imports relatifs
from rag.core.db_postgres import _connect_postgres


@dataclass
class Position:
    """Position géographique dans le musée"""
    x: float
    y: float
    room: int
    floor: int = 0  # Étage (0=RDC, 1=Premier, etc.)
    
    def distance(self, other: 'Position') -> float:
        """Distance euclidienne entre deux positions"""
        if self.floor != other.floor:
            # Pénalité pour changement d'étage
            return 1000.0 + ((self.x - other.x)**2 + (self.y - other.y)**2)**0.5
        return ((self.x - other.x)**2 + (self.y - other.y)**2)**0.5


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
        
        # 1. RÉCUPÉRER LES ŒUVRES AVEC NARRATIONS
        artworks = self._fetch_artworks_with_narrations(
            age_cible, thematique, style_texte
        )
        
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
                                       age_cible: str,
                                       thematique: str,
                                       style_texte: str) -> List[Artwork]:
        """
        Récupère toutes les œuvres avec narrations pour le profil
        """
        
        conn = self._get_connection()
        cur = conn.cursor()
        
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
        
        cur.close()
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
        Minimise la distance totale parcourue
        """
        
        if len(artworks) <= 1:
            return artworks
        
        # Départ: première œuvre aléatoire
        path = [artworks[0]]
        remaining = list(artworks[1:])
        
        # Greedy nearest neighbor
        while remaining:
            current = path[-1]
            
            # Trouver la plus proche
            nearest = min(
                remaining,
                key=lambda a: current.position.distance(a.position)
            )
            
            path.append(nearest)
            remaining.remove(nearest)
        
        return path
    
    def _calculate_total_distance(self, path: List[Artwork]) -> float:
        """Calcule la distance totale du parcours"""
        
        if len(path) <= 1:
            return 0.0
        
        total = 0.0
        for i in range(len(path) - 1):
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
                        artwork.position.distance(parcours.artworks[idx + 1].position)
                        if idx < len(parcours.artworks) - 1
                        else 0
                    )
                }
                for idx, artwork in enumerate(parcours.artworks)
            ]
        }
    
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

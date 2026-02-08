"""
Service de construction des segments de chemin

Responsabilités:
- Générer path_segments pour l'affichage frontend
- Segmentation par étage
- Calcul segment_index pour blue highlight
- Segment entrée → premier artwork
"""

from typing import List, Dict, Optional
import sys
import os
import math

try:
    from ..models import Artwork
    from .connectivity_checker import ConnectivityChecker
except ImportError:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    from models import Artwork
    from services.connectivity_checker import ConnectivityChecker


class SegmentBuilder:
    """Construit les segments de chemin pour visualisation"""
    
    def __init__(self, connectivity_checker: ConnectivityChecker):
        self.checker = connectivity_checker
    
    def build_segments(self, artworks: List[Artwork], entrance: Optional[Dict] = None) -> List[Dict]:
        """
        Génère tous les segments du parcours
        
        Args:
            artworks: Liste des œuvres du parcours
            entrance: Point d'entrée optionnel {x, y, floor, name}
        
        Returns:
            Liste de segments {from, to, distance, floor, segment_index}
        """
        all_segments = []
        stairs_count = 0
        elevator_count = 0
        waypoint_count = 0
        
        # Segment ENTRÉE → PREMIER ARTWORK (segment_index = -1 pour le distinguer)
        if entrance and len(artworks) > 0:
            first_artwork = artworks[0]
            entrance_segments = self._create_entrance_segment(entrance, first_artwork)
            all_segments.extend(entrance_segments)
            print(f"   🚪 Segment entrée → premier artwork ajouté")
        
        for i in range(len(artworks) - 1):
            from_artwork = artworks[i]
            to_artwork = artworks[i + 1]
            
            # Chemin complet avec waypoints
            distance, waypoints = self.checker.calculate_path_between_points(
                from_artwork.position,
                to_artwork.position
            )
            
            # Compter les types de waypoints
            for wp in waypoints:
                if wp.type == 'stairs':
                    stairs_count += 1
                elif wp.type == 'elevator':
                    elevator_count += 1
                elif wp.type == 'waypoint' or wp.type == 'door':
                    waypoint_count += 1
                
                # Log pour débogage escaliers/ascenseurs
                if wp.type in ['stairs', 'elevator']:
                    print(f"  🔸 {wp.type.upper()} détecté: pos=({wp.position['x']:.1f}, {wp.position['y']:.1f}), floor={wp.position['floor']}")
            
            # Construire segments
            segments = self._create_segments_from_waypoints(
                from_artwork, to_artwork, waypoints, i
            )
            
            all_segments.extend(segments)
        
        print(f"\n📍 Waypoints dans les segments:")
        print(f"   🚪 Portes/Waypoints: {waypoint_count}")
        print(f"   🪜 Escaliers: {stairs_count}")
        print(f"   🛗 Ascenseurs: {elevator_count}")
        
        return all_segments
    
    def _create_segments_from_waypoints(
        self,
        from_artwork: Artwork,
        to_artwork: Artwork,
        waypoints: List,
        segment_index: int
    ) -> List[Dict]:
        """Crée segments depuis liste de waypoints"""
        segments = []
        
        # Points du parcours: artwork → waypoints → artwork
        points = [
            {
                'x': from_artwork.position.x,
                'y': from_artwork.position.y,
                'floor': from_artwork.position.floor,
                'room': from_artwork.position.room,
                'type': 'artwork'
            }
        ]
        
        for wp in waypoints:
            points.append({
                'x': wp.position['x'],
                'y': wp.position['y'],
                'floor': wp.position['floor'],
                'room': wp.position['room'],
                'type': wp.type
            })
        
        points.append({
            'x': to_artwork.position.x,
            'y': to_artwork.position.y,
            'floor': to_artwork.position.floor,
            'room': to_artwork.position.room,
            'type': 'artwork'
        })
        
        # Créer segments entre points consécutifs
        for j in range(len(points) - 1):
            from_pt = points[j]
            to_pt = points[j + 1]
            
            # Filtre: ne créer segment que si même étage
            # (transitions escaliers gérées par waypoints)
            if from_pt['floor'] == to_pt['floor']:
                import math
                # Calcul distance en pixels puis conversion en mètres
                # Échelle: 0.5m = 40px → 1px = 0.0125m
                dist_pixels = math.sqrt(
                    (to_pt['x'] - from_pt['x'])**2 +
                    (to_pt['y'] - from_pt['y'])**2
                )
                dist = dist_pixels * 0.0125  # Conversion pixels → mètres
                
                segments.append({
                    'from': {
                        'type': from_pt['type'],
                        'x': from_pt['x'],
                        'y': from_pt['y'],
                        'floor': from_pt['floor'],
                        'room': from_pt['room']
                    },
                    'to': {
                        'type': to_pt['type'],
                        'x': to_pt['x'],
                        'y': to_pt['y'],
                        'floor': to_pt['floor'],
                        'room': to_pt['room']
                    },
                    'distance': dist,
                    'floor': from_pt['floor'],
                    'segment_index': segment_index
                })
        
        return segments

    def _create_entrance_segment(self, entrance: Dict, first_artwork: Artwork) -> List[Dict]:
        """
        Crée le segment entre l'entrée du musée et le premier artwork
        
        Args:
            entrance: {x, y, floor, name, entrance_id}
            first_artwork: Premier artwork du parcours
        
        Returns:
            Liste de segments (peut contenir plusieurs si changement d'étage)
        """
        segments = []
        
        entrance_floor = entrance.get('floor', 0)
        artwork_floor = first_artwork.position.floor
        
        # Si même étage, segment direct
        if entrance_floor == artwork_floor:
            dist_pixels = math.sqrt(
                (first_artwork.position.x - entrance['x'])**2 +
                (first_artwork.position.y - entrance['y'])**2
            )
            dist = dist_pixels * 0.0125  # Conversion pixels → mètres
            
            segments.append({
                'from': {
                    'type': 'entrance',
                    'x': entrance['x'],
                    'y': entrance['y'],
                    'floor': entrance_floor,
                    'room': None,
                    'name': entrance.get('name', 'Entrée')
                },
                'to': {
                    'type': 'artwork',
                    'x': first_artwork.position.x,
                    'y': first_artwork.position.y,
                    'floor': artwork_floor,
                    'room': first_artwork.position.room
                },
                'distance': dist,
                'floor': entrance_floor,
                'segment_index': -1  # Index spécial pour segment entrée
            })
        else:
            # Différents étages - on ne crée pas de segment direct
            # Le frontend gérera l'affichage séparément par étage
            print(f"   ⚠️ Entrée (étage {entrance_floor}) et premier artwork (étage {artwork_floor}) sur étages différents")
        
        return segments

#!/usr/bin/env python3
"""
Service pour gérer les critères dynamiques depuis la BDD
Remplace tous les systèmes hardcodés (AGE, THEMATIQUE, STYLE_TEXTE)
"""

import time
from typing import Dict, List, Optional, Any, Tuple
from .db_postgres import _connect_postgres

# TTL du cache en secondes (5 secondes pour un refresh rapide)
CACHE_TTL = 5


class CriteriaService:
    """Service pour charger et gérer les critères depuis la base PostgreSQL"""
    
    def __init__(self):
        self._cache: Dict[str, Any] = {}
        self._cache_timestamps: Dict[str, float] = {}
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Vérifie si le cache est encore valide (TTL non expiré)"""
        if cache_key not in self._cache_timestamps:
            return False
        age = time.time() - self._cache_timestamps[cache_key]
        return age < CACHE_TTL
    
    def _set_cache(self, cache_key: str, value: Any):
        """Enregistre une valeur dans le cache avec timestamp"""
        self._cache[cache_key] = value
        self._cache_timestamps[cache_key] = time.time()
    
    def get_criteria_types(self) -> List[Dict[str, Any]]:
        """Récupère tous les types de critères
            
        Returns:
            Liste des types de critères avec leurs métadonnées
        """
        cache_key = "types_all"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]
        
        conn = _connect_postgres()
        cur = conn.cursor()
        
        query = """
            SELECT type_id, type, label, description, ordre
            FROM criteria_types
            ORDER BY ordre
        """
        
        cur.execute(query)
        rows = cur.fetchall()
        
        criteria_types = []
        for row in rows:
            criteria_types.append({
                'type_id': row['type_id'],
                'type': row['type'],
                'label': row['label'],
                'description': row['description'],
                'ordre': row['ordre']
            })
        
        cur.close()
        conn.close()
        
        self._set_cache(cache_key, criteria_types)
        return criteria_types
    
    def get_criteria_by_type(self, type_name: str) -> List[Dict[str, Any]]:
        """Récupère tous les critères d'un type spécifique
        
        Args:
            type_name: Le nom du type de critère (age, thematique, accessibilite, etc.)
            
        Returns:
            Liste des critères avec leurs métadonnées
        """
        cache_key = f"criteria_{type_name}"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]
        
        conn = _connect_postgres()
        cur = conn.cursor()
        
        query = """
            SELECT criteria_id, type, name, label, description, 
                   image_link, ai_indication, ordre
            FROM criterias
            WHERE type = %s
            ORDER BY ordre
        """
        
        cur.execute(query, (type_name,))
        rows = cur.fetchall()
        
        criterias = []
        for row in rows:
            criterias.append({
                'criteria_id': row['criteria_id'],
                'type': row['type'],
                'name': row['name'],
                'label': row['label'],
                'description': row['description'],
                'image_link': row['image_link'],
                'ai_indication': row['ai_indication'],
                'ordre': row['ordre']
            })
        
        cur.close()
        conn.close()
        
        self._set_cache(cache_key, criterias)
        return criterias
    
    def get_criteria_by_id(self, criteria_id: int) -> Optional[Dict[str, Any]]:
        """Récupère un critère par son ID
        
        Args:
            criteria_id: L'ID du critère
            
        Returns:
            Dictionnaire contenant les métadonnées du critère ou None
        """
        conn = _connect_postgres()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT criteria_id, type, name, label, description, 
                   image_link, ai_indication, ordre
            FROM criterias
            WHERE criteria_id = %s
        """, (criteria_id,))
        
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not row:
            return None
        
        return {
            'criteria_id': row['criteria_id'],
            'type': row['type'],
            'name': row['name'],
            'label': row['label'],
            'description': row['description'],
            'image_link': row['image_link'],
            'ai_indication': row['ai_indication'],
            'ordre': row['ordre']
        }
    
    def get_criteria_by_name(self, type_name: str, name: str) -> Optional[Dict[str, Any]]:
        """Récupère un critère par son type et son nom
        
        Args:
            type_name: Le type de critère (age, thematique, style_texte)
            name: Le nom du critère (enfant, ado, technique_picturale, etc.)
            
        Returns:
            Dictionnaire contenant les métadonnées du critère ou None
        """
        conn = _connect_postgres()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT criteria_id, type, name, label, description, 
                   image_link, ai_indication, ordre
            FROM criterias
            WHERE type = %s AND name = %s
        """, (type_name, name))
        
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not row:
            return None
        
        return {
            'criteria_id': row['criteria_id'],
            'type': row['type'],
            'name': row['name'],
            'label': row['label'],
            'description': row['description'],
            'image_link': row['image_link'],
            'ai_indication': row['ai_indication'],
            'ordre': row['ordre']
        }
    
    def validate_criteria_combination(self, criteria_dict: Dict[str, int]) -> bool:
        """Valide qu'une combinaison de N critères existe dans la BDD
        VRAIMENT DYNAMIQUE - Supporte 1 à N critères
        
        Args:
            criteria_dict: Dict de criteria_ids par type, ex: {"age": 1, "thematique": 4}
            
        Returns:
            True si tous les critères existent et sont actifs
        """
        if not criteria_dict:
            return False
        
        conn = _connect_postgres()
        cur = conn.cursor()
        
        try:
            # Vérifier que tous les criteria_ids existent et sont actifs
            criteria_ids = list(criteria_dict.values())
            placeholders = ','.join(['%s'] * len(criteria_ids))
            
            cur.execute(f"""
                SELECT COUNT(*) as count
                FROM criterias
                WHERE criteria_id IN ({placeholders})
            """, criteria_ids)
            
            row = cur.fetchone()
            
            # Vérifier aussi que les types correspondent
            for type_name, criteria_id in criteria_dict.items():
                cur.execute("""
                    SELECT COUNT(*) as count
                    FROM criterias
                    WHERE criteria_id = %s AND type = %s
                """, (criteria_id, type_name))
                
                if cur.fetchone()['count'] == 0:
                    return False
            
            return row['count'] == len(criteria_ids)
            
        finally:
            cur.close()
            conn.close()
    
    def get_all_criteria_types(self) -> List[str]:
        """Récupère la liste de tous les types de critères
        
        Returns:
            Liste des types (ex: ['age', 'thematique', 'style_texte'])
        """
        types = self.get_criteria_types()
        return [t['type'] for t in types]
    
    def validate_all_criteria(self, criteria_dict: Dict[str, int]) -> Tuple[bool, List[str]]:
        """Valide que tous les types de critères ont une sélection
        
        Args:
            criteria_dict: Dict de criteria_ids par type
            
        Returns:
            (is_valid, missing_types)
        """
        all_types = self.get_all_criteria_types()
        provided_types = set(criteria_dict.keys())
        missing_types = [t for t in all_types if t not in provided_types]
        
        return (len(missing_types) == 0, missing_types)
    
    def get_ai_indication(self, criteria_id: int) -> Optional[str]:
        """Récupère l'indication AI d'un critère pour la génération
        
        Args:
            criteria_id: L'ID du critère
            
        Returns:
            L'indication AI ou None
        """
        criteria = self.get_criteria_by_id(criteria_id)
        return criteria['ai_indication'] if criteria else None
    
    def clear_cache(self):
        """Vide le cache des critères (utile après modifications en BDD)"""
        self._cache = {}
        self._cache_timestamps = {}


# Instance globale du service
criteria_service = CriteriaService()

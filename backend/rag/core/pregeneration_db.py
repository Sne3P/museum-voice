"""
Gestion des prégénérations dans PostgreSQL
SYSTÈME VRAIMENT DYNAMIQUE - Support de N critères variables (pas seulement 3)
"""

import psycopg2
import json
from typing import Optional, List, Dict, Any, Tuple
from .db_postgres import _connect_postgres

def _normalize_criteria_dict(criteria_dict: Dict[str, Any]) -> Dict[str, int]:
    """
    Garantit un dict {type_name: criteria_id(int)}.
    Accepte aussi {type_name: {"criteria_id": ...}} et convertit en int.
    """
    if criteria_dict is None:
        return {}

    normalized: Dict[str, int] = {}

    for type_name, value in criteria_dict.items():
        # Cas OK: int
        if isinstance(value, int) and not isinstance(value, bool):
            normalized[type_name] = value
            continue

        # Cas: "12"
        if isinstance(value, str) and value.isdigit():
            normalized[type_name] = int(value)
            continue

        # Cas: dict venant de la DB/API
        if isinstance(value, dict):
            if "criteria_id" in value:
                cid = value["criteria_id"]
                if isinstance(cid, int) and not isinstance(cid, bool):
                    normalized[type_name] = cid
                    continue
                if isinstance(cid, str) and cid.isdigit():
                    normalized[type_name] = int(cid)
                    continue
            raise ValueError(
                f"criteria_dict['{type_name}'] doit contenir un 'criteria_id' (int). Reçu: {value!r}"
            )

        # Cas problématique: datetime/date
        if isinstance(value, (datetime, date)):
            raise ValueError(
                f"criteria_dict['{type_name}'] est un datetime/date ({value!r}). "
                f"Attendu: un criteria_id (int)."
            )

        raise ValueError(
            f"criteria_dict['{type_name}'] a un type non supporté: {type(value).__name__} ({value!r}). "
            f"Attendu: int ou dict avec 'criteria_id'."
        )

    return normalized



def add_pregeneration(oeuvre_id: int, criteria_dict: Dict[str, int],
                     pregeneration_text: str,
                     voice_link: Optional[str] = None) -> int:
    """Ajoute une prégénération avec N critères DYNAMIQUES
    
    Args:
        oeuvre_id: ID de l'œuvre
        criteria_dict: Dict de criteria_ids par type, ex: {"age": 1, "thematique": 4, "style_texte": 7}
        pregeneration_text: Texte prégénéré
        voice_link: Lien audio optionnel
        
    Returns:
        ID de la prégénération créée/mise à jour
    """
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        # Convertir le dict en JSONB pour stockage
        criteria_dict = _normalize_criteria_dict(criteria_dict)

        # Convertir le dict en JSONB pour stockage (clé canonique)
        criteria_json = json.dumps(criteria_dict, sort_keys=True)
        
        # Insert or update (ON CONFLICT sur la combinaison unique)
        cur.execute("""
            INSERT INTO pregenerations (
                oeuvre_id, criteria_combination, pregeneration_text, voice_link
            )
            VALUES (%s, %s::jsonb, %s, %s)
            ON CONFLICT (oeuvre_id, criteria_combination)
            DO UPDATE SET
                pregeneration_text = EXCLUDED.pregeneration_text,
                voice_link = EXCLUDED.voice_link,
                updated_at = CURRENT_TIMESTAMP
            RETURNING pregeneration_id
        """, (oeuvre_id, criteria_json, pregeneration_text, voice_link))
        
        pregeneration_id = cur.fetchone()['pregeneration_id']
        
        # Insérer dans la table de liaison pour faciliter les JOIN
        for criteria_id in criteria_dict.values():
            cur.execute("""
                INSERT INTO pregeneration_criterias (pregeneration_id, criteria_id)
                VALUES (%s, %s)
                ON CONFLICT (pregeneration_id, criteria_id) DO NOTHING
            """, (pregeneration_id, criteria_id))
        
        conn.commit()
        return pregeneration_id
        
    finally:
        cur.close()
        conn.close()


def add_pregenerations_batch(batch_data: List[Tuple], force_update: bool = False) -> List[int]:
    """
    Ajoute plusieurs prégénérations en batch avec N critères DYNAMIQUES
    batch_data: List[(oeuvre_id, criteria_dict, pregeneration_text)]
    """
    conn = _connect_postgres()
    cur = conn.cursor()
    
    created_ids = []
    
    try:
        for oeuvre_id, criteria_dict, pregeneration_text in batch_data:
            criteria_json = json.dumps(criteria_dict, sort_keys=True)
            
            cur.execute("""
                INSERT INTO pregenerations (
                    oeuvre_id, criteria_combination, pregeneration_text
                )
                VALUES (%s, %s::jsonb, %s)
                ON CONFLICT (oeuvre_id, criteria_combination)
                DO UPDATE SET
                    pregeneration_text = EXCLUDED.pregeneration_text,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING pregeneration_id
            """, (oeuvre_id, criteria_json, pregeneration_text))
            
            result = cur.fetchone()
            pregeneration_id = result['pregeneration_id'] if result else None
            created_ids.append(pregeneration_id)
            
            # Table de liaison
            if pregeneration_id:
                for criteria_id in criteria_dict.values():
                    cur.execute("""
                        INSERT INTO pregeneration_criterias (pregeneration_id, criteria_id)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                    """, (pregeneration_id, criteria_id))
        
        conn.commit()
        return created_ids
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def get_pregeneration(oeuvre_id: int, criteria_dict: Dict[str, int]) -> Optional[Dict[str, Any]]:
    """Récupère une prégénération spécifique avec N critères DYNAMIQUES
    
    Args:
        oeuvre_id: ID de l'œuvre
        criteria_dict: Dict de criteria_ids, ex: {"age": 1, "thematique": 4}
        
    Returns:
        Dict contenant la prégénération ou None
    """
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        criteria_json = json.dumps(criteria_dict, sort_keys=True)
        
        cur.execute("""
            SELECT * FROM pregenerations
            WHERE oeuvre_id = %s 
              AND criteria_combination = %s::jsonb
        """, (oeuvre_id, criteria_json))
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


def get_artwork_pregenerations(oeuvre_id: int) -> List[Dict[str, Any]]:
    """Récupère toutes les prégénérations d'une œuvre avec critères DYNAMIQUES
    
    Args:
        oeuvre_id: ID de l'œuvre
        
    Returns:
        Liste des prégénérations avec critères enrichis
    """
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                p.pregeneration_id,
                p.oeuvre_id,
                p.criteria_combination,
                p.pregeneration_text,
                p.voice_link,
                p.created_at,
                p.updated_at,
                ARRAY_AGG(
                    JSON_BUILD_OBJECT(
                        'criteria_id', c.criteria_id,
                        'type_name', c.type_name,
                        'name', c.name,
                        'label', c.label,
                        'ai_indication', c.ai_indication
                    )
                ) as criterias
            FROM pregenerations p
            LEFT JOIN pregeneration_criterias pc ON p.pregeneration_id = pc.pregeneration_id
            LEFT JOIN criterias c ON pc.criteria_id = c.criteria_id
            WHERE p.oeuvre_id = %s
            GROUP BY p.pregeneration_id
            ORDER BY p.created_at DESC
        """, (oeuvre_id,))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


def get_pregeneration_stats() -> Dict[str, Any]:
    """Statistiques sur les prégénérations"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        # Total prégénérations
        cur.execute("SELECT COUNT(*) as total FROM pregenerations")
        total = cur.fetchone()['total']
        
        # Par œuvre
        cur.execute("""
            SELECT oeuvre_id, COUNT(*) as count
            FROM pregenerations
            GROUP BY oeuvre_id
            ORDER BY count DESC
        """)
        by_artwork = cur.fetchall()
        
        # Par critères
        cur.execute("""
            SELECT age_cible, COUNT(*) as count
            FROM pregenerations
            GROUP BY age_cible
        """)
        by_age = cur.fetchall()
        
        return {
            'total': total,
            'by_artwork': by_artwork,
            'by_age': {row['age_cible']: row['count'] for row in by_age}
        }
    finally:
        cur.close()
        conn.close()


def check_existing_pregeneration(oeuvre_id: int, age_cible: str,
                                 thematique: str, style_texte: str) -> bool:
    """Vérifie si une prégénération existe"""
    result = get_pregeneration(oeuvre_id, age_cible, thematique, style_texte)
    return result is not None

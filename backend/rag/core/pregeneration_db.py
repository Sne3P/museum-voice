"""
Gestion des prégénérations dans PostgreSQL
"""

import psycopg2
from typing import Optional, List, Dict, Any, Tuple
from .db_postgres import _connect_postgres


def add_pregeneration(oeuvre_id: int, age_cible: str, thematique: str,
                     style_texte: str, pregeneration_text: str,
                     voice_link: Optional[str] = None) -> int:
    """Ajoute une prégénération"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        # Insert or update (ON CONFLICT)
        cur.execute("""
            INSERT INTO pregenerations (
                oeuvre_id, age_cible, thematique, style_texte, 
                pregeneration_text, voice_link
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (oeuvre_id, age_cible, thematique, style_texte)
            DO UPDATE SET
                pregeneration_text = EXCLUDED.pregeneration_text,
                voice_link = EXCLUDED.voice_link,
                updated_at = CURRENT_TIMESTAMP
            RETURNING pregeneration_id
        """, (oeuvre_id, age_cible, thematique, style_texte, 
              pregeneration_text, voice_link))
        
        pregeneration_id = cur.fetchone()['pregeneration_id']
        conn.commit()
        return pregeneration_id
        
    finally:
        cur.close()
        conn.close()


def add_pregenerations_batch(batch_data: List[Tuple], force_update: bool = False) -> List[int]:
    """
    Ajoute plusieurs prégénérations en batch
    batch_data: List[(oeuvre_id, age_cible, thematique, style_texte, pregeneration_text)]
    """
    conn = _connect_postgres()
    cur = conn.cursor()
    
    created_ids = []
    
    try:
        for oeuvre_id, age_cible, thematique, style_texte, pregeneration_text in batch_data:
            cur.execute("""
                INSERT INTO pregenerations (
                    oeuvre_id, age_cible, thematique, style_texte, pregeneration_text
                )
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (oeuvre_id, age_cible, thematique, style_texte)
                DO UPDATE SET
                    pregeneration_text = EXCLUDED.pregeneration_text,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING pregeneration_id
            """, (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text))
            
            result = cur.fetchone()
            created_ids.append(result['pregeneration_id'] if result else None)
        
        conn.commit()
        return created_ids
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def get_pregeneration(oeuvre_id: int, age_cible: str, 
                      thematique: str, style_texte: str) -> Optional[Dict[str, Any]]:
    """Récupère une prégénération spécifique"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT * FROM pregenerations
            WHERE oeuvre_id = %s 
              AND age_cible = %s 
              AND thematique = %s 
              AND style_texte = %s
        """, (oeuvre_id, age_cible, thematique, style_texte))
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


def get_artwork_pregenerations(oeuvre_id: int) -> List[Dict[str, Any]]:
    """Récupère toutes les prégénérations d'une œuvre"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT * FROM pregenerations
            WHERE oeuvre_id = %s
            ORDER BY age_cible, thematique, style_texte
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

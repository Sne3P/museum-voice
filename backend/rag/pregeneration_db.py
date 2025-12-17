#!/usr/bin/env python3
"""
Fonctions de gestion des prégénérations avec critères multiples
"""

import sqlite3
from typing import List, Dict, Any, Optional
from pathlib import Path

def _connect_pregeneration(db_path: Optional[str] = None) -> sqlite3.Connection:
    """Connexion à la base de données pour les prégénérations"""
    if db_path is None:
        db_path = "../../database/museum_v1.db"
    return sqlite3.connect(db_path)

def add_pregeneration(oeuvre_id: int, age_cible: str, thematique: str, 
                     style_texte: str, pregeneration_text: str,
                     voice_link: Optional[str] = None, db_path: Optional[str] = None) -> int:
    """Ajoute ou met à jour une prégénération avec critères spécifiques"""
    
    # Validation des critères
    valid_ages = ['enfant', 'ado', 'adulte', 'senior']
    valid_themes = ['technique_picturale', 'biographie', 'historique']
    valid_styles = ['analyse', 'decouverte', 'anecdote']
    
    if age_cible not in valid_ages:
        raise ValueError(f"Age invalide. Valeurs autorisées: {valid_ages}")
    if thematique not in valid_themes:
        raise ValueError(f"Thématique invalide. Valeurs autorisées: {valid_themes}")
    if style_texte not in valid_styles:
        raise ValueError(f"Style invalide. Valeurs autorisées: {valid_styles}")
    
    conn = _connect_pregeneration(db_path)
    cur = conn.cursor()
    
    try:
        # Vérifier si cette combinaison existe déjà
        cur.execute("""
            SELECT pregeneration_id FROM pregenerations 
            WHERE oeuvre_id = ? AND age_cible = ? AND thematique = ? AND style_texte = ?
        """, (oeuvre_id, age_cible, thematique, style_texte))
        
        existing = cur.fetchone()
        
        if existing:
            # Mettre à jour l'existant
            cur.execute("""
                UPDATE pregenerations 
                SET pregeneration_text = ?, voice_link = ?, updated_at = CURRENT_TIMESTAMP
                WHERE pregeneration_id = ?
            """, (pregeneration_text, voice_link, existing[0]))
            
            pregeneration_id = existing[0]
            print(f"🔄 Prégénération mise à jour (ID: {pregeneration_id})")
        else:
            # Créer une nouvelle prégénération
            cur.execute("""
                INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text, voice_link)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text, voice_link))
            
            pregeneration_id = cur.lastrowid
            print(f"✨ Nouvelle prégénération créée (ID: {pregeneration_id})")
        
        conn.commit()
        return pregeneration_id
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_pregeneration(oeuvre_id: int, age_cible: str, thematique: str, 
                     style_texte: str, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Récupère une prégénération spécifique"""
    
    conn = _connect_pregeneration(db_path)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT pregeneration_id, oeuvre_id, age_cible, thematique, style_texte, 
               pregeneration_text, voice_link, created_at, updated_at
        FROM pregenerations 
        WHERE oeuvre_id = ? AND age_cible = ? AND thematique = ? AND style_texte = ?
    """, (oeuvre_id, age_cible, thematique, style_texte))
    
    result = cur.fetchone()
    conn.close()
    
    if result:
        return {
            'pregeneration_id': result[0],
            'oeuvre_id': result[1],
            'age_cible': result[2],
            'thematique': result[3],
            'style_texte': result[4],
            'pregeneration_text': result[5],
            'voice_link': result[6],
            'created_at': result[7],
            'updated_at': result[8]
        }
    return None

def list_pregenerations_for_artwork(oeuvre_id: int, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Liste toutes les prégénérations d'une œuvre"""
    
    conn = _connect_pregeneration(db_path)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT pregeneration_id, age_cible, thematique, style_texte, 
               pregeneration_text, voice_link, created_at, updated_at
        FROM pregenerations 
        WHERE oeuvre_id = ?
        ORDER BY age_cible, thematique, style_texte
    """, (oeuvre_id,))
    
    results = cur.fetchall()
    conn.close()
    
    pregenerations = []
    for result in results:
        pregenerations.append({
            'pregeneration_id': result[0],
            'oeuvre_id': oeuvre_id,
            'age_cible': result[1],
            'thematique': result[2], 
            'style_texte': result[3],
            'pregeneration_text': result[4],
            'voice_link': result[5],
            'created_at': result[6],
            'updated_at': result[7]
        })
    
    return pregenerations

def get_pregeneration_stats(db_path: Optional[str] = None) -> Dict[str, Any]:
    """Statistiques des prégénérations"""
    
    conn = _connect_pregeneration(db_path)
    cur = conn.cursor()
    
    # Total prégénérations
    cur.execute("SELECT COUNT(*) FROM pregenerations")
    total = cur.fetchone()[0]
    
    # Par âge
    cur.execute("SELECT age_cible, COUNT(*) FROM pregenerations GROUP BY age_cible")
    by_age = dict(cur.fetchall())
    
    # Par thématique
    cur.execute("SELECT thematique, COUNT(*) FROM pregenerations GROUP BY thematique")
    by_theme = dict(cur.fetchall())
    
    # Par style
    cur.execute("SELECT style_texte, COUNT(*) FROM pregenerations GROUP BY style_texte")
    by_style = dict(cur.fetchall())
    
    # Œuvres couvertes
    cur.execute("SELECT COUNT(DISTINCT oeuvre_id) FROM pregenerations")
    oeuvres_covered = cur.fetchone()[0]
    
    # Total œuvres
    cur.execute("SELECT COUNT(*) FROM oeuvres")
    total_oeuvres = cur.fetchone()[0]
    
    conn.close()
    
    return {
        'total_pregenerations': total,
        'oeuvres_covered': oeuvres_covered,
        'total_oeuvres': total_oeuvres,
        'coverage_percent': (oeuvres_covered / total_oeuvres * 100) if total_oeuvres > 0 else 0,
        'by_age': by_age,
        'by_theme': by_theme,
        'by_style': by_style
    }

def delete_pregeneration(oeuvre_id: int, age_cible: str, thematique: str, 
                        style_texte: str, db_path: Optional[str] = None) -> bool:
    """Supprime une prégénération spécifique"""
    
    conn = _connect_pregeneration(db_path)
    cur = conn.cursor()
    
    cur.execute("""
        DELETE FROM pregenerations 
        WHERE oeuvre_id = ? AND age_cible = ? AND thematique = ? AND style_texte = ?
    """, (oeuvre_id, age_cible, thematique, style_texte))
    
    deleted = cur.rowcount > 0
    conn.commit()
    conn.close()
    
    return deleted
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Module pour récupérer et utiliser les contenus prégénérés
"""

import sqlite3
from typing import Optional, Dict, List
from pathlib import Path

def get_pregenerated_content(oeuvre_id: int, age_cible: str, thematique: str, 
                           style_texte: str, db_path: Optional[str] = None) -> Optional[str]:
    """
    Récupère un contenu prégénéré pour une œuvre selon des critères spécifiques.
    
    Args:
        oeuvre_id: ID de l'œuvre
        age_cible: Cible d'âge (enfant, ado, adulte, senior)
        thematique: Thématique (technique_picturale, biographie, historique)
        style_texte: Style de texte (analyse, decouverte, anecdote)
        db_path: Chemin vers la base de données (optionnel)
    
    Returns:
        Le contenu prégénéré ou None si non trouvé
    """
    
    if not db_path:
        db_path = "../../database/museum_v1.db"
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT pregeneration_text, created_at
            FROM pregenerations 
            WHERE oeuvre_id = ? 
              AND age_cible = ? 
              AND thematique = ? 
              AND style_texte = ?
        """, (oeuvre_id, age_cible, thematique, style_texte))
        
        result = cur.fetchone()
        return result[0] if result else None
        
    finally:
        conn.close()

def get_available_pregenerated_content(oeuvre_id: int, 
                                     db_path: Optional[str] = None) -> List[Dict]:
    """
    Récupère tous les contenus prégénérés disponibles pour une œuvre.
    
    Args:
        oeuvre_id: ID de l'œuvre
        db_path: Chemin vers la base de données (optionnel)
    
    Returns:
        Liste des contenus disponibles avec leurs critères
    """
    
    if not db_path:
        db_path = "../../database/museum_v1.db"
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT age_cible, thematique, style_texte, pregeneration_text, created_at
            FROM pregenerations 
            WHERE oeuvre_id = ?
            ORDER BY age_cible, thematique, style_texte
        """, (oeuvre_id,))
        
        results = []
        for row in cur.fetchall():
            results.append({
                'age_cible': row[0],
                'thematique': row[1], 
                'style_texte': row[2],
                'content': row[3],
                'created_at': row[4]
            })
        
        return results
        
    finally:
        conn.close()

def get_pregeneration_statistics(db_path: Optional[str] = None) -> Dict:
    """
    Récupère les statistiques de prégénération.
    
    Args:
        db_path: Chemin vers la base de données (optionnel)
    
    Returns:
        Dictionnaire avec les statistiques
    """
    
    if not db_path:
        db_path = "../../database/museum_v1.db"
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    try:
        stats = {}
        
        # Total
        cur.execute("SELECT COUNT(*) FROM pregenerations")
        stats['total_pregenerated'] = cur.fetchone()[0]
        
        # Par âge
        cur.execute("""
            SELECT age_cible, COUNT(*) 
            FROM pregenerations 
            GROUP BY age_cible
        """)
        stats['by_age'] = dict(cur.fetchall())
        
        # Par thématique  
        cur.execute("""
            SELECT thematique, COUNT(*) 
            FROM pregenerations 
            GROUP BY thematique
        """)
        stats['by_theme'] = dict(cur.fetchall())
        
        # Par style
        cur.execute("""
            SELECT style_texte, COUNT(*) 
            FROM pregenerations 
            GROUP BY style_texte
        """)
        stats['by_style'] = dict(cur.fetchall())
        
        # Œuvres couvertes
        cur.execute("""
            SELECT COUNT(DISTINCT oeuvre_id) 
            FROM pregenerations
        """)
        stats['covered_artworks'] = cur.fetchone()[0]
        
        # Total d'œuvres
        cur.execute("SELECT COUNT(*) FROM oeuvres")
        stats['total_artworks'] = cur.fetchone()[0]
        
        return stats
        
    finally:
        conn.close()

def test_pregenerated_content():
    """Fonction de test pour vérifier le système de récupération"""
    
    print("🧪 TEST DU SYSTÈME DE RÉCUPÉRATION")
    print("=" * 50)
    
    # Test 1: Récupération d'un contenu spécifique
    content = get_pregenerated_content(27, 'enfant', 'technique_picturale', 'analyse')
    print(f"📖 Contenu enfant-technique-analyse (Radeau): {content[:100]}...")
    
    # Test 2: Tous les contenus d'une œuvre
    all_contents = get_available_pregenerated_content(27)
    print(f"\n📚 Contenus disponibles pour l'œuvre 27: {len(all_contents)}")
    
    # Test 3: Statistiques
    stats = get_pregeneration_statistics()
    print(f"\n📊 Statistiques:")
    print(f"   Total prégénérations: {stats['total_pregenerated']}")
    print(f"   Œuvres couvertes: {stats['covered_artworks']}/{stats['total_artworks']}")
    print(f"   Par âge: {stats['by_age']}")

if __name__ == "__main__":
    test_pregenerated_content()
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour voir des exemples détaillés de contenus générés
"""

import sqlite3
from pathlib import Path

def show_detailed_examples():
    """Affiche des exemples détaillés de personnalisation."""
    
    # Chemin de la base
    db_path = Path("../../database/museum_v1.db")
    
    # Connexion
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    print("🎨 EXEMPLES DÉTAILLÉS - ADAPTATION PAR ÂGE")
    print("Œuvre: Le Radeau de la Méduse | Thème: biographie | Style: découverte")
    print("=" * 80)
    
    # Exemples par âge pour la même œuvre/thème/style
    cur.execute("""
        SELECT age_cible, pregeneration_text 
        FROM pregenerations p
        JOIN oeuvres o ON p.oeuvre_id = o.oeuvre_id
        WHERE o.titre = 'Le Radeau de la Méduse' 
          AND p.thematique = 'biographie' 
          AND p.style_texte = 'decouverte'
        ORDER BY 
          CASE age_cible 
            WHEN 'enfant' THEN 1
            WHEN 'ado' THEN 2  
            WHEN 'adulte' THEN 3
            WHEN 'senior' THEN 4
          END
    """)
    
    for age, content in cur.fetchall():
        print(f"👥 {age.upper()}:")
        print(f"📖 {content}")
        print("-" * 60)
    
    print("\n🎨 EXEMPLES STYLES DIFFÉRENTS - MÊME CRITÈRES")
    print("Œuvre: La Joconde | Âge: adulte | Thème: historique")
    print("=" * 80)
    
    # Exemples par style pour les mêmes critères
    cur.execute("""
        SELECT style_texte, pregeneration_text 
        FROM pregenerations p
        JOIN oeuvres o ON p.oeuvre_id = o.oeuvre_id
        WHERE o.titre = 'La Joconde' 
          AND p.age_cible = 'adulte' 
          AND p.thematique = 'historique'
        ORDER BY style_texte
    """)
    
    for style, content in cur.fetchall():
        print(f"📝 Style {style.upper()}:")
        print(f"📖 {content}")
        print("-" * 60)
    
    print("\n🎯 EXEMPLES THÉMATIQUES - MÊME ŒUVRE")
    print("Œuvre: Les Demoiselles d'Avignon | Âge: ado | Style: analyse")
    print("=" * 80)
    
    # Exemples par thématique
    cur.execute("""
        SELECT thematique, pregeneration_text 
        FROM pregenerations p
        JOIN oeuvres o ON p.oeuvre_id = o.oeuvre_id
        WHERE o.titre = 'Les Demoiselles d''Avignon' 
          AND p.age_cible = 'ado' 
          AND p.style_texte = 'analyse'
        ORDER BY thematique
    """)
    
    for theme, content in cur.fetchall():
        print(f"🎭 Thème {theme.upper()}:")
        print(f"📖 {content}")
        print("-" * 60)
    
    conn.close()

if __name__ == "__main__":
    show_detailed_examples()
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour vérifier les exemples de contenu généré
"""

import sqlite3
from pathlib import Path

def check_generated_examples():
    """Vérifie quelques exemples de contenus générés."""
    
    # Chemin de la base
    db_path = Path("../../database/museum_v1.db")
    
    # Connexion
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    print("📊 STRUCTURE TABLE OEUVRES:")
    cur.execute("PRAGMA table_info(oeuvres)")
    columns = cur.fetchall()
    for col in columns:
        print(f"  {col[1]}: {col[2]}")
    
    print("\n🎨 EXEMPLES DE CONTENU GÉNÉRÉ")
    print("=" * 80)
    
    # Requête pour voir des exemples
    cur.execute("""
        SELECT o.titre, p.age_cible, p.thematique, p.style_texte, 
               SUBSTR(p.pregeneration_text, 1, 150) || '...' as extrait
        FROM pregenerations p
        JOIN oeuvres o ON p.oeuvre_id = o.oeuvre_id
        WHERE p.pregeneration_id IN (1, 10, 19, 37, 73, 100, 108)
        ORDER BY p.pregeneration_id
    """)
    
    results = cur.fetchall()
    for result in results:
        titre, age, theme, style, extrait = result
        print(f"📚 Œuvre: {titre}")
        print(f"👥 Age: {age} | 🎭 Thème: {theme} | 📝 Style: {style}")
        print(f"📖 Extrait: {extrait}")
        print("-" * 80)
    
    # Stats générales
    print("\n📈 STATISTIQUES GLOBALES:")
    cur.execute("SELECT COUNT(*) FROM pregenerations")
    total = cur.fetchone()[0]
    print(f"   📚 Total prégénérations: {total}")
    
    cur.execute("""
        SELECT age_cible, COUNT(*) 
        FROM pregenerations 
        GROUP BY age_cible 
        ORDER BY age_cible
    """)
    ages = cur.fetchall()
    print("   👥 Par âge:")
    for age, count in ages:
        print(f"      {age}: {count}")
    
    cur.execute("""
        SELECT thematique, COUNT(*) 
        FROM pregenerations 
        GROUP BY thematique 
        ORDER BY thematique
    """)
    themes = cur.fetchall()
    print("   🎭 Par thématique:")
    for theme, count in themes:
        print(f"      {theme}: {count}")
    
    conn.close()

if __name__ == "__main__":
    check_generated_examples()
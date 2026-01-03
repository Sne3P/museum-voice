#!/usr/bin/env python3
"""
Script de génération manuelle rapide de parcours pour test
"""

import sqlite3
import uuid
from pathlib import Path
import json

def create_simple_parcours():
    """Créer quelques parcours simples pour tester le système web"""
    
    db_path = Path(__file__).parent.parent.parent / 'database' / 'museum_v1.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Vérifier qu'on a des œuvres
    cursor.execute("SELECT COUNT(*) FROM oeuvres")
    oeuvres_count = cursor.fetchone()[0]
    
    if oeuvres_count == 0:
        print("❌ Aucune œuvre en base. Lancez d'abord le traitement des PDFs.")
        conn.close()
        return False
    
    # Récupérer quelques œuvres
    cursor.execute("SELECT titre, description, artiste_nom FROM oeuvres LIMIT 3")
    oeuvres = cursor.fetchall()
    
    print(f"📄 {len(oeuvres)} œuvres disponibles:")
    for titre, desc, artiste in oeuvres:
        print(f"  - {titre} ({artiste})")
    
    # Définir les parcours à créer
    parcours_configs = [
        {
            "age_cible": "adulte",
            "thematique": "histoire_art",
            "style_texte": "académique",
            "description": "Parcours approfondi pour adultes"
        },
        {
            "age_cible": "ado", 
            "thematique": "art_moderne",
            "style_texte": "accessible",
            "description": "Découverte artistique pour adolescents"
        },
        {
            "age_cible": "enfant",
            "thematique": "couleurs_formes", 
            "style_texte": "simple",
            "description": "Exploration ludique pour enfants"
        }
    ]
    
    print(f"\n🎭 Création de {len(parcours_configs)} parcours...")
    
    for i, config in enumerate(parcours_configs, 1):
        group_id = str(uuid.uuid4())[:8]  # ID court
        
        print(f"\n🎨 Parcours {i}: {config['age_cible']} / {config['thematique']}")
        
        # Créer les segments
        segments = [
            {
                "order": 1,
                "type": "introduction_oeuvre",
                "title": "Introduction et première œuvre",
                "content": f"""Bienvenue dans ce parcours {config['description'].lower()}.

{oeuvres[0][1][:200]}...

Cette œuvre remarquable, "{oeuvres[0][0]}" de {oeuvres[0][2]}, illustre parfaitement les codes artistiques de son époque. 

Prenez un moment pour observer les détails de cette composition avant de poursuivre vers la prochaine œuvre.""",
                "oeuvre": {
                    "titre": oeuvres[0][0],
                    "artiste": oeuvres[0][2],
                    "oeuvre_id": 1
                }
            },
            {
                "order": 2, 
                "type": "oeuvre",
                "title": "Deuxième œuvre",
                "content": f"""Poursuivons notre découverte avec cette seconde œuvre fascinante.

"{oeuvres[1][0]}" nous emmène dans un univers différent. {oeuvres[1][1][:150]}...

L'artiste {oeuvres[1][2]} démontre ici une approche unique qui mérite toute votre attention.""",
                "oeuvre": {
                    "titre": oeuvres[1][0],
                    "artiste": oeuvres[1][2],
                    "oeuvre_id": 2
                }
            },
            {
                "order": 3,
                "type": "conclusion", 
                "title": "Conclusion du parcours",
                "content": f"""Notre parcours touche à sa fin avec une dernière œuvre remarquable.

"{oeuvres[2][0]}" de {oeuvres[2][2]} clôture magnifiquement cette visite. {oeuvres[2][1][:100]}...

Nous espérons que cette découverte vous aura enrichi et donné envie d'explorer davantage l'art. Merci de votre visite !""",
                "oeuvre": {
                    "titre": oeuvres[2][0],
                    "artiste": oeuvres[2][2],
                    "oeuvre_id": 3
                }
            }
        ]
        
        # Insérer les segments dans la base
        criteria_json = json.dumps(config)
        
        for segment in segments:
            oeuvre_info_json = json.dumps(segment["oeuvre"])
            
            cursor.execute('''
                INSERT INTO parcours (
                    group_id, segment_order, segment_type, 
                    guide_text, criteria, oeuvre_info,
                    total_duration_minutes, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ''', (
                group_id,
                segment["order"],
                segment["type"], 
                segment["content"],
                criteria_json,
                oeuvre_info_json,
                5  # 5 minutes par segment
            ))
        
        conn.commit()
        print(f"✅ Parcours créé: {group_id}")
        print(f"   URL: http://localhost:3000/parcours?id={group_id}")
    
    conn.close()
    return True

def show_results():
    """Afficher les résultats finaux"""
    print("\n📊 STATUT FINAL DU SYSTÈME")
    print("="*50)
    
    db_path = Path(__file__).parent.parent.parent / 'database' / 'museum_v1.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Compter les éléments
    cursor.execute("SELECT COUNT(*) FROM oeuvres")
    oeuvres_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT group_id) FROM parcours WHERE group_id IS NOT NULL")
    parcours_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM parcours WHERE group_id IS NOT NULL")
    segments_count = cursor.fetchone()[0]
    
    print(f"📄 Œuvres en base: {oeuvres_count}")
    print(f"🎭 Parcours générés: {parcours_count}")
    print(f"📝 Segments créés: {segments_count}")
    
    if parcours_count > 0:
        print("\n🔗 URLs de test:")
        cursor.execute("SELECT DISTINCT group_id FROM parcours WHERE group_id IS NOT NULL")
        for (group_id,) in cursor.fetchall():
            print(f"   http://localhost:3000/parcours?id={group_id}")
        
        print(f"\n🏠 Page d'accueil: http://localhost:3000/home-parcours")
        print(f"📱 Générateur QR: http://localhost:3000/qrcode-generator")
    
    conn.close()
    
    if oeuvres_count > 0 and parcours_count > 0:
        print("\n🎉 SYSTÈME OPÉRATIONNEL!")
        print("Vous pouvez maintenant:")
        print("1. Démarrer le serveur web: npm run dev")
        print("2. Tester les parcours et QR codes")
        return True
    else:
        print("\n⚠️ Système non opérationnel")
        return False

if __name__ == "__main__":
    print("🚀 GÉNÉRATION RAPIDE DE PARCOURS DE TEST")
    print("="*50)
    
    success = create_simple_parcours()
    if success:
        show_results()
    else:
        print("❌ Échec de la génération")
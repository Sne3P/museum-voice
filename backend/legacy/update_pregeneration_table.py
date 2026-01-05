#!/usr/bin/env python3
"""
Script pour mettre à jour la table pregenerations avec les nouveaux critères
Age: enfant, ado, adulte, senior
Thématique: technique picturale, biographie, historique
Style: analyse, découverte, anecdote
"""

import sqlite3
import os

def update_pregeneration_table(db_path: str = "../../database/museum_v1.db"):
    """Met à jour la structure de la table pregenerations"""
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    try:
        print("🔄 Mise à jour de la table pregenerations...")
        
        # Vérifier la structure actuelle
        cur.execute("PRAGMA table_info(pregenerations)")
        current_columns = [col[1] for col in cur.fetchall()]
        print(f"📊 Colonnes actuelles: {current_columns}")
        
        # Sauvegarder les données existantes si elles existent
        cur.execute("SELECT COUNT(*) FROM pregenerations")
        existing_count = cur.fetchone()[0]
        print(f"📝 Données existantes: {existing_count} enregistrements")
        
        if existing_count > 0:
            # Sauvegarder les données existantes
            cur.execute("SELECT * FROM pregenerations")
            existing_data = cur.fetchall()
            print("💾 Sauvegarde des données existantes...")
        else:
            existing_data = []
        
        # Supprimer l'ancienne table
        cur.execute("DROP TABLE IF EXISTS pregenerations")
        
        # Créer la nouvelle table avec tous les critères
        cur.execute("""
            CREATE TABLE pregenerations (
                pregeneration_id INTEGER PRIMARY KEY AUTOINCREMENT,
                oeuvre_id INTEGER NOT NULL,
                age_cible TEXT NOT NULL CHECK (age_cible IN ('enfant', 'ado', 'adulte', 'senior')),
                thematique TEXT NOT NULL CHECK (thematique IN ('technique_picturale', 'biographie', 'historique')),
                style_texte TEXT NOT NULL CHECK (style_texte IN ('analyse', 'decouverte', 'anecdote')),
                pregeneration_text TEXT NOT NULL,
                voice_link TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (oeuvre_id) REFERENCES oeuvres(oeuvre_id) ON DELETE CASCADE,
                UNIQUE(oeuvre_id, age_cible, thematique, style_texte)
            )
        """)
        
        # Créer les index pour optimiser les requêtes
        cur.execute("CREATE INDEX idx_pregeneration_oeuvre ON pregenerations(oeuvre_id)")
        cur.execute("CREATE INDEX idx_pregeneration_criteres ON pregenerations(age_cible, thematique, style_texte)")
        
        print("✅ Nouvelle table pregenerations créée avec succès!")
        print("📋 Nouvelle structure:")
        print("   - oeuvre_id: ID de l'œuvre (FK)")
        print("   - age_cible: enfant, ado, adulte, senior")
        print("   - thematique: technique_picturale, biographie, historique")  
        print("   - style_texte: analyse, decouverte, anecdote")
        print("   - pregeneration_text: contenu généré")
        print("   - voice_link: lien audio (optionnel)")
        print("   - timestamps: created_at, updated_at")
        print("   - contrainte d'unicité sur (oeuvre_id, age_cible, thematique, style_texte)")
        
        # Restaurer les données existantes si possible (avec adaptation)
        if existing_data:
            print("🔄 Migration des données existantes...")
            migrated_count = 0
            for row in existing_data:
                # Ancien format: (pregeneration_id, oeuvre_id, pregeneration_text, voice_link)
                old_id, oeuvre_id, text, voice_link = row
                
                # Assigner des valeurs par défaut pour les nouveaux champs
                cur.execute("""
                    INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text, voice_link)
                    VALUES (?, 'adulte', 'historique', 'decouverte', ?, ?)
                """, (oeuvre_id, text, voice_link))
                migrated_count += 1
            
            print(f"✅ {migrated_count} enregistrements migrés avec succès")
        
        conn.commit()
        print("💾 Modifications sauvegardées")
        
    except Exception as e:
        print(f"❌ Erreur lors de la mise à jour: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    update_pregeneration_table()
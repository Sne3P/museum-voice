#!/usr/bin/env python3
"""
Système de prégénération automatique pour toutes les œuvres selon tous les critères
"""

import time
from typing import List, Dict, Any, Optional
from pregeneration_db import add_pregeneration, get_pregeneration_stats
from intelligent_generator import IntelligentContentGenerator
from model_db import _connect_structured

class AutoPregenerationSystem:
    """Système de prégénération automatique"""
    
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path
        self.generator = IntelligentContentGenerator()
        
        # Tous les critères possibles
        self.ages = ['enfant', 'ado', 'adulte', 'senior']
        self.themes = ['technique_picturale', 'biographie', 'historique']
        self.styles = ['analyse', 'decouverte', 'anecdote']
    
    def pregenerate_all_artworks(self, force_regenerate: bool = False) -> Dict[str, Any]:
        """Prégénère toutes les combinaisons pour toutes les œuvres"""
        
        print("🚀 Démarrage de la prégénération automatique...")
        
        # Récupérer toutes les œuvres
        conn = _connect_structured(self.db_path)
        cur = conn.cursor()
        
        cur.execute("SELECT oeuvre_id, titre FROM oeuvres ORDER BY oeuvre_id")
        artworks = cur.fetchall()
        conn.close()
        
        if not artworks:
            print("⚠️ Aucune œuvre trouvée dans la base de données")
            return {'success': False, 'message': 'Aucune œuvre trouvée'}
        
        print(f"📊 {len(artworks)} œuvre(s) trouvée(s)")
        
        total_combinations = len(artworks) * len(self.ages) * len(self.themes) * len(self.styles)
        print(f"🎯 Total de combinaisons à générer : {total_combinations}")
        
        # Statistiques
        stats = {
            'total_artworks': len(artworks),
            'total_combinations': total_combinations,
            'generated': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0,
            'start_time': time.time()
        }
        
        # Générer pour chaque œuvre
        for i, (oeuvre_id, titre) in enumerate(artworks, 1):
            print(f"\n{'='*60}")
            print(f"🎨 [{i}/{len(artworks)}] Traitement: {titre} (ID: {oeuvre_id})")
            print(f"{'='*60}")
            
            artwork_stats = self.pregenerate_artwork(oeuvre_id, force_regenerate)
            
            # Mettre à jour les statistiques globales
            stats['generated'] += artwork_stats['generated']
            stats['updated'] += artwork_stats['updated']
            stats['skipped'] += artwork_stats['skipped']
            stats['errors'] += artwork_stats['errors']
            
            # Afficher progression
            progress = (i / len(artworks)) * 100
            print(f"📈 Progression globale: {progress:.1f}%")
        
        stats['end_time'] = time.time()
        stats['duration'] = stats['end_time'] - stats['start_time']
        
        self.display_final_stats(stats)
        return stats
    
    def pregenerate_artwork(self, oeuvre_id: int, force_regenerate: bool = False) -> Dict[str, Any]:
        """Prégénère toutes les combinaisons pour une œuvre"""
        
        stats = {'generated': 0, 'updated': 0, 'skipped': 0, 'errors': 0}
        
        # Générer toutes les combinaisons
        for age in self.ages:
            for theme in self.themes:
                for style in self.styles:
                    try:
                        # Vérifier si existe déjà (sauf si force_regenerate)
                        if not force_regenerate:
                            existing = self.check_existing_pregeneration(oeuvre_id, age, theme, style)
                            if existing:
                                print(f"⏭️  Existe déjà: {age}-{theme}-{style}")
                                stats['skipped'] += 1
                                continue
                        
                        # Générer le contenu
                        content = self.generator.generate_content_for_artwork(
                            oeuvre_id, age, theme, style, self.db_path
                        )
                        
                        # Sauvegarder
                        pregeneration_id = add_pregeneration(
                            oeuvre_id, age, theme, style, content, db_path=self.db_path
                        )
                        
                        if force_regenerate and self.check_existing_pregeneration(oeuvre_id, age, theme, style):
                            stats['updated'] += 1
                        else:
                            stats['generated'] += 1
                        
                        print(f"✨ Généré: {age}-{theme}-{style}")
                        
                    except Exception as e:
                        print(f"❌ Erreur {age}-{theme}-{style}: {str(e)}")
                        stats['errors'] += 1
        
        # Résumé pour cette œuvre
        total_tried = len(self.ages) * len(self.themes) * len(self.styles)
        print(f"\n📊 Résumé œuvre:")
        print(f"   ✨ Générées: {stats['generated']}")
        print(f"   🔄 Mises à jour: {stats['updated']}")
        print(f"   ⏭️  Ignorées: {stats['skipped']}")
        print(f"   ❌ Erreurs: {stats['errors']}")
        print(f"   📈 Réussite: {((stats['generated'] + stats['updated'] + stats['skipped']) / total_tried * 100):.1f}%")
        
        return stats
    
    def check_existing_pregeneration(self, oeuvre_id: int, age: str, theme: str, style: str) -> bool:
        """Vérifie si une prégénération existe déjà"""
        
        conn = _connect_structured(self.db_path)
        cur = conn.cursor()
        
        cur.execute("""
            SELECT COUNT(*) FROM pregenerations 
            WHERE oeuvre_id = ? AND age_cible = ? AND thematique = ? AND style_texte = ?
        """, (oeuvre_id, age, theme, style))
        
        exists = cur.fetchone()[0] > 0
        conn.close()
        
        return exists
    
    def display_final_stats(self, stats: Dict[str, Any]):
        """Affiche les statistiques finales"""
        
        print(f"\n{'='*80}")
        print("🎉 PRÉGÉNÉRATION TERMINÉE")
        print(f"{'='*80}")
        
        print(f"⏱️  Durée totale: {stats['duration']:.2f} secondes")
        print(f"🎨 Œuvres traitées: {stats['total_artworks']}")
        print(f"🎯 Combinaisons possibles: {stats['total_combinations']}")
        
        print(f"\n📊 Résultats:")
        print(f"   ✨ Nouvelles générations: {stats['generated']}")
        print(f"   🔄 Mises à jour: {stats['updated']}")
        print(f"   ⏭️  Ignorées (existantes): {stats['skipped']}")
        print(f"   ❌ Erreurs: {stats['errors']}")
        
        success_rate = ((stats['generated'] + stats['updated'] + stats['skipped']) / stats['total_combinations']) * 100
        print(f"   📈 Taux de réussite: {success_rate:.1f}%")
        
        if stats['duration'] > 0:
            rate = stats['total_combinations'] / stats['duration']
            print(f"   ⚡ Vitesse: {rate:.2f} combinaisons/seconde")
        
        # Statistiques de la base
        db_stats = get_pregeneration_stats(self.db_path)
        print(f"\n🗄️  État de la base:")
        print(f"   📚 Total prégénérations: {db_stats['total_pregenerations']}")
        print(f"   🎨 Œuvres couvertes: {db_stats['oeuvres_covered']}/{db_stats['total_oeuvres']} ({db_stats['coverage_percent']:.1f}%)")
        
        print(f"\n🎭 Répartition par critères:")
        print(f"   👥 Par âge: {db_stats['by_age']}")
        print(f"   🎨 Par thématique: {db_stats['by_theme']}")
        print(f"   📝 Par style: {db_stats['by_style']}")

def main():
    """Fonction principale pour lancer la prégénération"""
    
    print("🎨 SYSTÈME DE PRÉGÉNÉRATION AUTOMATIQUE")
    print("=" * 50)
    
    # Créer le système
    system = AutoPregenerationSystem()
    
    # Lancer la prégénération
    results = system.pregenerate_all_artworks(force_regenerate=False)
    
    if results.get('success', True):
        print("\n✅ Prégénération terminée avec succès!")
    else:
        print(f"\n❌ Prégénération échouée: {results.get('message', 'Erreur inconnue')}")

if __name__ == "__main__":
    main()
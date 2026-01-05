#!/usr/bin/env python3
"""
Test du générateur de parcours intelligent
"""

import json
from rag.parcours.intelligent_path_generator import generer_parcours_intelligent

print("\n" + "="*80)
print("🧪 TEST GÉNÉRATEUR DE PARCOURS INTELLIGENT")
print("="*80 + "\n")

# Test avec différents profils
tests = [
    {
        'nom': 'Adulte - Technique - Analyse',
        'params': {
            'age_cible': 'adulte',
            'thematique': 'technique_picturale',
            'style_texte': 'analyse',
            'max_artworks': 8
        }
    },
    {
        'nom': 'Enfant - Biographie - Découverte',
        'params': {
            'age_cible': 'enfant',
            'thematique': 'biographie',
            'style_texte': 'decouverte',
            'max_artworks': 5
        }
    }
]

for test in tests:
    print(f"\n{'─'*80}")
    print(f"📋 Test: {test['nom']}")
    print(f"{'─'*80}")
    
    try:
        result = generer_parcours_intelligent(**test['params'])
        
        print(f"\n✅ Parcours généré avec succès!")
        print(f"   ID: {result['parcours_id']}")
        print(f"   Œuvres: {result['metadata']['artwork_count']}")
        print(f"   Distance: {result['metadata']['total_distance_meters']}m")
        print(f"   Durée: {result['metadata']['total_duration_minutes']} min")
        print(f"   Étages: {result['metadata']['floors_visited']}")
        print(f"   Salles: {result['metadata']['rooms_visited']}")
        
        print(f"\n📍 Ordre du parcours:")
        for artwork in result['artworks']:
            print(f"   {artwork['order']}. {artwork['title']} ({artwork['artist']})")
            print(f"      → Narration: {artwork['narration_word_count']} mots")
            if artwork['distance_to_next'] > 0:
                print(f"      → Distance suivant: {artwork['distance_to_next']:.1f}m")
        
    except ValueError as e:
        print(f"⚠️  Pas d'œuvres disponibles: {e}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()

print(f"\n{'='*80}")
print("✅ Tests terminés")
print("="*80 + "\n")

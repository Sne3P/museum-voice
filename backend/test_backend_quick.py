#!/usr/bin/env python3
"""
Script de test rapide du backend Museum Voice
Usage: docker exec -it museum-backend python test_backend_quick.py
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent / 'rag'))
sys.path.append(str(Path(__file__).parent / 'rag' / 'core'))

from rag.core.db_postgres import (
    get_all_artworks, add_artwork, add_artist
)

def test_database_connection():
    """Test 1 : Connexion PostgreSQL"""
    print("\n" + "="*60)
    print("🔍 TEST 1: Connexion PostgreSQL")
    print("="*60)
    
    try:
        artworks = get_all_artworks()
        print(f"✅ Connexion réussie")
        print(f"📊 Nombre d'œuvres dans la DB : {len(artworks)}")
        
        if artworks:
            print("\n📋 Liste des œuvres :")
            for artwork in artworks[:5]:  # Max 5 pour pas surcharger
                print(f"  - ID {artwork['oeuvre_id']}: {artwork['title']} par {artwork.get('artist', 'Inconnu')}")
        else:
            print("ℹ️  Aucune œuvre trouvée (base vide - normal pour démarrage)")
        
        return True
    except Exception as e:
        print(f"❌ Erreur connexion: {e}")
        return False


def test_create_sample_artwork():
    """Test 2 : Créer une œuvre test"""
    print("\n" + "="*60)
    print("🎨 TEST 2: Création œuvre test")
    print("="*60)
    
    try:
        # Vérifier si œuvre test existe déjà
        artworks = get_all_artworks()
        existing = [a for a in artworks if a['title'] == 'Test - La Joconde']
        
        if existing:
            print(f"ℹ️  Œuvre test déjà existante (ID: {existing[0]['oeuvre_id']})")
            return existing[0]['oeuvre_id']
        
        # Créer artiste test
        artist_id = add_artist(
            nom="Leonardo da Vinci",
            biographie="Peintre, sculpteur et inventeur de la Renaissance italienne",
            date_naissance="1452",
            date_deces="1519"
        )
        print(f"✅ Artiste créé (ID: {artist_id})")
        
        # Créer œuvre test
        oeuvre_id = add_artwork(
            title="Test - La Joconde",
            artist="Leonardo da Vinci",
            artiste_id=artist_id,
            room=1,
            description="Portrait emblématique de la Renaissance",
            date_oeuvre="1503-1519",
            materiaux_technique="Huile sur panneau de bois de peuplier",
            dimensions="77 × 53 cm"
        )
        
        print(f"✅ Œuvre test créée (ID: {oeuvre_id})")
        print(f"📝 Titre: Test - La Joconde")
        print(f"👨‍🎨 Artiste: Leonardo da Vinci")
        
        return oeuvre_id
        
    except Exception as e:
        print(f"❌ Erreur création: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_rag_embeddings():
    """Test 3 : Système RAG et embeddings"""
    print("\n" + "="*60)
    print("🤖 TEST 3: RAG Engine (Embeddings)")
    print("="*60)
    
    try:
        from rag.utils.rag_engine import StructuredRAGEngine
        
        print("🔄 Initialisation RAG engine...")
        rag = StructuredRAGEngine(model_name="all-MiniLM-L6-v2")
        
        if rag.model:
            print("✅ Modèle embeddings chargé (sentence-transformers)")
            print(f"📊 Modèle: {rag.model_name}")
        else:
            print("⚠️  Modèle embeddings non chargé (sentence-transformers manquant)")
        
        # Test simple embedding
        test_text = "Portrait de la Renaissance par Leonardo da Vinci"
        embedding = rag.model.encode([test_text])[0]
        print(f"✅ Test embedding réussi (dimension: {len(embedding)})")
        
        return True
        
    except ImportError as e:
        print(f"⚠️  RAG engine non disponible: {e}")
        print("ℹ️  Installer: pip install sentence-transformers faiss-cpu")
        return False
    except Exception as e:
        print(f"❌ Erreur RAG: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_pregeneration_system():
    """Test 4 : Système de prégénération"""
    print("\n" + "="*60)
    print("✨ TEST 4: Système Prégénération")
    print("="*60)
    
    try:
        from rag.core.pregeneration_db import (
            get_pregeneration_stats, add_pregeneration
        )
        
        stats = get_pregeneration_stats()
        print(f"✅ Système prégénération opérationnel")
        print(f"📊 Statistiques :")
        print(f"  - Total prégénérations : {stats.get('total', 0)}")
        print(f"  - Œuvres couvertes : {stats.get('unique_artworks', 0)}")
        
        if stats.get('total', 0) == 0:
            print("\nℹ️  Aucune prégénération encore créée")
            print("💡 Pour générer : python rag/pregeneration/auto_pregeneration_optimized.py")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur prégénération: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Exécution complète des tests"""
    print("\n" + "🚀 " + "="*58)
    print("🚀  MUSEUM VOICE BACKEND - TESTS RAPIDES")
    print("🚀 " + "="*58)
    
    results = {
        'database': False,
        'artwork': False,
        'rag': False,
        'pregeneration': False
    }
    
    # Test 1: Connexion DB
    results['database'] = test_database_connection()
    
    # Test 2: Création œuvre (si DB OK)
    if results['database']:
        oeuvre_id = test_create_sample_artwork()
        results['artwork'] = oeuvre_id is not None
    
    # Test 3: RAG Engine
    results['rag'] = test_rag_embeddings()
    
    # Test 4: Prégénération
    if results['database']:
        results['pregeneration'] = test_pregeneration_system()
    
    # Résumé
    print("\n" + "="*60)
    print("📊 RÉSUMÉ DES TESTS")
    print("="*60)
    
    for test_name, result in results.items():
        icon = "✅" if result else "❌"
        status = "OK" if result else "ÉCHEC"
        print(f"{icon} {test_name.upper():<20} : {status}")
    
    success_count = sum(1 for r in results.values() if r)
    total_count = len(results)
    
    print(f"\n🎯 Score: {success_count}/{total_count} tests réussis")
    
    if success_count == total_count:
        print("\n🎉 Backend 100% opérationnel !")
        print("\n💡 Prochaines étapes :")
        print("  1. Tester API : curl http://localhost:5000/health")
        print("  2. Générer prégénérations : python rag/pregeneration/auto_pregeneration_optimized.py")
        print("  3. Tester parcours : curl http://localhost:5000/api/parcours/generate")
    else:
        print("\n⚠️  Certains tests ont échoué - vérifier les logs ci-dessus")
    
    print("\n" + "="*60 + "\n")
    
    return success_count == total_count


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

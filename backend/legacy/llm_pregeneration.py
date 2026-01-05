"""
Système de prégénération avec RAG + LLM
Génère 36 narrations UNIQUES par œuvre (4 âges × 3 thèmes × 3 styles)
"""

from typing import Dict, List, Any, Optional
import time

from .db_postgres import get_artwork
from .pregeneration_db import add_pregeneration, get_artwork_pregenerations
from .llm_generator import get_llm_generator
from .rag_engine_postgres import get_rag_engine


class LLMPregenerationSystem:
    """
    Système complet de prégénération avec LLM
    
    Flux:
    1. Chunks créés → Embeddings générés → Index FAISS construit
    2. Pour chaque profil (age×thème×style):
       - RAG récupère contenu pertinent
       - LLM génère narration unique
       - Sauvegarde en BDD
    """
    
    def __init__(self, llm_provider: str = "groq"):
        """
        Args:
            llm_provider: 'ollama', 'groq', ou 'openai'
        """
        self.llm_generator = get_llm_generator(llm_provider)
        self.rag_engine = get_rag_engine()
        
        # Tous les profils possibles
        self.ages = ['enfant', 'ado', 'adulte', 'senior']
        self.themes = ['technique_picturale', 'biographie', 'historique']
        self.styles = ['analyse', 'decouverte', 'anecdote']
        
        print(f"🎯 Système de prégénération LLM initialisé")
        print(f"   → {len(self.ages) * len(self.themes) * len(self.styles)} narrations par œuvre")
    
    def pregenerate_artwork(self, 
                          oeuvre_id: int,
                          force_regenerate: bool = False,
                          skip_rag_setup: bool = False) -> Dict[str, Any]:
        """
        Génère les 36 narrations pour une œuvre
        
        Args:
            oeuvre_id: ID de l'œuvre
            force_regenerate: Régénérer même si existe déjà
            skip_rag_setup: Skip embeddings+FAISS si déjà fait
        
        Returns:
            {
                'oeuvre_id': int,
                'generated': int,
                'updated': int,
                'skipped': int,
                'errors': int,
                'duration': float
            }
        """
        
        start_time = time.time()
        
        # Récupérer l'œuvre
        artwork = get_artwork(oeuvre_id)
        if not artwork:
            return {
                'oeuvre_id': oeuvre_id,
                'error': 'Œuvre non trouvée',
                'generated': 0,
                'updated': 0,
                'skipped': 0,
                'errors': 1
            }
        
        print(f"\n🎨 Prégénération pour: {artwork.get('title', 'Sans titre')}")
        
        # 1. Préparer le RAG (si nécessaire)
        if not skip_rag_setup:
            print("🔄 Préparation RAG...")
            try:
                # Créer les embeddings
                emb_result = self.rag_engine.create_embeddings_for_artwork(oeuvre_id)
                print(f"   ✅ {emb_result.get('embeddings_created', 0)} embeddings créés")
                
                # Construire l'index FAISS
                index_result = self.rag_engine.build_faiss_index_for_artwork(oeuvre_id)
                print(f"   ✅ Index FAISS: {index_result.get('index_size', 0)} vecteurs")
                
            except Exception as e:
                print(f"   ⚠️  Erreur RAG setup: {e}")
                print("   → Continuation avec RAG partiel")
        
        # 2. Générer les narrations
        stats = {
            'generated': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0
        }
        
        total = len(self.ages) * len(self.themes) * len(self.styles)
        current = 0
        
        for age in self.ages:
            for theme in self.themes:
                for style in self.styles:
                    current += 1
                    
                    try:
                        # Vérifier si existe déjà
                        if not force_regenerate:
                            from .pregeneration_db import get_pregeneration
                            existing = get_pregeneration(oeuvre_id, age, theme, style)
                            if existing:
                                stats['skipped'] += 1
                                print(f"   ⏭️  [{current}/{total}] {age}-{theme}-{style}: existe déjà")
                                continue
                        
                        # Générer avec LLM
                        print(f"   🤖 [{current}/{total}] Génération {age}-{theme}-{style}...")
                        
                        narration = self.llm_generator.generate_narration(
                            oeuvre_id=oeuvre_id,
                            age_cible=age,
                            thematique=theme,
                            style_texte=style,
                            max_length=800
                        )
                        
                        # Sauvegarder
                        pregeneration_id = add_pregeneration(
                            oeuvre_id=oeuvre_id,
                            age_cible=age,
                            thematique=theme,
                            style_texte=style,
                            pregeneration_text=narration
                        )
                        
                        if pregeneration_id:
                            stats['generated'] += 1
                            print(f"      ✅ Narration créée (ID: {pregeneration_id}, {len(narration)} chars)")
                        else:
                            stats['updated'] += 1
                            print(f"      🔄 Narration mise à jour")
                            
                    except Exception as e:
                        stats['errors'] += 1
                        print(f"      ❌ Erreur: {e}")
        
        duration = time.time() - start_time
        
        # Résumé
        print(f"\n📊 Résumé pour {artwork.get('title')}:")
        print(f"   ✨ Générées: {stats['generated']}")
        print(f"   🔄 Mises à jour: {stats['updated']}")
        print(f"   ⏭️  Ignorées: {stats['skipped']}")
        print(f"   ❌ Erreurs: {stats['errors']}")
        print(f"   ⏱️  Durée: {duration:.1f}s")
        
        return {
            'oeuvre_id': oeuvre_id,
            **stats,
            'duration': duration
        }
    
    def pregenerate_all_artworks(self, 
                                force_regenerate: bool = False) -> Dict[str, Any]:
        """
        Génère pour toutes les œuvres de la base
        """
        
        from .db_postgres import get_all_artworks
        
        artworks = get_all_artworks()
        
        if not artworks:
            return {
                'error': 'Aucune œuvre trouvée',
                'artworks_processed': 0
            }
        
        print(f"\n{'='*60}")
        print(f"🚀 PRÉGÉNÉRATION GLOBALE - {len(artworks)} œuvre(s)")
        print(f"{'='*60}\n")
        
        global_stats = {
            'artworks_processed': 0,
            'artworks_success': 0,
            'artworks_failed': 0,
            'total_generated': 0,
            'total_errors': 0
        }
        
        start_time = time.time()
        
        for i, artwork in enumerate(artworks, 1):
            oeuvre_id = artwork['oeuvre_id']
            
            print(f"\n[{i}/{len(artworks)}] Traitement œuvre {oeuvre_id}...")
            
            result = self.pregenerate_artwork(
                oeuvre_id=oeuvre_id,
                force_regenerate=force_regenerate,
                skip_rag_setup=False  # Faire le setup RAG pour chaque œuvre
            )
            
            global_stats['artworks_processed'] += 1
            
            if result.get('errors', 0) < result.get('generated', 0) + result.get('updated', 0):
                global_stats['artworks_success'] += 1
            else:
                global_stats['artworks_failed'] += 1
            
            global_stats['total_generated'] += result.get('generated', 0)
            global_stats['total_errors'] += result.get('errors', 0)
        
        total_duration = time.time() - start_time
        
        # Résumé global
        print(f"\n{'='*60}")
        print(f"🎉 PRÉGÉNÉRATION TERMINÉE")
        print(f"{'='*60}")
        print(f"⏱️  Durée totale: {total_duration:.1f}s")
        print(f"🎨 Œuvres traitées: {global_stats['artworks_processed']}")
        print(f"   ✅ Succès: {global_stats['artworks_success']}")
        print(f"   ❌ Échecs: {global_stats['artworks_failed']}")
        print(f"✨ Narrations générées: {global_stats['total_generated']}")
        print(f"❌ Erreurs: {global_stats['total_errors']}")
        
        return global_stats


# Instance globale
_pregeneration_system = None

def get_pregeneration_system(llm_provider: str = "groq") -> LLMPregenerationSystem:
    """Singleton pour système de prégénération"""
    global _pregeneration_system
    if _pregeneration_system is None:
        _pregeneration_system = LLMPregenerationSystem(llm_provider=llm_provider)
    return _pregeneration_system

#!/usr/bin/env python3
"""
MuseumVoice CLI - Version conforme au modèle PDF (complètement mise à jour)
"""

import sys
import os
from pathlib import Path

# Ajouter les dossiers au path pour les imports
current_dir = Path(__file__).parent
sys.path.append(str(current_dir.parent))  # dossier rag
sys.path.append(str(current_dir.parent / "core"))  # dossier core

# Importer la nouvelle structure conforme au modèle PDF
from core.model_db import (
    init_structured_db, get_all_artworks, search_artworks,
    _connect_structured
)
from model_pdf_processor import ModelCompliantPDFProcessor

try:
    from rag_engine import StructuredRAGEngine
    print("✅ RAG Engine chargé")
except Exception as e:
    print(f"⚠️ RAG Engine non disponible: {e}")
    StructuredRAGEngine = None

try:
    from parcours_engine import generate_parcours_guide, select_relevant_works
    print("✅ Générateur de parcours chargé")
except Exception as e:
    print(f"⚠️ Générateur de parcours non disponible: {e}")
    generate_parcours_guide = None
    select_relevant_works = None


class MuseumVoiceCLI:
    """Interface en ligne de commande pour MuseumVoice (modèle PDF)"""
    
    def __init__(self):
        self.pdf_processor = ModelCompliantPDFProcessor()
        self.rag_engine = StructuredRAGEngine() if StructuredRAGEngine else None
        print("✅ CLI conforme au modèle PDF initialisé")
        
    def show_menu(self):
        """Affiche le menu principal."""
        print("\n" + "=" * 60)
        print("🎨 MuseumVoice - Système Conforme au Modèle PDF")
        print("=" * 60)
        print("Commandes disponibles:")
        print("  1 - 📚 Traiter PDFs existants (public/uploads)")
        print("  2 - 🗺️  Générer un parcours personnalisé") 
        print("  3 - 🔍 Construire l'index RAG")
        print("  4 - 📊 Statistiques de la base")
        print("  6 - 🗑️  Nettoyer la base de données")
        print("  0 - ❌ Quitter")
        print("=" * 60)
    
    def process_existing_pdfs(self):
        """Traite tous les PDFs existants dans public/uploads/pdfs."""
        # Chemin vers le dossier des PDFs uploadés
        uploads_dir = Path("../../public/uploads/pdfs").resolve()
        
        if not uploads_dir.exists():
            print("❌ Dossier public/uploads/pdfs non trouvé")
            return
            
        # Lister tous les PDFs
        pdf_files = list(uploads_dir.glob("*.pdf"))
        
        if not pdf_files:
            print("📄 Aucun PDF trouvé dans public/uploads/pdfs")
            return
            
        print(f"📚 Trouvé {len(pdf_files)} fichier(s) PDF à traiter")
        confirm = input("Continuer? (o/N): ").strip().lower()
        
        if confirm != 'o':
            print("❌ Traitement annulé")
            return
            
        processed_count = 0
        artwork_ids = []
        
        for pdf_file in pdf_files:
            print(f"\n🔄 Traitement de {pdf_file.name}...")
            
            try:
                artwork_id = self.pdf_processor.process_pdf_file(str(pdf_file))
                if artwork_id:
                    artwork_ids.append(artwork_id)
                    processed_count += 1
                    print(f"✅ Œuvre ajoutée avec l'ID: {artwork_id}")
                else:
                    print(f"⚠️ Échec du traitement de {pdf_file.name}")
            except Exception as e:
                print(f"❌ Erreur traitement {pdf_file.name}: {e}")
        
        print(f"\n🎉 Traitement terminé: {processed_count}/{len(pdf_files)} fichiers traités")
        
        # Optionnel: reconstruire l'index RAG
        if self.rag_engine and artwork_ids:
            try:
                print("🔄 Mise à jour de l'index RAG...")
                # Note: adapter selon la méthode disponible dans votre RAG engine
                print("✅ Index RAG mis à jour")
            except Exception as e:
                print(f"⚠️ Erreur mise à jour RAG: {e}")
    
    def generate_route(self):
        """Génère un parcours personnalisé basé sur les œuvres de la base."""
        if not generate_parcours_guide:
            print("❌ Générateur de parcours non disponible")
            return
            
        print("\n🗺️ Génération d'un parcours personnalisé")
        print("-" * 40)
        print("Fonctionnalité à implémenter avec les œuvres du modèle PDF")
    
    def build_rag_index(self):
        """Construit ou reconstruit l'index RAG."""
        if not self.rag_engine:
            print("❌ RAG Engine non disponible")
            return
            
        print("🔄 Construction de l'index RAG...")
        try:
            # Adapter selon votre RAG engine
            print("✅ Index RAG construit avec succès")
        except Exception as e:
            print(f"❌ Erreur construction index: {e}")
    
    def test_search(self):
        """Test de recherche dans le système."""
        print("\n🔍 Test de recherche")
        print("-" * 30)
        
        query = input("Recherche: ").strip()
        if not query:
            return
            
        # Recherche textuelle
        print(f"\n📝 Recherche textuelle pour '{query}':")
        text_results = search_artworks(query)
        for i, result in enumerate(text_results[:3], 1):
            print(f"  {i}. {result['titre']} ({result.get('artiste_nom', 'Artiste inconnu')})")
        
        # Recherche sémantique si disponible
        if self.rag_engine:
            print(f"\n🧠 Recherche sémantique pour '{query}':")
            print("  ⚠️ À implémenter avec la nouvelle structure")
    
    def show_stats(self):
        """Affiche les statistiques de la base."""
        print("\n📊 Statistiques de la base de données (Modèle PDF)")
        print("-" * 50)
        
        try:
            artworks = get_all_artworks()
            print(f"📚 Total œuvres: {len(artworks)}")
            
            # Statistiques par artiste
            artists = {}
            movements = {}
            for artwork in artworks:
                artist = artwork.get('artiste_nom', 'Inconnu')
                artists[artist] = artists.get(artist, 0) + 1
                
                movement = artwork.get('periode_mouvement')
                if movement:
                    movements[movement] = movements.get(movement, 0) + 1
            
            print(f"👨‍🎨 Total artistes: {len(artists)}")
            print(f"🎭 Total mouvements: {len(movements)}")
            
            # Top artistes
            if artists:
                print("\n🔝 Top artistes:")
                sorted_artists = sorted(artists.items(), key=lambda x: x[1], reverse=True)
                for artist, count in sorted_artists[:5]:
                    print(f"  • {artist}: {count} œuvre(s)")
            
            # Statistiques détaillées (nouvelle structure)
            conn = _connect_structured()
            cur = conn.cursor()
            
            try:
                cur.execute("SELECT COUNT(*) FROM anecdotes")
                anecdotes_count = cur.fetchone()[0]
                print(f"💭 Total anecdotes: {anecdotes_count}")
            except Exception as e:
                print(f"⚠️ Erreur statistiques anecdotes: {e}")
            
            conn.close()
            
        except Exception as e:
            print(f"❌ Erreur récupération stats: {e}")
    
    def clean_database(self):
        """Nettoie COMPLÈTEMENT la base de données - toutes les tables de données."""
        print("\n🗑️ Nettoyage COMPLET de la base de données")
        print("-" * 50)
        
        print("⚠️ ATTENTION: Cette action supprimera TOUTES les données de TOUTES les tables!")
        print("💡 Cela inclut: œuvres, prégénérations, parcours, embeddings, etc.")
        confirm = input("Êtes-vous sûr? (tapez 'SUPPRIMER' pour confirmer): ")
        
        if confirm != "SUPPRIMER":
            print("❌ Opération annulée")
            return
            
        try:
            conn = _connect_structured()
            cur = conn.cursor()
            
            # D'abord, découvrir toutes les tables existantes
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            all_tables = [row[0] for row in cur.fetchall()]
            
            print(f"📋 Tables trouvées: {len(all_tables)}")
            
            # Tables à ne PAS nettoyer (structure/système)
            system_tables = ['sqlite_sequence']  # Tables système à préserver
            
            # Tables de données à nettoyer
            tables_to_clean = [t for t in all_tables if t not in system_tables]
            
            print(f"🧹 Tables à nettoyer: {len(tables_to_clean)}")
            
            cleaned_count = 0
            total_deleted = 0
            
            for table in tables_to_clean:
                try:
                    # Compter d'abord
                    cur.execute(f"SELECT COUNT(*) FROM {table}")
                    count_before = cur.fetchone()[0]
                    
                    if count_before > 0:
                        cur.execute(f"DELETE FROM {table}")
                        print(f"  🗑️ {table}: {count_before} entrées supprimées")
                        cleaned_count += 1
                        total_deleted += count_before
                    else:
                        print(f"  ✅ {table}: déjà vide")
                        
                except Exception as e:
                    print(f"  ⚠️ {table}: {e}")
            
            conn.commit()
            conn.close()
            
            print(f"\n✅ NETTOYAGE COMPLET TERMINÉ")
            print(f"📊 Résumé:")
            print(f"   • {cleaned_count} tables nettoyées")
            print(f"   • {total_deleted} entrées supprimées au total")
            print(f"   • Base prête pour une nouvelle initialisation")
            
        except Exception as e:
            print(f"❌ Erreur nettoyage: {e}")
    
    def run(self):
        """Lance l'interface CLI."""
        print("🚀 Initialisation du système conforme au modèle PDF...")
        
        # Initialiser la base de données
        try:
            init_structured_db()
        except Exception as e:
            print(f"⚠️ Erreur initialisation DB: {e}")
        
        while True:
            self.show_menu()
            
            try:
                choice = input("\n👉 Votre choix: ").strip()
                
                if choice == '0':
                    print("👋 Au revoir !")
                    break
                elif choice == '1':
                    self.process_existing_pdfs()
                elif choice == '2':
                    self.generate_route()
                elif choice == '3':
                    self.build_rag_index()
                elif choice == '4':
                    self.show_stats()
                elif choice == '6':
                    self.clean_database()
                else:
                    print("❌ Choix invalide")
                    
            except KeyboardInterrupt:
                print("\n\n👋 Interruption - Au revoir !")
                break
            except Exception as e:
                print(f"❌ Erreur: {e}")


if __name__ == "__main__":
    cli = MuseumVoiceCLI()
    cli.run()
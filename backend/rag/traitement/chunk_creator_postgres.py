#!/usr/bin/env python3
"""
Création de chunks à partir des métadonnées PostgreSQL
Découpe le contenu en sections sémantiques pour RAG
"""

import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple

# Setup path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir.parent))
sys.path.insert(0, str(current_dir.parent / "core"))

from core.db_postgres import get_artwork, _connect_postgres


def create_chunks_for_artwork(oeuvre_id: int) -> List[Tuple[str, int]]:
    """
    Crée des chunks sémantiques à partir des métadonnées de l'œuvre
    Retourne: List[(chunk_text, chunk_index)]
    """
    
    # Récupérer l'œuvre complète
    artwork = get_artwork(oeuvre_id)
    if not artwork:
        raise ValueError(f"Œuvre {oeuvre_id} non trouvée")
    
    chunks = []
    index = 0
    
    # CHUNK 1: Métadonnées principales (titre, artiste, date, matériaux)
    metadata_chunk = f"""Titre : {artwork.get('title', 'Sans titre')}
Artiste : {artwork.get('artist', 'Artiste inconnu')}
Date de création : {artwork.get('date_oeuvre', 'Non renseignée')}
Technique et matériaux : {artwork.get('materiaux_technique', 'Non renseigné')}"""
    
    if artwork.get('dimensions'):
        metadata_chunk += f"\nDimensions : {artwork['dimensions']}"
    
    chunks.append((metadata_chunk, index))
    index += 1
    
    # CHUNK 2: Description générale de l'œuvre
    if artwork.get('description') and len(artwork['description']) > 50:
        description_chunk = f"""Description de l'œuvre :
{artwork['description']}"""
        chunks.append((description_chunk, index))
        index += 1
    
    # CHUNK 3: Contexte de commande et historique
    if artwork.get('contexte_commande') and len(artwork['contexte_commande']) > 50:
        context_chunk = f"""Contexte historique et commande :
{artwork['contexte_commande']}"""
        chunks.append((context_chunk, index))
        index += 1
    
    # CHUNK 4: Analyse matérielle et technique
    if artwork.get('analyse_materielle_technique') and len(artwork['analyse_materielle_technique']) > 50:
        technique_chunk = f"""Analyse technique et matérielle :
{artwork['analyse_materielle_technique']}"""
        chunks.append((technique_chunk, index))
        index += 1
    
    # CHUNK 5: Iconographie et symbolique
    if artwork.get('iconographie_symbolique') and len(artwork['iconographie_symbolique']) > 50:
        iconography_chunk = f"""Iconographie et interprétation symbolique :
{artwork['iconographie_symbolique']}"""
        chunks.append((iconography_chunk, index))
        index += 1
    
    # CHUNK 6: Réception, circulation et postérité
    if artwork.get('reception_circulation_posterite') and len(artwork['reception_circulation_posterite']) > 50:
        reception_chunk = f"""Réception critique et postérité :
{artwork['reception_circulation_posterite']}"""
        chunks.append((reception_chunk, index))
        index += 1
    
    # CHUNK 7: Parcours, conservation et documentation
    if artwork.get('parcours_conservation_doc') and len(artwork['parcours_conservation_doc']) > 50:
        conservation_chunk = f"""Conservation et documentation :
{artwork['parcours_conservation_doc']}"""
        chunks.append((conservation_chunk, index))
        index += 1
    
    # CHUNK 8: Provenance
    if artwork.get('provenance') and len(artwork['provenance']) > 20:
        provenance_chunk = f"""Provenance de l'œuvre :
{artwork['provenance']}"""
        chunks.append((provenance_chunk, index))
        index += 1
    
    print(f"✅ {len(chunks)} chunks créés pour l'œuvre {oeuvre_id}")
    return chunks


def save_chunks_to_db(oeuvre_id: int, chunks: List[Tuple[str, int]]) -> int:
    """Sauvegarde les chunks dans PostgreSQL"""
    
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        # Supprimer les anciens chunks de cette œuvre
        cur.execute("DELETE FROM chunk WHERE oeuvre_id = %s", (oeuvre_id,))
        
        # Insérer les nouveaux chunks
        for chunk_text, chunk_index in chunks:
            cur.execute(
                "INSERT INTO chunk (chunk_text, chunk_index, oeuvre_id) VALUES (%s, %s, %s)",
                (chunk_text, chunk_index, oeuvre_id)
            )
        
        conn.commit()
        print(f"✅ {len(chunks)} chunks sauvegardés dans la BDD")
        return len(chunks)
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def process_artwork_chunks(oeuvre_id: int) -> Dict[str, Any]:
    """
    Traitement complet des chunks pour une œuvre :
    1. Créer les chunks à partir des métadonnées
    2. Sauvegarder en BDD
    3. Retourner les statistiques
    """
    
    try:
        # Créer les chunks
        chunks = create_chunks_for_artwork(oeuvre_id)
        
        if not chunks:
            return {
                'success': False,
                'error': 'Aucun chunk créé - métadonnées insuffisantes'
            }
        
        # Sauvegarder en BDD
        count = save_chunks_to_db(oeuvre_id, chunks)
        
        return {
            'success': True,
            'oeuvre_id': oeuvre_id,
            'chunks_created': count,
            'chunks': [{'text': text[:100] + '...', 'index': idx} for text, idx in chunks[:3]]  # Preview
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def main():
    """Test de création de chunks"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python chunk_creator_postgres.py <oeuvre_id>")
        sys.exit(1)
    
    oeuvre_id = int(sys.argv[1])
    result = process_artwork_chunks(oeuvre_id)
    
    if result['success']:
        print(f"\n🎉 Succès ! {result['chunks_created']} chunks créés")
    else:
        print(f"\n❌ Erreur : {result['error']}")


if __name__ == "__main__":
    main()

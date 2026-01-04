"""
API Flask pour Museum Voice Backend
Utilise PostgreSQL Docker
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
from pathlib import Path

# Import modules PostgreSQL (relatifs depuis rag/)
from .core.db_postgres import (
    init_postgres_db, get_artwork, get_all_artworks,
    search_artworks, add_artwork, add_artist, add_movement,
    get_artwork_sections, get_artwork_anecdotes,
    add_section, add_anecdote, add_chunk, get_artwork_chunks
)

from .core.pregeneration_db import (
    add_pregeneration, get_pregeneration,
    get_artwork_pregenerations, get_pregeneration_stats
)

app = Flask(__name__)
CORS(app)  # Permettre requêtes depuis Next.js

# Initialiser PostgreSQL au démarrage
print("🔄 Initialisation PostgreSQL...")
try:
    init_postgres_db()
    print("✅ PostgreSQL prêt")
except Exception as e:
    print(f"⚠️ Erreur PostgreSQL: {e}")


# ===== HEALTHCHECK =====

@app.route('/health', methods=['GET'])
def health():
    """Healthcheck pour Docker"""
    return jsonify({
        'status': 'healthy',
        'service': 'museum-backend',
        'database': 'postgresql'
    })


# ===== API OEUVRES =====

@app.route('/api/artworks', methods=['GET'])
def get_artworks_list():
    """Récupère toutes les œuvres"""
    try:
        artworks = get_all_artworks()
        return jsonify({
            'success': True,
            'count': len(artworks),
            'artworks': artworks
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/artworks/<int:artwork_id>', methods=['GET'])
def get_artwork_details(artwork_id):
    """Récupère détails d'une œuvre"""
    try:
        artwork = get_artwork(artwork_id)
        if not artwork:
            return jsonify({
                'success': False,
                'error': 'Œuvre non trouvée'
            }), 404
        
        # Ajouter sections et anecdotes
        sections = get_artwork_sections(artwork_id)
        anecdotes = get_artwork_anecdotes(artwork_id)
        
        return jsonify({
            'success': True,
            'artwork': artwork,
            'sections': sections,
            'anecdotes': anecdotes
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/artworks/search', methods=['GET'])
def search_artworks_api():
    """Recherche d'œuvres"""
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({
            'success': False,
            'error': 'Paramètre de recherche manquant'
        }), 400
    
    try:
        results = search_artworks(query)
        return jsonify({
            'success': True,
            'query': query,
            'count': len(results),
            'results': results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/artworks', methods=['POST'])
def create_artwork():
    """Crée une nouvelle œuvre"""
    try:
        data = request.get_json()
        
        # Validation
        if not data.get('title') or not data.get('artist'):
            return jsonify({
                'success': False,
                'error': 'Titre et artiste requis'
            }), 400
        
        # Créer œuvre
        oeuvre_id = add_artwork(
            title=data['title'],
            artist=data['artist'],
            description=data.get('description'),
            date_oeuvre=data.get('date_oeuvre'),
            materiaux_technique=data.get('materiaux_technique'),
            dimensions=data.get('dimensions'),
            image_link=data.get('image_link'),
            pdf_link=data.get('pdf_link'),
            room=data.get('room')
        )
        
        return jsonify({
            'success': True,
            'oeuvre_id': oeuvre_id
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===== API PREGENERATIONS =====

@app.route('/api/pregenerations/stats', methods=['GET'])
def pregenerations_stats():
    """Statistiques prégénérations"""
    try:
        stats = get_pregeneration_stats()
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/pregenerations/<int:oeuvre_id>', methods=['GET'])
def get_artwork_pregen(oeuvre_id):
    """Récupère prégénérations d'une œuvre"""
    try:
        pregenerations = get_artwork_pregenerations(oeuvre_id)
        return jsonify({
            'success': True,
            'oeuvre_id': oeuvre_id,
            'count': len(pregenerations),
            'pregenerations': pregenerations
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/pregenerations', methods=['POST'])
def create_pregeneration():
    """Crée une prégénération"""
    try:
        data = request.get_json()
        
        # Validation
        required = ['oeuvre_id', 'age_cible', 'thematique', 'style_texte', 'pregeneration_text']
        for field in required:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Champ requis: {field}'
                }), 400
        
        # Créer
        pregeneration_id = add_pregeneration(
            oeuvre_id=data['oeuvre_id'],
            age_cible=data['age_cible'],
            thematique=data['thematique'],
            style_texte=data['style_texte'],
            pregeneration_text=data['pregeneration_text'],
            voice_link=data.get('voice_link')
        )
        
        return jsonify({
            'success': True,
            'pregeneration_id': pregeneration_id
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===== API PARCOURS (TODO: À implémenter) =====

@app.route('/api/parcours/generate', methods=['POST'])
def generate_parcours():
    """Génère un parcours personnalisé"""
    try:
        data = request.get_json()
        
        # TODO: Implémenter générateur de parcours
        # Pour l'instant, retourne placeholder
        
        return jsonify({
            'success': True,
            'message': 'Générateur de parcours à implémenter',
            'parcours': {
                'introduction': 'Bienvenue...',
                'oeuvres': [],
                'conclusion': 'Merci...'
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===== DÉMARRAGE =====

if __name__ == '__main__':
    print("🚀 Démarrage Museum Voice Backend")
    print("📍 Port: 5000")
    print("🗄️  Database: PostgreSQL")
    app.run(host='0.0.0.0', port=5000, debug=True)

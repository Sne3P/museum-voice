#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API Flask pour servir les contenus prégénérés
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

# Ajouter le dossier parent au path pour les imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pregeneration_retrieval import (
    get_pregenerated_content, 
    get_available_pregenerated_content,
    get_pregeneration_statistics
)

app = Flask(__name__)
CORS(app)

@app.route('/api/pregenerated-content', methods=['GET'])
def get_content():
    """
    Endpoint pour récupérer un contenu prégénéré spécifique.
    
    Query params:
        - oeuvre_id: ID de l'œuvre (requis)
        - age_cible: enfant|ado|adulte|senior (requis)
        - thematique: technique_picturale|biographie|historique (requis)
        - style_texte: analyse|decouverte|anecdote (requis)
    """
    try:
        oeuvre_id = request.args.get('oeuvre_id', type=int)
        age_cible = request.args.get('age_cible')
        thematique = request.args.get('thematique')
        style_texte = request.args.get('style_texte')
        
        # Validation des paramètres
        if not all([oeuvre_id, age_cible, thematique, style_texte]):
            return jsonify({
                'error': 'Paramètres manquants',
                'required': ['oeuvre_id', 'age_cible', 'thematique', 'style_texte']
            }), 400
        
        # Validation des valeurs
        valid_ages = ['enfant', 'ado', 'adulte', 'senior']
        valid_themes = ['technique_picturale', 'biographie', 'historique']
        valid_styles = ['analyse', 'decouverte', 'anecdote']
        
        if age_cible not in valid_ages:
            return jsonify({'error': f'age_cible invalide. Valeurs autorisées: {valid_ages}'}), 400
        
        if thematique not in valid_themes:
            return jsonify({'error': f'thematique invalide. Valeurs autorisées: {valid_themes}'}), 400
            
        if style_texte not in valid_styles:
            return jsonify({'error': f'style_texte invalide. Valeurs autorisées: {valid_styles}'}), 400
        
        # Récupération du contenu
        content = get_pregenerated_content(oeuvre_id, age_cible, thematique, style_texte)
        
        if not content:
            return jsonify({
                'error': 'Contenu non trouvé',
                'oeuvre_id': oeuvre_id,
                'criteres': {
                    'age_cible': age_cible,
                    'thematique': thematique,
                    'style_texte': style_texte
                }
            }), 404
        
        return jsonify({
            'success': True,
            'content': content,
            'criteres': {
                'oeuvre_id': oeuvre_id,
                'age_cible': age_cible,
                'thematique': thematique,
                'style_texte': style_texte
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500

@app.route('/api/pregenerated-content/all/<int:oeuvre_id>', methods=['GET'])
def get_all_content_for_artwork(oeuvre_id):
    """
    Endpoint pour récupérer tous les contenus prégénérés d'une œuvre.
    """
    try:
        contents = get_available_pregenerated_content(oeuvre_id)
        
        if not contents:
            return jsonify({
                'error': 'Aucun contenu prégénéré trouvé pour cette œuvre',
                'oeuvre_id': oeuvre_id
            }), 404
        
        return jsonify({
            'success': True,
            'oeuvre_id': oeuvre_id,
            'total_contents': len(contents),
            'contents': contents
        })
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500

@app.route('/api/pregenerated-content/stats', methods=['GET'])
def get_stats():
    """
    Endpoint pour récupérer les statistiques de prégénération.
    """
    try:
        stats = get_pregeneration_statistics()
        
        return jsonify({
            'success': True,
            'statistics': stats
        })
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500

@app.route('/api/pregenerated-content/criteria', methods=['GET'])
def get_available_criteria():
    """
    Endpoint pour récupérer les critères disponibles.
    """
    return jsonify({
        'success': True,
        'criteria': {
            'age_cible': {
                'values': ['enfant', 'ado', 'adulte', 'senior'],
                'description': 'Tranche d\'âge du visiteur'
            },
            'thematique': {
                'values': ['technique_picturale', 'biographie', 'historique'],
                'description': 'Aspect de l\'œuvre à explorer'
            },
            'style_texte': {
                'values': ['analyse', 'decouverte', 'anecdote'],
                'description': 'Style de présentation du contenu'
            }
        }
    })

if __name__ == '__main__':
    print("🚀 Démarrage de l'API de prégénération...")
    print("📋 Endpoints disponibles:")
    print("   GET /api/pregenerated-content")
    print("   GET /api/pregenerated-content/all/<oeuvre_id>")
    print("   GET /api/pregenerated-content/stats")
    print("   GET /api/pregenerated-content/criteria")
    
    app.run(debug=True, port=5001, host='0.0.0.0')
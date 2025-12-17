#!/usr/bin/env python3
"""
Générateur de contenu intelligent pour les prégénérations avec critères multiples
"""

import re
from typing import Dict, List, Any, Optional
from pregeneration_db import add_pregeneration, get_pregeneration_stats
from model_db import get_artwork_by_id, get_anecdotes_for_artwork

class IntelligentContentGenerator:
    """Générateur de contenu adapté selon l'âge, la thématique et le style"""
    
    def __init__(self):
        self.age_profiles = {
            'enfant': {
                'vocabulary': 'simple',
                'sentence_length': 'court',
                'tone': 'ludique',
                'focus': 'visuel et concret'
            },
            'ado': {
                'vocabulary': 'accessible',
                'sentence_length': 'moyen', 
                'tone': 'engageant',
                'focus': 'contexte et curiosités'
            },
            'adulte': {
                'vocabulary': 'standard',
                'sentence_length': 'normal',
                'tone': 'informatif',
                'focus': 'analyse et culture'
            },
            'senior': {
                'vocabulary': 'enrichi',
                'sentence_length': 'développé',
                'tone': 'respectueux',
                'focus': 'contexte historique'
            }
        }
    
    def generate_content_for_artwork(self, oeuvre_id: int, age_cible: str, 
                                   thematique: str, style_texte: str,
                                   db_path: Optional[str] = None) -> str:
        """Génère un contenu adapté pour une œuvre selon les critères"""
        
        # Récupérer les données de l'œuvre
        artwork = get_artwork_by_id(oeuvre_id, db_path)
        if not artwork:
            raise ValueError(f"Œuvre ID {oeuvre_id} non trouvée")
        
        # Récupérer les anecdotes
        anecdotes = get_anecdotes_for_artwork(oeuvre_id, db_path)
        
        # Générer le contenu selon les critères
        if style_texte == 'analyse':
            content = self._generate_analysis_content(artwork, anecdotes, age_cible, thematique)
        elif style_texte == 'decouverte':
            content = self._generate_discovery_content(artwork, anecdotes, age_cible, thematique)
        elif style_texte == 'anecdote':
            content = self._generate_anecdote_content(artwork, anecdotes, age_cible, thematique)
        else:
            raise ValueError(f"Style de texte invalide: {style_texte}")
        
        return content
    
    def _generate_analysis_content(self, artwork: Dict, anecdotes: List, age_cible: str, thematique: str) -> str:
        """Génère un contenu d'analyse"""
        
        if thematique == 'technique_picturale':
            return self._analyze_technique(artwork, age_cible)
        elif thematique == 'biographie':
            return self._analyze_biography(artwork, age_cible)
        elif thematique == 'historique':
            return self._analyze_history(artwork, age_cible)
    
    def _generate_discovery_content(self, artwork: Dict, anecdotes: List, age_cible: str, thematique: str) -> str:
        """Génère un contenu de découverte"""
        
        if thematique == 'technique_picturale':
            return self._discover_technique(artwork, age_cible)
        elif thematique == 'biographie':
            return self._discover_biography(artwork, age_cible)
        elif thematique == 'historique':
            return self._discover_history(artwork, age_cible)
    
    def _generate_anecdote_content(self, artwork: Dict, anecdotes: List, age_cible: str, thematique: str) -> str:
        """Génère un contenu basé sur les anecdotes"""
        
        if not anecdotes:
            return self._create_fallback_anecdote(artwork, age_cible, thematique)
        
        # Sélectionner et adapter les anecdotes selon l'âge
        selected_anecdote = anecdotes[0]['contenu']  # Première anecdote
        
        if age_cible == 'enfant':
            return self._simplify_for_children(selected_anecdote, artwork)
        elif age_cible == 'ado':
            return self._engage_for_teens(selected_anecdote, artwork)
        elif age_cible == 'adulte':
            return self._inform_for_adults(selected_anecdote, artwork)
        elif age_cible == 'senior':
            return self._contextualize_for_seniors(selected_anecdote, artwork)
    
    # Méthodes d'analyse technique
    def _analyze_technique(self, artwork: Dict, age_cible: str) -> str:
        materiaux = artwork.get('materiaux_technique', 'Non spécifié')
        analyse = artwork.get('analyse_plastique', '')
        
        if age_cible == 'enfant':
            return f"Cette œuvre est faite avec {materiaux}. L'artiste a utilisé des couleurs et des formes spéciales pour créer quelque chose de beau !"
        elif age_cible == 'ado':
            return f"Technique utilisée : {materiaux}. {analyse[:200]}... Cette technique permet de créer des effets visuels particuliers."
        elif age_cible == 'adulte':
            return f"Analyse technique : {materiaux}. {analyse} Cette approche artistique révèle la maîtrise technique de l'artiste."
        elif age_cible == 'senior':
            return f"Étude approfondie des matériaux : {materiaux}. {analyse} Cette œuvre s'inscrit dans la tradition artistique de son époque."
    
    def _analyze_biography(self, artwork: Dict, age_cible: str) -> str:
        artiste = artwork.get('artiste_nom', 'Artiste inconnu')
        lieu_naissance = artwork.get('lieu_naissance', 'Lieu inconnu')
        
        if age_cible == 'enfant':
            return f"{artiste} est né à {lieu_naissance}. C'était un artiste très talentueux qui aimait peindre !"
        elif age_cible == 'ado':
            return f"{artiste}, né à {lieu_naissance}, était un artiste innovant. Sa vie et son époque ont influencé son art."
        elif age_cible == 'adulte':
            return f"Biographie : {artiste} ({lieu_naissance}). Son parcours artistique reflète les courants de son époque."
        elif age_cible == 'senior':
            return f"Étude biographique : {artiste}, originaire de {lieu_naissance}, s'inscrit dans la lignée des grands maîtres de son temps."
    
    def _analyze_history(self, artwork: Dict, age_cible: str) -> str:
        contexte = artwork.get('contexte_historique', '')
        date_oeuvre = artwork.get('date_oeuvre', 'Date inconnue')
        
        if age_cible == 'enfant':
            return f"Cette œuvre a été créée en {date_oeuvre}. À cette époque, le monde était différent d'aujourd'hui !"
        elif age_cible == 'ado':
            return f"Contexte historique ({date_oeuvre}) : {contexte[:150]}... Cette période était marquée par des changements importants."
        elif age_cible == 'adulte':
            return f"Analyse historique : {contexte} Créée en {date_oeuvre}, cette œuvre témoigne de son époque."
        elif age_cible == 'senior':
            return f"Étude du contexte historique : {contexte} Cette œuvre de {date_oeuvre} s'inscrit dans les grandes transformations de son siècle."
    
    # Méthodes de découverte
    def _discover_technique(self, artwork: Dict, age_cible: str) -> str:
        materiaux = artwork.get('materiaux_technique', 'Matériaux variés')
        
        if age_cible == 'enfant':
            return f"Savais-tu que cette œuvre est faite avec {materiaux} ? C'est comme de la magie avec des couleurs !"
        elif age_cible == 'ado':
            return f"Découverte technique : {materiaux}. Cette technique était révolutionnaire à l'époque !"
        elif age_cible == 'adulte':
            return f"Exploration technique : L'utilisation de {materiaux} révèle l'innovation artistique de l'époque."
        elif age_cible == 'senior':
            return f"Investigation technique approfondie : {materiaux}. Cette approche témoigne de l'évolution des pratiques artistiques."
    
    def _discover_biography(self, artwork: Dict, age_cible: str) -> str:
        artiste = artwork.get('artiste_nom', 'Artiste inconnu')
        
        if age_cible == 'enfant':
            return f"L'artiste {artiste} était une personne créative qui adorait faire de l'art !"
        elif age_cible == 'ado':
            return f"À la découverte de {artiste} : un artiste qui a marqué son époque par ses créations originales."
        elif age_cible == 'adulte':
            return f"Portrait d'artiste : {artiste} s'est distingué par son approche unique et sa contribution à l'art."
        elif age_cible == 'senior':
            return f"Biographie détaillée : {artiste} figure parmi les personnalités marquantes de l'histoire de l'art."
    
    def _discover_history(self, artwork: Dict, age_cible: str) -> str:
        date_oeuvre = artwork.get('date_oeuvre', 'Époque inconnue')
        
        if age_cible == 'enfant':
            return f"Cette œuvre vient d'une époque lointaine : {date_oeuvre} ! Imagine comme c'était différent !"
        elif age_cible == 'ado':
            return f"Voyage dans le temps : {date_oeuvre}. Découvre ce qui se passait dans le monde à cette époque !"
        elif age_cible == 'adulte':
            return f"Contexte historique : Cette œuvre de {date_oeuvre} nous fait découvrir une période fascinante."
        elif age_cible == 'senior':
            return f"Plongée historique : {date_oeuvre} marque une période charnière de l'histoire artistique et culturelle."
    
    # Méthodes d'adaptation par âge pour les anecdotes
    def _simplify_for_children(self, anecdote: str, artwork: Dict) -> str:
        # Simplifier le vocabulaire et raccourcir
        simplified = anecdote[:100] + "..."
        return f"Voici une histoire amusante sur cette œuvre : {simplified}"
    
    def _engage_for_teens(self, anecdote: str, artwork: Dict) -> str:
        return f"Histoire captivante : {anecdote} Incroyable, non ?"
    
    def _inform_for_adults(self, anecdote: str, artwork: Dict) -> str:
        return f"Anecdote historique : {anecdote}"
    
    def _contextualize_for_seniors(self, anecdote: str, artwork: Dict) -> str:
        return f"Témoignage historique : {anecdote} Cette anecdote illustre parfaitement l'époque de création."
    
    def _create_fallback_anecdote(self, artwork: Dict, age_cible: str, thematique: str) -> str:
        """Crée une anecdote par défaut si aucune n'est disponible"""
        titre = artwork.get('titre', 'Cette œuvre')
        
        if age_cible == 'enfant':
            return f"{titre} est une œuvre très spéciale qui raconte une belle histoire !"
        elif age_cible == 'ado':
            return f"{titre} cache des secrets fascinants sur son époque de création."
        elif age_cible == 'adulte':
            return f"{titre} témoigne de l'excellence artistique de son créateur."
        elif age_cible == 'senior':
            return f"{titre} s'inscrit dans la grande tradition artistique de son époque."
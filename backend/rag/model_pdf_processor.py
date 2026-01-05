#!/usr/bin/env python3
"""
Processeur PDF conforme au modèle standardisé (version corrigée)
Compatible PostgreSQL et SQLite
"""

import re
from pathlib import Path
from typing import Dict, List, Optional, Any
import PyPDF2


class ModelCompliantPDFProcessor:
    """
    Processeur PDF conforme au modèle standardisé
    Extrait les métadonnées des PDFs selon le modèle Museum Voice
    """
    
    def __init__(self):
        # Patterns optimisés basés sur la vraie structure du PDF
        self.patterns = {
            'titre': r'Titre\s*:?\s*(.+?)(?=\nArtiste\s*:|$)',
            'artiste': r'Artiste\s*:?\s*(.+?)(?=\nLieu de naissance|$)',
            'lieu_naissance': r'Lieu de naissance[^:]*:?\s*(.+?)(?=\nDate de l|$)',
            'date_oeuvre': r'Date de l.œuvre[^:]*:?\s*(.+?)(?=\nMatériaux|$)',
            'materiaux': r'Matériaux[^:]*:?\s*(.+?)(?=\nPériode|$)',
            'mouvement': r'Période[^:]*Mouvement[^:]*:?\s*(.+?)(?=\nProvenance|$)',
            'provenance': r'Provenance[^:]*:?\s*(.+?)(?=\nContexte|$)',
            'contexte': r'Contexte[^:]*:?\s*(.+?)(?=\nDescription|$)',
            'description': r'Description[^:]*:?\s*(.+?)(?=\nAnalyse|$)',
            'analyse': r'Analyse[^:]*:?\s*(.+?)(?=\nIconographie|$)',
            'iconographie': r'Iconographie[^:]*:?\s*(.+?)(?=\nRéception|$)',
            'reception': r'Réception[^:]*:?\s*(.+?)(?=\nParcours|$)',
            'parcours': r'Parcours[^:]*:?\s*(.+?)(?=\nAnecdote|$)'
        }
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extrait le texte du PDF"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text
        except Exception as e:
            print(f"❌ Erreur extraction PDF {pdf_path}: {e}")
            return ""
    
    def extract_field(self, text: str, field_name: str) -> Optional[str]:
        """
        Extrait un champ du texte de manière flexible et universelle.
        Tolère les variations : avec/sans ":", avec parenthèses explicatives, etc.
        Gère les PDFs avec espaces entre caractères et les formats complexes.
        """
        
        # Patterns flexibles adaptés à la structure réelle des PDFs
        # Capturent le contenu jusqu'à la prochaine section identifiable
        # Utilisent \s pour capturer tous types d'espaces et retours à la ligne
        patterns = {
            'titre': r'(?i)Titre\s*:?\s*(.+?)(?=\s*Période|$)',
            'artiste': r'(?i)Artiste\s*(?:\([^)]*\))?\s*:\s*(.+?)(?=\s*Lieu\s+de\s+naissance|$)',
            'lieu_naissance': r'(?i)Lieu\s+de\s+naissance\s+(?:de\s+l.artiste,?\s*)?(?:dates?\s+de\s+vie\s*)?:?\s*(.+?)(?=\s*Datation|$)',
            'date_oeuvre': r'(?i)Datation\s+de\s+l.œuvre\s*:?\s*(.+?)(?=\s*Matériau|$)',
            'materiaux': r'(?i)Matériau\s*/?\s*Technique\s*(?:\([^)]*\))?\s*:?\s*(.+?)(?=\s*Localisation|$)',
            'mouvement': r'(?i)Période\s*/?\s*Mouvement\s*:?\s*(.+?)(?=\s*Artiste|$)',
            'provenance': r'(?i)Provenance\s*/?\s*Mode[^:]*:?\s*(.+?)(?=\s*Contexte|$)',
            'contexte': r'(?i)Contexte\s*&\s*commande\s*(?:\([^)]*\))?\s*(.+?)(?=\s*Description\s+objective|$)',
            'description': r'(?i)Description\s+objective\s*(?:\([^)]*\))?\s*(.+?)(?=\s*Analyse\s+matérielle|$)',
            'analyse': r'(?i)Analyse\s+matérielle\s*&?\s*technique\s*(?:\([^)]*\))?\s*(.+?)(?=\s*Iconographie|$)',
            'iconographie': r'(?i)Iconographie\s*(?:[,&]?\s*symbolique)?\s*(?:\([^)]*\))?\s*(.+?)(?=\s*Réception|$)',
            'reception': r'(?i)Réception\s*(?:[,&]?\s*circulation)?\s*(?:\([^)]*\))?\s*(.+?)(?=\s*Parcours|$)',
            'parcours': r'(?i)Parcours\s*(?:[,&]?\s*conservation)?\s*(?:\([^)]*\))?\s*(.+?)(?=\s*Anecdote|$)'
        }
        
        if field_name not in patterns:
            return None
        
        match = re.search(patterns[field_name], text, re.DOTALL)
        if not match:
            return None
        
        content = match.group(1).strip()
        
        # Nettoyage intelligent : gérer les espaces multiples et retours à la ligne
        content = re.sub(r'\s+', ' ', content)
        
        # Supprimer les préfixes/suffixes inutiles
        content = re.sub(r'^[\s:;\-]+', '', content)
        content = re.sub(r'[\s:;\-]+$', '', content)
        
        if len(content) < 2:
            return None
        
        print(f"✓ {field_name}: {content[:80]}{'...' if len(content) > 80 else ''}")
        return content
    
    def clean_extracted_content(self, content: str, field_name: str) -> str:
        """Nettoie le contenu extrait en supprimant les préfixes spécifiques"""
        # Nettoyer les retours à la ligne et espaces multiples
        content = re.sub(r'\n+', ' ', content)  # Retours à la ligne -> espaces
        content = re.sub(r'\s+', ' ', content)   # Espaces multiples -> un seul
        content = content.strip(' :\n\r\t')
        
        # Supprimer les préfixes spécifiques selon le champ
        # Note: utilise \u2019 pour l'apostrophe typographique et \u0153 pour œ
        prefixes_to_remove = {
            'lieu_naissance': [r"de l[\u2019']artiste\s*:\s*", r"de l[\u2019']artiste\s+", r"Lieu de naissance\s*:\s*"],
            'date_oeuvre': [r"[\u2019']\u0153uvre\s*:\s*", r"[\u2019']œuvre\s*:\s*", r"de l[\u2019']\u0153uvre\s*:\s*", r"Date\s*:\s*"],
            'materiaux': [r"/\s*technique utilisée\s*:\s*", r"Matériaux\s*/\s*technique\s*:\s*", r"technique\s*:\s*"],
            'mouvement': [r"/\s*Mouvement\s*:\s*", r"Période\s*/\s*Mouvement\s*:\s*", r"Mouvement\s*:\s*"],
            'contexte': [r"&\s*commande\s*:\s*", r"Contexte\s*&\s*commande\s*:\s*", r"Contexte\s*:\s*"],
            'reception': [r",\s*circulation\s*&\s*postérité\s*:\s*", r"Réception\s*,?\s*circulation\s*&\s*postérité\s*:\s*"],
            'parcours': [r",\s*conservation\s*&\s*documentation\s*:\s*", r"Parcours\s*,?\s*conservation\s*&\s*documentation\s*:\s*"],
            'analyse': [r"matérielle\s*&\s*technique\s*:\s*", r"Analyse\s*matérielle\s*&\s*technique\s*:\s*"]
        }
        
        if field_name in prefixes_to_remove:
            for prefix_pattern in prefixes_to_remove[field_name]:
                old_content = content
                content = re.sub(prefix_pattern, '', content, flags=re.IGNORECASE)
                if old_content != content:
                    break
        
        # Nettoyage final
        content = content.strip(' :\n\r\t')
        return content
    
    def extract_anecdotes(self, text: str) -> List[str]:
        """Extrait les anecdotes complètes du PDF"""
        anecdotes = []
        
        # Pattern flexible pour capturer les anecdotes
        # Peut avoir ou non un numéro, un ":", etc.
        # Capture depuis "Anecdote" jusqu'à la fin ou une autre section
        pattern = r'(?:^|\n)\s*Anecdote\s*\d*\s*:?\s*([\s\S]+?)(?=\n\s*(?:Anecdote|Références|Sources|$))'
        matches = re.findall(pattern, text, re.IGNORECASE)
        
        for match in matches:
            anecdote = match.strip()
            # Nettoyer les retours à la ligne multiples mais conserver la structure
            anecdote = re.sub(r'\s+', ' ', anecdote)
            anecdote = anecdote.strip(' :-\n\r\t')
            
            # Filtrer les anecdotes trop courtes ou vides
            if anecdote and len(anecdote) > 10:
                # Vérifier qu'on n'a pas capturé d'autre section principale
                if not re.search(r'^(Titre|Artiste|Description|Analyse|Contexte|Période|Matériau)\s*:', anecdote, re.IGNORECASE):
                    anecdotes.append(anecdote)
                    print(f"✓ Anecdote extraite ({len(anecdote)} caractères)")
        
        # Si pas d'anecdotes avec le pattern principal, essayer un pattern alternatif
        if not anecdotes:
            # Pattern avec recherche ligne par ligne puis regroupement
            lines = text.split('\n')
            current_anecdote = ""
            in_anecdote = False
            
            for line in lines:
                line = line.strip()
                if re.match(r'Anecdote\s*\d*\s*:?', line, re.IGNORECASE):
                    # Sauvegarder l'anecdote précédente si elle existe
                    if current_anecdote and len(current_anecdote) > 10:
                        anecdotes.append(current_anecdote.strip())
                    # Commencer une nouvelle anecdote
                    current_anecdote = re.sub(r'Anecdote\s*\d*\s*:\s*', '', line, flags=re.IGNORECASE)
                    in_anecdote = True
                elif in_anecdote and line:
                    # Continuer l'anecdote courante
                    current_anecdote += " " + line
                elif in_anecdote and not line:
                    # Ligne vide - fin de l'anecdote courante
                    in_anecdote = False
            
            # Sauvegarder la dernière anecdote
            if current_anecdote and len(current_anecdote) > 10:
                anecdotes.append(current_anecdote.strip())
        
        return anecdotes


# NOTE: Les méthodes process_pdf_file() et process_pdf_directory() ont été supprimées
# car elles dépendaient de model_db (SQLite).
# L'enregistrement en base de données PostgreSQL est géré par le backend Flask
# via les fonctions dans core/db_postgres.py
# Voir main_postgres.py pour l'implémentation complète
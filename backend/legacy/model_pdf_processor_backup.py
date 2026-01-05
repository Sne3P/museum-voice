#!/usr/bin/env python3
"""
Processeur PDF conforme au modèle standardisé (version corrigée)
"""

import re
from pathlib import Path
from typing import Dict, List, Optional, Any
import PyPDF2

from .core.db_postgres import add_artwork, add_artist, add_movement, add_anecdote, _connect_postgres


class ModelCompliantPDFProcessor:
    """Processeur PDF conforme au modèle standardisé"""
    
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path
        
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
        """Extrait le texte du PDF et nettoie les sauts de ligne parasites"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    # Nettoyer les sauts de ligne entre les mots (problème PyPDF2)
                    # Remplacer "\n\n" par "\n" et "\n " par " "
                    page_text = re.sub(r'\n+', ' ', page_text)  # Tous les \n deviennent des espaces
                    page_text = re.sub(r'\s+', ' ', page_text)  # Normaliser les espaces multiples
                    text += page_text + "\n"
                
                # Remettre les vrais sauts de ligne pour les sections
                # Reconstituer la structure avec les marqueurs de section
                text = re.sub(r'\s+(Titre|Artiste|Lieu de naissance|Date de l|Matériaux|Période|Provenance|Contexte|Description|Analyse|Iconographie|Réception|Parcours|Anecdote)\s*:', r'\n\1 :', text)
                
                return text
        except Exception as e:
            print(f"❌ Erreur extraction PDF {pdf_path}: {e}")
            return ""
    
    def extract_field(self, text: str, field_name: str) -> Optional[str]:
        """
        Extrait un champ du texte avec parsing intelligent et flexible.
        Tolère les variations de formatage, espaces, parenthèses, etc.
        """
        
        # Patterns flexibles pour détecter les sections (insensible à la casse, espaces variables)
        # Utilise des regex pour capturer les variations
        section_patterns = {
            'titre': [
                r'(?i)titre\s*[:\-]?\s*',
            ],
            'artiste': [
                r'(?i)artiste\s*(?:\([^)]*\))?\s*[:\-]?\s*',  # Tolère "Artiste :", "Artiste (nom complet) :", etc.
            ],
            'lieu_naissance': [
                r'(?i)lieu\s+de\s+naissance\s*(?:\([^)]*\))?\s*[:\-]?\s*',
            ],
            'date_oeuvre': [
                r'(?i)dat(?:e|ation)\s+(?:de\s+)?l[\'']?\s*[œo]euvre\s*[:\-]?\s*',
            ],
            'materiaux': [
                r'(?i)mat[ée]ri(?:au|el)(?:x)?\s*(?:[\/]|et)?\s*(?:technique|support)?\s*(?:\([^)]*\))?\s*[:\-]?\s*',
            ],
            'mouvement': [
                r'(?i)p[ée]riode\s*(?:[\/]|et)?\s*mouvement\s*[:\-]?\s*',
                r'(?i)mouvement\s*(?:artistique)?\s*[:\-]?\s*',
            ],
            'provenance': [
                r'(?i)provenance\s*(?:[\/]|et)?\s*(?:mode\s+d[\'']entr[ée]e)?\s*(?:\([^)]*\))?\s*[:\-]?\s*',
            ],
            'contexte': [
                r'(?i)contexte\s*(?:(?:et|&)\s*commande)?\s*(?:\([^)]*\))?\s*[:\-]?\s*',
            ],
            'description': [
                r'(?i)description\s*(?:objective)?\s*(?:\([^)]*\))?\s*[:\-]?\s*',
            ],
            'analyse': [
                r'(?i)analyse\s*(?:mat[ée]rielle)?\s*(?:(?:et|&)\s*technique)?\s*(?:\([^)]*\))?\s*[:\-]?\s*',
            ],
            'iconographie': [
                r'(?i)iconographie\s*(?:,)?\s*(?:symbolique)?\s*(?:(?:et|&)\s*interpr[ée]tations?)?\s*(?:\([^)]*\))?\s*[:\-]?\s*',
            ],
            'reception': [
                r'(?i)r[ée]ception\s*(?:critique)?\s*(?:\([^)]*\))?\s*[:\-]?\s*',
            ],
            'parcours': [
                r'(?i)parcours\s*(?:de\s+visite)?\s*(?:\([^)]*\))?\s*[:\-]?\s*',
            ]
        }
        
        if field_name not in section_patterns:
            return None
        
        # Chercher le début de la section avec tous les patterns possibles
        start_pos = -1
        start_match_end = -1
        
        for pattern in section_patterns[field_name]:
            match = re.search(pattern, text)
            if match:
                start_pos = match.start()
                start_match_end = match.end()
                break
        
        if start_pos == -1:
            return None
        
        # Chercher la prochaine section (n'importe laquelle) après celle-ci
        # On cherche tous les patterns de toutes les sections
        all_section_starts = []
        
        for other_field, patterns in section_patterns.items():
            if other_field == field_name:
                continue
            for pattern in patterns:
                for match in re.finditer(pattern, text[start_match_end:]):
                    all_section_starts.append(start_match_end + match.start())
        
        # Trouver la prochaine section la plus proche
        if all_section_starts:
            next_section_pos = min(all_section_starts)
            content = text[start_match_end:next_section_pos].strip()
        else:
            # Si pas de section suivante, prendre jusqu'à la fin ou max 2000 caractères
            content = text[start_match_end:start_match_end + 2000].strip()
        
        # Nettoyage final
        if content:
            # Enlever les retours à la ligne multiples
            content = re.sub(r'\n\s*\n+', '\n', content)
            # Enlever les espaces en début/fin
            content = content.strip()
            
            print(f"🧹 Nettoyage {field_name}: '{text[start_match_end:start_match_end+100]}...' -> '{content[:100]}...'")
            
        return content if content else None
    
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
        """Extrait les anecdotes complètes"""
        anecdotes = []
        
        # Pattern pour capturer toutes les anecdotes complètes (multi-lignes)
        # Utilise [\s\S]*? pour capturer tout caractère y compris les retours à la ligne
        pattern = r'Anecdote\s*\d*\s*:\s*([\s\S]*?)(?=\nAnecdote|$)'
        matches = re.findall(pattern, text, re.IGNORECASE)
        
        for match in matches:
            anecdote = match.strip()
            # Nettoyer les retours à la ligne multiples mais conserver la structure
            anecdote = re.sub(r'\n+', ' ', anecdote)  # Remplacer retours à la ligne par espaces
            anecdote = re.sub(r'\s+', ' ', anecdote)   # Nettoyer espaces multiples
            anecdote = anecdote.strip(' :-\n\r\t')
            
            if anecdote and len(anecdote) > 10:  # Filtrer les anecdotes trop courtes
                anecdotes.append(anecdote)
        
        # Si pas d'anecdotes avec le pattern principal, essayer un pattern alternatif
        if not anecdotes:
            # Pattern avec recherche ligne par ligne puis regroupement
            lines = text.split('\n')
            current_anecdote = ""
            in_anecdote = False
            
            for line in lines:
                line = line.strip()
                if re.match(r'Anecdote\s*\d*\s*:', line, re.IGNORECASE):
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
    
    def process_pdf_file(self, pdf_path: str, title_override: Optional[str] = None) -> Optional[int]:
        """Traite un fichier PDF selon le modèle avec gestion des doublons"""
        
        print(f"🔍 Traitement PDF modèle: {pdf_path}")
        
        # Vérifier si ce PDF a déjà été traité (anti-doublon)
        pdf_filename = Path(pdf_path).name
        try:
            conn = _connect_postgres()
            cur = conn.cursor()
            cur.execute("SELECT oeuvre_id, title FROM oeuvres WHERE file_name = %s", (pdf_filename,))
            existing = cur.fetchone()
            if existing:
                print(f"⚠️ PDF déjà traité: {pdf_filename} → {existing[1]} (ID: {existing[0]})")
                print("💡 Utilisez cli.py option 6 pour nettoyer avant de retraiter")
                conn.close()
                return existing[0]
            conn.close()
        except Exception as e:
            print(f"⚠️ Erreur vérification doublons: {e}")
        
        # Extraire le texte
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            return None
        
        # Extraire les champs
        data = {}
        for field in self.patterns.keys():
            value = self.extract_field(text, field)
            if value:
                data[field] = value
        
        print(f"📊 Données extraites: {data}")
        
        # Titre
        titre = title_override or data.get('titre') or Path(pdf_path).stem
        
        # Artiste
        artiste_nom = data.get('artiste')
        artiste_id = None
        if artiste_nom:
            artiste_id = add_artist(
                nom=artiste_nom,
                lieu_naissance=data.get('lieu_naissance'),
                db_path=self.db_path
            )
            print(f"👨‍🎨 Artiste: {artiste_nom} (ID: {artiste_id})")
        
        # Mouvement
        mouvement_nom = data.get('mouvement')
        mouvement_id = None
        if mouvement_nom:
            mouvement_id = add_movement(mouvement_nom, db_path=self.db_path)
            print(f"🎭 Mouvement: {mouvement_nom} (ID: {mouvement_id})")
        
        try:
            # Créer l'œuvre
            artwork_id = add_artwork(
                titre=titre,
                artiste_nom=artiste_nom,
                artiste_id=artiste_id,
                date_oeuvre=data.get('date_oeuvre'),
                materiaux_technique=data.get('materiaux'),
                periode_mouvement=mouvement_nom,
                mouvement_id=mouvement_id,
                provenance=data.get('provenance'),
                contexte_commande=data.get('contexte'),
                description=data.get('description'),
                analyse_materielle_technique=data.get('analyse'),
                iconographie_symbolique=data.get('iconographie'),
                reception_circulation_posterite=data.get('reception'),
                parcours_conservation_doc=data.get('parcours'),
                pdf_link=Path(pdf_path).name,
                file_name=Path(pdf_path).name,
                file_path=pdf_path,
                db_path=self.db_path
            )
            
            print(f"✅ Œuvre créée: {titre} (ID: {artwork_id})")
            
            # Ajouter les anecdotes
            anecdotes = self.extract_anecdotes(text)
            for i, anecdote in enumerate(anecdotes, 1):
                anecdote_id = add_anecdote(
                    oeuvre_id=artwork_id,
                    contenu=anecdote,
                    numero=i,
                    db_path=self.db_path
                )
                print(f"📝 Anecdote {i} ajoutée (ID: {anecdote_id})")
            
            return artwork_id
            
        except Exception as e:
            print(f"❌ Erreur création œuvre: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def process_pdf_directory(self, directory_path: str) -> List[int]:
        """Traite tous les PDFs d'un répertoire"""
        directory = Path(directory_path)
        if not directory.exists():
            print(f"❌ Répertoire {directory_path} non trouvé")
            return []
        
        pdf_files = list(directory.glob("*.pdf"))
        processed_ids = []
        
        for pdf_file in pdf_files:
            print(f"\n🔄 Traitement de {pdf_file.name}...")
            artwork_id = self.process_pdf_file(str(pdf_file))
            if artwork_id:
                processed_ids.append(artwork_id)
        
        return processed_ids


# Fonction de compatibilité
def process_structured_pdf_file(pdf_path: str, title: Optional[str] = None, 
                               db_path: Optional[str] = None) -> Optional[int]:
    processor = ModelCompliantPDFProcessor(db_path)
    return processor.process_pdf_file(pdf_path, title)
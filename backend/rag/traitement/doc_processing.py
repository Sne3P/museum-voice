import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path

# Import SQLite directement
import sqlite3


def extract_text_from_pdf(file_path: str) -> str:
    """Extrait le texte d'un fichier PDF. Requiert PyPDF2."""
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        raise RuntimeError("PyPDF2 non installé. Exécutez: pip install PyPDF2")

    reader = PdfReader(file_path)
    parts = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        parts.append(text)

    return "\n\n".join(parts).strip()


@dataclass
class TextSummary:
    """Structure pour stocker les informations d'un résumé de texte"""
    title: str
    summary: str
    anecdotes: List[str]
    metadata: Dict[str, str]
    artist: Optional[str] = None
    artist: Optional[str] = None


class SummaryProcessor:
    """Processeur de documents pour les résumés de texte"""
    
    def __init__(self):
        self.title_patterns = [
            # Patterns explicites
            r"(?:titre|œuvre|livre|roman|pièce)\s*:\s*([^\n]+)",
            # Titre seul sur une ligne (comme "Guernica")
            r"^([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ][a-zàáâãäåæçèéêëìíîïðñòóôõö]{2,30})\s*$",
            # Premier mot en majuscule au début d'une ligne (avant artiste)
            r"^([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ][a-zàáâãäåæçèéêëìíîïðñòóôõö]{2,30})\s+[A-Z]",
            # Entre guillemets
            r"\"([^\"]+)\"",
        ]
        
        self.section_markers = {
            'summary': ['résumé', 'synopsis', 'histoire', 'intrigue'],
            'anecdote': ['anecdote', 'fait', 'curiosité', 'info']
        }
    
    def extract_title(self, text: str) -> Optional[str]:
        """Extrait le nom de l'œuvre du texte"""
        for pattern in self.title_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip()
        return None
    
    def extract_summary(self, text: str) -> str:
        """Extrait le résumé principal du texte"""
        # Chercher des marqueurs de section explicites (début de ligne ou après ponctuation)
        for marker in self.section_markers['summary']:
            pattern = rf"(?:^|\n|[.!?]\s+){marker}\s*:([^§\n]*(?:\n(?!(?:{'|'.join(self.section_markers['anecdote'])})).*)*)"
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                return self._clean_text(match.group(1))

        # Si pas de marqueur explicite, retourner tout le texte nettoyé (meilleur que juste le plus long paragraphe)
        return self._clean_text(text)
    
    def extract_artist(self, text: str) -> Optional[str]:
        """Extrait le nom de l'artiste du texte"""
        artist_patterns = [
            # Format "Prénom Nom – Année" (comme "Pablo Picasso – 1937")
            r"([A-Z][a-zéèàçù]+\s+[A-Z][a-zéèàçù]+)\s*–\s*\d{4}",
            # Format explicite "Artiste: Nom" (le plus fiable)
            r"(?:artiste|auteur|créateur|sculpteur|peintre)\s*:?\s*([^\n]+)",
            # Format "Nom –" (début de ligne)
            r"^([A-Z][a-zéèàçù]+(?:\s+[A-Z][a-zéèàçù-]+)*)\s*–",
            # Format "par/de Nom" (noms propres seulement)
            r"(?:par|de)\s+([A-Z][a-zéèàçù]+(?:\s+[A-Z][a-zéèàçù-]+)*)",
        ]
        
        for pattern in artist_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                artist = self._clean_text(match.group(1))
                # Filtrer les résultats invalides
                if (len(artist) > 2 and len(artist) < 50 and 
                    not any(word in artist.lower() for word in ['voir', 'plus', 'info', 'suite', 'cette', 'année', 'tableau', 'peinture'])):
                    return artist
        return None
    
    def extract_anecdotes(self, text: str) -> List[str]:
        """Extrait les anecdotes du texte"""
        anecdotes = []
        
        for marker in self.section_markers['anecdote']:
            pattern = rf"{marker}s?\s*:?\s*([^§\n]*(?:\n(?!(?:résumé|titre)).*)*)"
            matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
            
            for match in matches:
                anecdote = self._clean_text(match.group(1))
                if anecdote and len(anecdote) > 10:
                    anecdotes.append(anecdote)
        
        return anecdotes
    
    def _clean_text(self, text: str) -> str:
        """Nettoie et formate le texte"""
        cleaned = re.sub(r'\s+', ' ', text)
        cleaned = re.sub(r'\n\s*\n', '\n', cleaned)
        return cleaned.strip()
    
    def process_document(self, text: str) -> TextSummary:
        """Traite un document et extrait toutes les informations"""
        title = self.extract_title(text)
        summary = self.extract_summary(text)
        anecdotes = self.extract_anecdotes(text)
        artist = self.extract_artist(text)
        
        metadata = {
            'word_count': str(len(text.split())),
            'has_title': str(bool(title)),
            'anecdote_count': str(len(anecdotes)),
            'has_artist': str(bool(artist))
        }
        
        return TextSummary(
            title=title or "Titre non trouvé",
            summary=summary,
            anecdotes=anecdotes,
            metadata=metadata,
            artist=artist
        )


def process_pdf_file(file_path: str, db_path: Optional[str] = None) -> TextSummary:
    """Traite un fichier PDF : extraction texte, parsing, stockage en BDD."""
    text = extract_text_from_pdf(file_path)
    processor = SummaryProcessor()
    summary = processor.process_document(text)

    # Sauvegarde en BDD avec SQLite direct
    try:
        db_file = db_path or Path(__file__).parent.parent.parent / 'database' / 'museum_v1.db'
        conn = sqlite3.connect(str(db_file))
        cursor = conn.cursor()
        
        # Créer le pdf_link pour tous les fichiers dans pdfs
        pdf_link = f"/uploads/pdfs/{Path(file_path).name}"
        
        # Insérer l'oeuvre directement avec les colonnes existantes
        cursor.execute('''
            INSERT OR REPLACE INTO oeuvres 
            (titre, description, artiste_nom, pdf_link, word_count, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        ''', (
            summary.title,
            summary.summary,
            summary.artist or 'Inconnu',
            pdf_link,
            int(summary.metadata.get('word_count', 0))
        ))
        
        conn.commit()
        oeuvre_id = cursor.lastrowid
        print(f"💾 Œuvre sauvée: ID {oeuvre_id} - {summary.title}")
        conn.close()
            
    except Exception as e:
        print(f"Erreur sauvegarde BDD: {e}")

    return summary


def update_artwork_metadata(oeuvre_id: int, title: str, db_path: Optional[str] = None):
    """Met à jour les métadonnées d'une œuvre selon son titre"""
    # Cette fonction peut être étendue pour gérer les métadonnées des œuvres
    pass


def process_all_pdfs(pdf_dir: Optional[str] = None, db_path: Optional[str] = None) -> bool:
    """Traite tous les PDFs du répertoire spécifié"""
    if pdf_dir is None:
        # Répertoire par défaut
        pdf_dir = Path(__file__).parent.parent.parent / 'public' / 'uploads' / 'pdfs'
    
    if db_path is None:
        db_path = Path(__file__).parent.parent.parent / 'database' / 'museum_v1.db'
    
    pdf_dir = Path(pdf_dir)
    if not pdf_dir.exists():
        print(f"❌ Répertoire PDF non trouvé: {pdf_dir}")
        return False
    
    # Trouver tous les PDFs
    pdf_files = list(pdf_dir.glob('*.pdf'))
    if not pdf_files:
        print("❌ Aucun fichier PDF trouvé")
        return False
    
    print(f"📄 Traitement de {len(pdf_files)} fichiers PDF...")
    
    try:
        # Vérifier que la base existe
        if not Path(db_path).exists():
            print(f"❌ Base de données non trouvée: {db_path}")
            return False
        
        success_count = 0
        for pdf_file in pdf_files:
            try:
                print(f"🔄 Traitement: {pdf_file.name}")
                summary = process_pdf_file(str(pdf_file), str(db_path))
                print(f"✅ {pdf_file.name} → {summary.title}")
                success_count += 1
            except Exception as e:
                print(f"❌ Erreur avec {pdf_file.name}: {e}")
        
        print(f"📊 Résultat: {success_count}/{len(pdf_files)} PDFs traités")
        return success_count > 0
        
    except Exception as e:
        print(f"❌ Erreur générale: {e}")
        return False


if __name__ == "__main__":
    # Test direct
    process_all_pdfs()
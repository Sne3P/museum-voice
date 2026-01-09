"""
Service de nettoyage automatique des fichiers audio temporaires
Supprime les audios des sessions expirées ou terminées
"""

import os
import shutil
import psycopg2
from datetime import datetime, timedelta
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class AudioCleanupService:
    """Service de nettoyage des fichiers audio temporaires"""
    
    def __init__(self, db_config, audio_base_dir="/app/uploads/audio"):
        self.db_config = db_config
        self.audio_base_dir = Path(audio_base_dir)
        
    def cleanup_expired_sessions(self):
        """
        Nettoie les fichiers audio des sessions expirées
        Retourne le nombre de sessions nettoyées
        """
        conn = psycopg2.connect(**self.db_config)
        cleaned_count = 0
        
        try:
            cur = conn.cursor()
            
            # Récupérer les sessions expirées avec parcours_id
            cur.execute("""
                SELECT qr_code_id, token, parcours_id, expires_at
                FROM qr_code
                WHERE parcours_id IS NOT NULL
                  AND expires_at < NOW()
                  AND is_used = 1
            """)
            
            expired_sessions = cur.fetchall()
            
            for qr_id, token, parcours_id, expires_at in expired_sessions:
                # Supprimer le dossier audio
                audio_dir = self.audio_base_dir / f"parcours_{parcours_id}"
                
                if audio_dir.exists():
                    try:
                        shutil.rmtree(audio_dir)
                        logger.info(f"🗑️ Dossier audio supprimé: parcours_{parcours_id} (session {token} expirée)")
                        cleaned_count += 1
                    except Exception as e:
                        logger.error(f"❌ Erreur suppression {audio_dir}: {e}")
                
                # Mettre à jour la BDD pour marquer comme nettoyé
                cur.execute("""
                    UPDATE qr_code
                    SET parcours_id = NULL
                    WHERE qr_code_id = %s
                """, (qr_id,))
            
            conn.commit()
            
            if cleaned_count > 0:
                logger.info(f"✅ Nettoyage terminé: {cleaned_count} dossiers audio supprimés")
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du nettoyage: {e}")
            conn.rollback()
        finally:
            conn.close()
        
        return cleaned_count
    
    def cleanup_orphan_audio_files(self):
        """
        Nettoie les dossiers audio orphelins (non liés à une session active)
        Retourne le nombre de dossiers supprimés
        """
        conn = psycopg2.connect(**self.db_config)
        cleaned_count = 0
        
        try:
            cur = conn.cursor()
            
            # Récupérer tous les parcours_id actifs (sessions non expirées)
            cur.execute("""
                SELECT parcours_id
                FROM qr_code
                WHERE parcours_id IS NOT NULL
                  AND (expires_at IS NULL OR expires_at > NOW())
            """)
            
            active_parcours_ids = set(row[0] for row in cur.fetchall())
            
            # Lister tous les dossiers audio
            if self.audio_base_dir.exists():
                for audio_dir in self.audio_base_dir.iterdir():
                    if audio_dir.is_dir() and audio_dir.name.startswith('parcours_'):
                        try:
                            parcours_id = int(audio_dir.name.split('_')[1])
                            
                            # Si le parcours n'est pas dans les sessions actives, supprimer
                            if parcours_id not in active_parcours_ids:
                                shutil.rmtree(audio_dir)
                                logger.info(f"🗑️ Dossier orphelin supprimé: {audio_dir.name}")
                                cleaned_count += 1
                        except (ValueError, IndexError):
                            # Nom de dossier invalide, ignorer
                            continue
            
            if cleaned_count > 0:
                logger.info(f"✅ Nettoyage orphelins terminé: {cleaned_count} dossiers supprimés")
            
        except Exception as e:
            logger.error(f"❌ Erreur nettoyage orphelins: {e}")
        finally:
            conn.close()
        
        return cleaned_count
    
    def cleanup_all(self):
        """Nettoyage complet: sessions expirées + orphelins"""
        expired = self.cleanup_expired_sessions()
        orphans = self.cleanup_orphan_audio_files()
        return expired + orphans


def get_cleanup_service():
    """Retourne une instance du service de nettoyage"""
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'database': os.getenv('DB_NAME', 'museumvoice'),
        'user': os.getenv('DB_USER', 'museum_admin'),
        'password': os.getenv('DB_PASSWORD', 'museum_password')
    }
    return AudioCleanupService(db_config)

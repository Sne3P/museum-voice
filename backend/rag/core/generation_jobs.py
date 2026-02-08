"""
Gestionnaire de jobs de génération asynchrone - VERSION OPTIMISÉE
- Persistance PostgreSQL pour partage entre workers Gunicorn
- Estimation intelligente du temps restant basée sur historique réel
- Support pour génération parallèle avec ThreadPoolExecutor
- Métriques détaillées pour monitoring
"""

import threading
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
import json
import psycopg2
import psycopg2.extras
import os
import hashlib
import multiprocessing

logger = logging.getLogger(__name__)


# ===== CONFIGURATION CPU ADAPTATIVE =====
_CPU_COUNT = multiprocessing.cpu_count()
# Nombre de workers parallèles pour la génération
# Sur VPS avec plus de CPU, on peut augmenter
if _CPU_COUNT >= 32:
    MAX_PARALLEL_GENERATIONS = 4
elif _CPU_COUNT >= 16:
    MAX_PARALLEL_GENERATIONS = 3
elif _CPU_COUNT >= 8:
    MAX_PARALLEL_GENERATIONS = 2
else:
    MAX_PARALLEL_GENERATIONS = 1  # Séquentiel si peu de CPU

logger.info(f"🔧 Generation Jobs: {_CPU_COUNT} CPUs détectés, {MAX_PARALLEL_GENERATIONS} workers parallèles")


class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class GenerationJob:
    """Représente un job de génération avec métriques temps réel"""
    job_id: str
    job_type: str  # "all", "artwork", "profile"
    status: JobStatus = JobStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Progression
    total_items: int = 0
    completed_items: int = 0
    current_item: str = ""
    
    # Stats de génération
    generated: int = 0
    skipped: int = 0
    errors: int = 0
    
    # Métriques de temps (pour estimation intelligente)
    avg_generation_time_ms: Optional[int] = None
    avg_skip_time_ms: Optional[int] = None
    last_generation_time_ms: Optional[int] = None
    
    # Paramètres
    params: Dict[str, Any] = field(default_factory=dict)
    
    # Erreur éventuelle
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict:
        elapsed = self._get_elapsed_seconds()
        remaining = self._estimate_remaining_intelligent()
        
        return {
            "job_id": self.job_id,
            "job_type": self.job_type,
            "status": self.status.value if isinstance(self.status, JobStatus) else self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "progress": {
                "total": self.total_items,
                "completed": self.completed_items,
                "current": self.current_item,
                "percentage": round((self.completed_items / self.total_items * 100) if self.total_items > 0 else 0, 1)
            },
            "stats": {
                "generated": self.generated,
                "skipped": self.skipped,
                "errors": self.errors
            },
            "timing": {
                "avg_generation_ms": self.avg_generation_time_ms,
                "avg_skip_ms": self.avg_skip_time_ms,
                "last_generation_ms": self.last_generation_time_ms,
                "parallel_workers": MAX_PARALLEL_GENERATIONS
            },
            "params": self.params,
            "error": self.error_message,
            "elapsed_seconds": elapsed,
            "estimated_remaining_seconds": remaining
        }
    
    def _get_elapsed_seconds(self) -> Optional[float]:
        if not self.started_at:
            return None
        end = self.completed_at or datetime.now()
        return (end - self.started_at).total_seconds()
    
    def _estimate_remaining_intelligent(self) -> Optional[float]:
        """
        Estimation intelligente du temps restant qui DESCEND progressivement.
        
        Méthode: Calculer le "drift" (écart) entre le temps réel et le temps théorique.
        - temps_théorique = completed_items × avg_time_per_item
        - drift = elapsed - temps_théorique
        - remaining = (remaining_items × avg_time) - drift
        
        Quand elapsed augmente de 1s (entre les completions):
        - drift augmente de 1
        - remaining diminue de 1 ✓
        
        Quand un item est complété:
        - Le calcul se réajuste avec les nouvelles stats
        """
        if not self.started_at:
            return None
        
        remaining_items = self.total_items - self.completed_items
        if remaining_items <= 0:
            return 0
        
        elapsed = (datetime.now() - self.started_at).total_seconds()
        
        # Vérifier si force_regenerate est activé
        force_regenerate = self.params.get('force_regenerate', False)
        
        # Estimation de base: ~45 secondes par génération, ajusté par parallélisation
        base_generation_time = 45.0  # secondes
        parallel_factor = max(1, MAX_PARALLEL_GENERATIONS * 0.8)
        default_generation_time = base_generation_time / parallel_factor
        
        # Si on a des vraies métriques de génération, les utiliser
        if self.avg_generation_time_ms and self.avg_generation_time_ms > 1000:
            actual_generation_time = (self.avg_generation_time_ms / 1000.0) / parallel_factor
        else:
            actual_generation_time = default_generation_time
        
        # Déterminer le ratio de génération
        if force_regenerate:
            generation_ratio = 1.0
        elif self.completed_items > 0:
            generation_ratio = self.generated / self.completed_items
            # Si beaucoup de skips au début, les restants sont probablement des générations
            if generation_ratio < 0.2 and self.skipped > 5:
                generation_ratio = 0.9
            generation_ratio = max(0.1, generation_ratio)
        else:
            generation_ratio = 0.5
        
        # Temps moyen estimé par item (pondéré entre génération et skip)
        # Skip = ~0.005 secondes, Génération = actual_generation_time
        skip_time = 0.005
        avg_time_per_item = (generation_ratio * actual_generation_time) + ((1 - generation_ratio) * skip_time)
        
        # === FORMULE QUI DESCEND SECONDE PAR SECONDE ===
        # Temps théorique qu'on aurait dû mettre pour les items complétés
        expected_elapsed_for_completed = self.completed_items * avg_time_per_item
        
        # Drift = écart entre temps réel et temps théorique
        # Si on est en avance (skips rapides), drift < 0
        # Si on est en retard, drift > 0
        time_drift = elapsed - expected_elapsed_for_completed
        
        # Temps "brut" pour les items restants
        raw_remaining = remaining_items * avg_time_per_item
        
        # Temps restant = temps brut - drift
        # Le drift augmente de 1 seconde chaque seconde → remaining diminue de 1
        remaining = raw_remaining - time_drift
        
        # Ne pas retourner de valeur négative
        remaining = max(0, remaining)
        
        # Log pour debug
        logger.debug(
            f"Estimation: {self.completed_items}/{self.total_items}, "
            f"gen_ratio={generation_ratio:.1%}, avg_time={avg_time_per_item:.1f}s, "
            f"drift={time_drift:.1f}s, remaining={remaining:.0f}s"
        )
        
        return remaining


def _connect_postgres():
    """Connexion PostgreSQL avec pool de connexions"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'database'),
        port=int(os.getenv('DB_PORT', '5432')),
        database=os.getenv('DB_NAME', 'museumvoice'),
        user=os.getenv('DB_USER', 'museum_admin'),
        password=os.getenv('DB_PASSWORD', 'Museum@2026!Secure')
    )


class GenerationJobManager:
    """
    Gestionnaire pour les jobs de génération - VERSION OPTIMISÉE
    - PostgreSQL pour persistance entre workers
    - Métriques de temps intelligentes
    - Support génération parallèle
    """
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._ensure_tables_exist()
        self._thread_pool = ThreadPoolExecutor(max_workers=MAX_PARALLEL_GENERATIONS)
        self._initialized = True
        logger.info(f"GenerationJobManager initialisé avec {MAX_PARALLEL_GENERATIONS} workers parallèles")
    
    def _ensure_tables_exist(self):
        """S'assure que les tables existent (migration safe)"""
        try:
            conn = _connect_postgres()
            cur = conn.cursor()
            
            # Table principale des jobs
            cur.execute("""
                CREATE TABLE IF NOT EXISTS generation_jobs (
                    job_id VARCHAR(16) PRIMARY KEY,
                    job_type VARCHAR(50) NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    total_items INTEGER DEFAULT 0,
                    completed_items INTEGER DEFAULT 0,
                    current_item TEXT DEFAULT '',
                    generated INTEGER DEFAULT 0,
                    skipped INTEGER DEFAULT 0,
                    errors INTEGER DEFAULT 0,
                    avg_generation_time_ms INTEGER DEFAULT NULL,
                    avg_skip_time_ms INTEGER DEFAULT NULL,
                    last_generation_time_ms INTEGER DEFAULT NULL,
                    params JSONB DEFAULT '{}',
                    error_message TEXT
                )
            """)
            
            # Ajouter les colonnes si elles n'existent pas (pour migration)
            for col, col_type in [
                ('avg_generation_time_ms', 'INTEGER'),
                ('avg_skip_time_ms', 'INTEGER'),
                ('last_generation_time_ms', 'INTEGER')
            ]:
                try:
                    cur.execute(f"""
                        ALTER TABLE generation_jobs 
                        ADD COLUMN IF NOT EXISTS {col} {col_type} DEFAULT NULL
                    """)
                except Exception:
                    pass  # Colonne existe déjà
            
            # Table historique des temps
            cur.execute("""
                CREATE TABLE IF NOT EXISTS generation_time_history (
                    id SERIAL PRIMARY KEY,
                    job_id VARCHAR(16) REFERENCES generation_jobs(job_id) ON DELETE CASCADE,
                    operation_type VARCHAR(20) NOT NULL,
                    duration_ms INTEGER NOT NULL,
                    oeuvre_id INTEGER,
                    combination_hash VARCHAR(64),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Index
            cur.execute("CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_generation_jobs_created ON generation_jobs(created_at DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_gen_time_history_job ON generation_time_history(job_id)")
            
            conn.commit()
            cur.close()
            conn.close()
            logger.info("Tables de génération vérifiées/créées")
        except Exception as e:
            logger.error(f"Erreur création tables jobs: {e}")
    
    def _row_to_job(self, row: dict) -> GenerationJob:
        """Convertit une row PostgreSQL en GenerationJob"""
        status_str = row['status']
        try:
            status = JobStatus(status_str)
        except ValueError:
            status = JobStatus.PENDING
        
        return GenerationJob(
            job_id=row['job_id'],
            job_type=row['job_type'],
            status=status,
            created_at=row['created_at'],
            started_at=row['started_at'],
            completed_at=row['completed_at'],
            total_items=row['total_items'] or 0,
            completed_items=row['completed_items'] or 0,
            current_item=row['current_item'] or '',
            generated=row['generated'] or 0,
            skipped=row['skipped'] or 0,
            errors=row['errors'] or 0,
            avg_generation_time_ms=row.get('avg_generation_time_ms'),
            avg_skip_time_ms=row.get('avg_skip_time_ms'),
            last_generation_time_ms=row.get('last_generation_time_ms'),
            params=row['params'] or {},
            error_message=row['error_message']
        )
    
    def create_job(self, job_type: str, params: Dict[str, Any] = None) -> GenerationJob:
        """Crée un nouveau job de génération"""
        job_id = str(uuid.uuid4())[:8]
        
        try:
            conn = _connect_postgres()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO generation_jobs (job_id, job_type, params, status)
                VALUES (%s, %s, %s, 'pending')
            """, (job_id, job_type, json.dumps(params or {})))
            conn.commit()
            cur.close()
            conn.close()
            
            logger.info(f"Job créé: {job_id} ({job_type})")
            return self.get_job(job_id)
        except Exception as e:
            logger.error(f"Erreur création job: {e}")
            raise
    
    def get_job(self, job_id: str) -> Optional[GenerationJob]:
        """Récupère un job par son ID"""
        try:
            conn = _connect_postgres()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM generation_jobs WHERE job_id = %s", (job_id,))
            row = cur.fetchone()
            cur.close()
            conn.close()
            
            if row:
                return self._row_to_job(row)
            return None
        except Exception as e:
            logger.error(f"Erreur récupération job: {e}")
            return None
    
    def get_active_jobs(self) -> List[GenerationJob]:
        """Retourne tous les jobs actifs (pending ou running)"""
        try:
            conn = _connect_postgres()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT * FROM generation_jobs 
                WHERE status IN ('pending', 'running')
                ORDER BY created_at DESC
            """)
            rows = cur.fetchall()
            cur.close()
            conn.close()
            
            return [self._row_to_job(row) for row in rows]
        except Exception as e:
            logger.error(f"Erreur récupération jobs actifs: {e}")
            return []
    
    def get_all_jobs(self, limit: int = 20) -> List[GenerationJob]:
        """Retourne les derniers jobs (tous statuts)"""
        try:
            conn = _connect_postgres()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT * FROM generation_jobs 
                ORDER BY created_at DESC
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()
            cur.close()
            conn.close()
            
            return [self._row_to_job(row) for row in rows]
        except Exception as e:
            logger.error(f"Erreur récupération jobs: {e}")
            return []
    
    def record_timing(
        self,
        job_id: str,
        operation_type: str,  # 'generate', 'skip', 'error'
        duration_ms: int,
        oeuvre_id: int = None,
        combination_hash: str = None
    ):
        """
        Enregistre le temps d'une opération et met à jour les moyennes
        """
        try:
            conn = _connect_postgres()
            cur = conn.cursor()
            
            # Enregistrer dans l'historique
            cur.execute("""
                INSERT INTO generation_time_history 
                (job_id, operation_type, duration_ms, oeuvre_id, combination_hash)
                VALUES (%s, %s, %s, %s, %s)
            """, (job_id, operation_type, duration_ms, oeuvre_id, combination_hash))
            
            # Calculer et mettre à jour les moyennes glissantes
            if operation_type == 'generate':
                cur.execute("""
                    UPDATE generation_jobs 
                    SET 
                        last_generation_time_ms = %s,
                        avg_generation_time_ms = COALESCE(
                            (avg_generation_time_ms * 0.7 + %s * 0.3)::INTEGER,
                            %s
                        )
                    WHERE job_id = %s
                """, (duration_ms, duration_ms, duration_ms, job_id))
            elif operation_type == 'skip':
                cur.execute("""
                    UPDATE generation_jobs 
                    SET avg_skip_time_ms = COALESCE(
                        (avg_skip_time_ms * 0.7 + %s * 0.3)::INTEGER,
                        %s
                    )
                    WHERE job_id = %s
                """, (duration_ms, duration_ms, job_id))
            
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            logger.error(f"Erreur enregistrement timing: {e}")
    
    def update_job_progress(
        self,
        job_id: str,
        completed_items: int = None,
        current_item: str = None,
        generated: int = None,
        skipped: int = None,
        errors: int = None
    ):
        """Met à jour la progression d'un job"""
        try:
            updates = []
            values = []
            
            if completed_items is not None:
                updates.append("completed_items = %s")
                values.append(completed_items)
            if current_item is not None:
                updates.append("current_item = %s")
                values.append(current_item)
            if generated is not None:
                updates.append("generated = %s")
                values.append(generated)
            if skipped is not None:
                updates.append("skipped = %s")
                values.append(skipped)
            if errors is not None:
                updates.append("errors = %s")
                values.append(errors)
            
            if not updates:
                return
            
            values.append(job_id)
            
            conn = _connect_postgres()
            cur = conn.cursor()
            cur.execute(f"""
                UPDATE generation_jobs 
                SET {', '.join(updates)}
                WHERE job_id = %s
            """, tuple(values))
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            logger.error(f"Erreur mise à jour progression: {e}")
    
    def start_job(self, job_id: str, total_items: int):
        """Marque un job comme démarré"""
        try:
            conn = _connect_postgres()
            cur = conn.cursor()
            cur.execute("""
                UPDATE generation_jobs 
                SET status = 'running', started_at = CURRENT_TIMESTAMP, total_items = %s
                WHERE job_id = %s
            """, (total_items, job_id))
            conn.commit()
            cur.close()
            conn.close()
            logger.info(f"Job démarré: {job_id} ({total_items} items)")
        except Exception as e:
            logger.error(f"Erreur démarrage job: {e}")
    
    def can_start_job(self, job_id: str) -> bool:
        """
        Vérifie si un job peut démarrer.
        Un job ne peut démarrer que s'il n'y a pas d'autre job 'running'.
        """
        try:
            conn = _connect_postgres()
            cur = conn.cursor()
            # Vérifier s'il y a un job running
            cur.execute("""
                SELECT COUNT(*) FROM generation_jobs 
                WHERE status = 'running' AND job_id != %s
            """, (job_id,))
            running_count = cur.fetchone()[0]
            cur.close()
            conn.close()
            return running_count == 0
        except Exception as e:
            logger.error(f"Erreur vérification can_start: {e}")
            return False
    
    def wait_for_turn(self, job_id: str, check_interval: float = 2.0, max_wait: int = 3600) -> bool:
        """
        Attend que ce soit le tour du job pour démarrer.
        Retourne True si le job peut démarrer, False si annulé ou timeout.
        Le job reste en 'pending' pendant l'attente.
        """
        import time
        waited = 0
        
        while waited < max_wait:
            # Vérifier si le job a été annulé
            job = self.get_job(job_id)
            if not job or job.status == JobStatus.CANCELLED:
                logger.info(f"Job {job_id} annulé pendant l'attente")
                return False
            
            # Vérifier si on peut démarrer
            if self.can_start_job(job_id):
                logger.info(f"Job {job_id} peut maintenant démarrer (attendu {waited}s)")
                return True
            
            # Attendre avant de revérifier
            time.sleep(check_interval)
            waited += check_interval
            
            # Log périodique
            if waited % 30 < check_interval:
                logger.info(f"Job {job_id} en attente ({waited:.0f}s)...")
        
        logger.warning(f"Job {job_id} timeout après {max_wait}s d'attente")
        return False
    
    def complete_job(self, job_id: str, success: bool = True, error_message: str = None):
        """Marque un job comme terminé"""
        try:
            status = 'completed' if success else 'failed'
            conn = _connect_postgres()
            cur = conn.cursor()
            cur.execute("""
                UPDATE generation_jobs 
                SET status = %s, completed_at = CURRENT_TIMESTAMP, error_message = %s
                WHERE job_id = %s
            """, (status, error_message, job_id))
            conn.commit()
            cur.close()
            conn.close()
            logger.info(f"Job terminé: {job_id} (success={success})")
        except Exception as e:
            logger.error(f"Erreur completion job: {e}")
    
    def cancel_job(self, job_id: str, force: bool = False) -> bool:
        """
        Annule un job.
        - Sans force: annule seulement les jobs 'pending'
        - Avec force: annule aussi les jobs 'running' (force stop)
        """
        try:
            conn = _connect_postgres()
            cur = conn.cursor()
            
            if force:
                # Annuler même les jobs en cours
                cur.execute("""
                    UPDATE generation_jobs 
                    SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP,
                        error_message = 'Annulé par l''utilisateur (force stop)'
                    WHERE job_id = %s AND status IN ('pending', 'running')
                """, (job_id,))
            else:
                # Annuler seulement les jobs en attente
                cur.execute("""
                    UPDATE generation_jobs 
                    SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
                    WHERE job_id = %s AND status = 'pending'
                """, (job_id,))
            
            affected = cur.rowcount
            conn.commit()
            cur.close()
            conn.close()
            
            if affected > 0:
                logger.info(f"Job annulé: {job_id} (force={force})")
            return affected > 0
        except Exception as e:
            logger.error(f"Erreur annulation job: {e}")
            return False
    
    def cancel_all_running_jobs(self) -> int:
        """Annule tous les jobs en cours ou en attente"""
        try:
            conn = _connect_postgres()
            cur = conn.cursor()
            cur.execute("""
                UPDATE generation_jobs 
                SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP,
                    error_message = 'Annulé en masse'
                WHERE status IN ('pending', 'running')
            """)
            affected = cur.rowcount
            conn.commit()
            cur.close()
            conn.close()
            
            if affected > 0:
                logger.info(f"Jobs annulés en masse: {affected}")
            return affected
        except Exception as e:
            logger.error(f"Erreur annulation en masse: {e}")
            return 0
    
    def run_async(
        self,
        job: GenerationJob,
        task_func: Callable[[GenerationJob], None]
    ):
        """Lance une tâche de génération en arrière-plan"""
        def wrapper():
            try:
                task_func(job)
            except Exception as e:
                logger.error(f"Erreur job {job.job_id}: {e}")
                self.complete_job(job.job_id, success=False, error_message=str(e))
        
        thread = threading.Thread(target=wrapper, daemon=True)
        thread.start()
        logger.info(f"Job {job.job_id} lancé en arrière-plan")
    
    def get_thread_pool(self) -> ThreadPoolExecutor:
        """Retourne le pool de threads pour génération parallèle"""
        return self._thread_pool
    
    def get_stats(self) -> Dict:
        """Statistiques globales enrichies"""
        try:
            conn = _connect_postgres()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Stats des jobs
            cur.execute("""
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'running') as active_jobs,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
                    COUNT(*) as total_jobs,
                    COALESCE(SUM(total_items - completed_items) FILTER (WHERE status = 'running'), 0) as current_generations,
                    AVG(avg_generation_time_ms) FILTER (WHERE avg_generation_time_ms IS NOT NULL) as global_avg_gen_ms,
                    AVG(avg_skip_time_ms) FILTER (WHERE avg_skip_time_ms IS NOT NULL) as global_avg_skip_ms
                FROM generation_jobs
            """)
            row = cur.fetchone()
            cur.close()
            conn.close()
            
            return {
                "active_jobs": row['active_jobs'] or 0,
                "pending_jobs": row['pending_jobs'] or 0,
                "total_jobs_in_history": row['total_jobs'] or 0,
                "current_generations": int(row['current_generations'] or 0),
                "parallel_workers": MAX_PARALLEL_GENERATIONS,
                "cpu_count": _CPU_COUNT,
                "avg_generation_time_ms": int(row['global_avg_gen_ms']) if row['global_avg_gen_ms'] else None,
                "avg_skip_time_ms": int(row['global_avg_skip_ms']) if row['global_avg_skip_ms'] else None
            }
        except Exception as e:
            logger.error(f"Erreur stats jobs: {e}")
            return {
                "active_jobs": 0,
                "pending_jobs": 0,
                "total_jobs_in_history": 0,
                "current_generations": 0,
                "parallel_workers": MAX_PARALLEL_GENERATIONS,
                "cpu_count": _CPU_COUNT
            }
    
    def get_global_timing_stats(self) -> Dict:
        """Récupère les statistiques de timing globales"""
        try:
            conn = _connect_postgres()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            cur.execute("""
                SELECT 
                    operation_type,
                    COUNT(*) as count,
                    AVG(duration_ms)::INTEGER as avg_ms,
                    MIN(duration_ms) as min_ms,
                    MAX(duration_ms) as max_ms
                FROM generation_time_history
                WHERE created_at > NOW() - INTERVAL '24 hours'
                GROUP BY operation_type
            """)
            rows = cur.fetchall()
            cur.close()
            conn.close()
            
            return {row['operation_type']: dict(row) for row in rows}
        except Exception as e:
            logger.error(f"Erreur stats timing: {e}")
            return {}
    
    def cleanup_old_jobs(self, keep_days: int = 7):
        """Supprime les anciens jobs terminés"""
        try:
            conn = _connect_postgres()
            cur = conn.cursor()
            cur.execute("""
                DELETE FROM generation_jobs 
                WHERE status NOT IN ('pending', 'running')
                AND completed_at < NOW() - (%s || ' days')::INTERVAL
            """, (keep_days,))
            deleted = cur.rowcount
            conn.commit()
            cur.close()
            conn.close()
            
            if deleted > 0:
                logger.info(f"Nettoyage: {deleted} anciens jobs supprimés")
        except Exception as e:
            logger.error(f"Erreur nettoyage jobs: {e}")


def get_combination_hash(combination: Dict) -> str:
    """Génère un hash unique pour une combinaison de critères"""
    # Convertir les objets non-JSON-sérialisables en strings
    def serialize_value(v):
        if isinstance(v, datetime):
            return v.isoformat()
        return v
    
    clean_combo = {k: serialize_value(v) for k, v in combination.items()}
    combo_str = json.dumps(clean_combo, sort_keys=True, default=str)
    return hashlib.md5(combo_str.encode()).hexdigest()[:16]


# Singleton global
_job_manager: Optional[GenerationJobManager] = None


def get_job_manager() -> GenerationJobManager:
    """Retourne le gestionnaire de jobs singleton"""
    global _job_manager
    if _job_manager is None:
        _job_manager = GenerationJobManager()
    return _job_manager

"""
Rate Limiting pour API Museum Voice - MODE CPU-ONLY
- Rate limiting adaptatif avec sliding window
- Protection endpoints HTTP par IP et globale
- Optimisé pour VPS sans GPU
"""

import threading
import time
from typing import Dict, Any
import multiprocessing


# ===== CONFIGURATION DYNAMIQUE CPU-ONLY =====
_CPU_COUNT = multiprocessing.cpu_count()

# Configuration adaptative selon puissance CPU
if _CPU_COUNT >= 64:
    _MAX_PARALLEL_WORKERS = min(6, _CPU_COUNT // 16)
elif _CPU_COUNT >= 16:
    _MAX_PARALLEL_WORKERS = min(4, _CPU_COUNT // 8)
else:
    _MAX_PARALLEL_WORKERS = max(1, _CPU_COUNT // 4)

_REQUESTS_PER_MINUTE = _MAX_PARALLEL_WORKERS * 10


class AdaptiveRateLimiter:
    """
    Rate limiter adaptatif avec sliding window + backpressure
    S'ajuste automatiquement selon la charge
    """
    
    def __init__(self, base_requests: int = 60, window_seconds: int = 60):
        self.base_requests = base_requests
        self.max_requests = base_requests
        self.window_seconds = window_seconds
        self.requests = []
        self.lock = threading.Lock()
        
        # Métriques pour adaptation
        self.success_count = 0
        self.error_count = 0
        self.last_adaptation = time.time()
    
    def acquire(self, wait: bool = False) -> bool:
        """Retourne True si la requête peut passer"""
        with self.lock:
            now = time.time()
            # Nettoyer les anciennes requêtes
            self.requests = [t for t in self.requests if now - t < self.window_seconds]
            
            if len(self.requests) < self.max_requests:
                self.requests.append(now)
                return True
            
            if wait:
                # Calculer temps d'attente
                oldest = min(self.requests)
                wait_time = oldest + self.window_seconds - now
                return wait_time
            
            return False
    
    def wait_if_needed(self) -> float:
        """Attend si nécessaire, retourne temps d'attente"""
        wait_total = 0
        while True:
            result = self.acquire(wait=True)
            if result is True:
                return wait_total
            if isinstance(result, float) and result > 0:
                time.sleep(min(result, 1.0))  # Max 1s d'attente par itération
                wait_total += min(result, 1.0)
            else:
                time.sleep(0.1)
                wait_total += 0.1
    
    def report_success(self):
        """Signale une génération réussie"""
        with self.lock:
            self.success_count += 1
            self._maybe_adapt()
    
    def report_error(self):
        """Signale une erreur de génération"""
        with self.lock:
            self.error_count += 1
            self._maybe_adapt()
    
    def _maybe_adapt(self):
        """Adapte le rate limit selon les performances"""
        now = time.time()
        if now - self.last_adaptation < 60:  # Adapter toutes les minutes max
            return
        
        total = self.success_count + self.error_count
        if total < 10:  # Pas assez de données
            return
        
        error_rate = self.error_count / total
        
        if error_rate > 0.2:  # >20% erreurs -> réduire
            self.max_requests = max(self.base_requests // 2, self.max_requests - 10)
            print(f"⚠️ RateLimiter: réduction à {self.max_requests}/min (erreurs: {error_rate:.1%})")
        elif error_rate < 0.05 and self.max_requests < self.base_requests * 2:  # <5% erreurs -> augmenter
            self.max_requests = min(self.base_requests * 2, self.max_requests + 10)
            print(f"✅ RateLimiter: augmentation à {self.max_requests}/min")
        
        self.success_count = 0
        self.error_count = 0
        self.last_adaptation = now
    
    def get_stats(self) -> Dict[str, Any]:
        with self.lock:
            return {
                'current_limit': self.max_requests,
                'base_limit': self.base_requests,
                'active_requests': len(self.requests),
                'success_count': self.success_count,
                'error_count': self.error_count
            }


# ===== Statistiques système simplifiées =====

class GenerationStats:
    """Statistiques légères pour le système de génération (remplace GenerationQueue)"""
    
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
        self.max_workers = _MAX_PARALLEL_WORKERS
        self.stats = {
            'cpu_count': _CPU_COUNT,
            'max_workers': self.max_workers,
            'total_processed': 0,
            'avg_generation_time': 30.0
        }
        self.stats_lock = threading.Lock()
        self._initialized = True
        print(f"📊 GenerationStats: {self.max_workers} workers, CPU={_CPU_COUNT}")
    
    def get_stats(self) -> Dict[str, Any]:
        with self.stats_lock:
            return {**self.stats, 'queue_size': 0, 'priority_queue_size': 0}
    
    def get_estimated_wait_time(self) -> float:
        return self.stats.get('avg_generation_time', 30.0)


def get_generation_queue() -> GenerationStats:
    """Retourne les stats du système (compat avec ancien code)"""
    return GenerationStats()


# ===== Rate limiting pour endpoints HTTP =====

class EndpointRateLimiter:
    """
    Rate limiter adaptatif pour endpoints API
    - Limite par IP généreuse pour usage normal
    - Limite globale haute pour VPS puissant
    - Protection contre abus tout en permettant burst
    """
    
    def __init__(self):
        # Limite par IP: 20 requêtes par minute (burst autorisé)
        self.ip_limits: Dict[str, AdaptiveRateLimiter] = {}
        self.lock = threading.Lock()
        
        # Limite globale: basée sur capacité CPU
        # VPS 96 threads -> ~200 req/min global
        global_limit = min(300, _REQUESTS_PER_MINUTE * 2)
        self.global_limiter = AdaptiveRateLimiter(base_requests=global_limit, window_seconds=60)
        
        # Nettoyage périodique des IP inactives
        self._start_cleanup_thread()
        
        print(f"🛡️ EndpointRateLimiter: {global_limit}/min global, 20/min par IP")
    
    def _start_cleanup_thread(self):
        """Nettoie les limiteurs IP inutilisés"""
        def cleanup():
            while True:
                time.sleep(300)  # Toutes les 5 minutes
                with self.lock:
                    now = time.time()
                    to_remove = []
                    for ip, limiter in self.ip_limits.items():
                        if not limiter.requests or (now - max(limiter.requests)) > 300:
                            to_remove.append(ip)
                    for ip in to_remove:
                        del self.ip_limits[ip]
                    if to_remove:
                        print(f"🧹 Nettoyé {len(to_remove)} limiteurs IP inactifs")
        
        thread = threading.Thread(target=cleanup, daemon=True, name="RateLimiterCleanup")
        thread.start()
    
    def check_rate_limit(self, ip: str) -> tuple[bool, str]:
        """
        Vérifie si une requête peut passer.
        Returns: (allowed, error_message)
        """
        # Vérifier limite globale d'abord
        if not self.global_limiter.acquire():
            queue = get_generation_queue()
            wait_time = queue.get_estimated_wait_time()
            return False, f"Serveur occupé, réessayez dans ~{int(wait_time)}s"
        
        # Vérifier limite par IP
        with self.lock:
            if ip not in self.ip_limits:
                self.ip_limits[ip] = AdaptiveRateLimiter(base_requests=20, window_seconds=60)
        
        if not self.ip_limits[ip].acquire():
            return False, "Trop de requêtes depuis votre IP, attendez 30s"
        
        return True, ""
    
    def get_stats(self) -> Dict[str, Any]:
        """Retourne les stats du rate limiter"""
        with self.lock:
            return {
                'global': self.global_limiter.get_stats(),
                'active_ips': len(self.ip_limits)
            }
_endpoint_rate_limiter = None

def get_endpoint_rate_limiter() -> EndpointRateLimiter:
    global _endpoint_rate_limiter
    if _endpoint_rate_limiter is None:
        _endpoint_rate_limiter = EndpointRateLimiter()
    return _endpoint_rate_limiter

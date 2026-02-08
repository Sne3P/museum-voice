#!/usr/bin/env python3
"""
Script de test pour vérifier la parallélisation Ollama.
Lance plusieurs requêtes simultanées et mesure le temps.
"""

import os
import sys
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Configuration
OLLAMA_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434")
MODEL = os.getenv("OLLAMA_MODEL", "ministral-3:3b")
NUM_REQUESTS = int(os.getenv("NUM_REQUESTS", 12))  # Nombre de requêtes parallèles à tester
PROMPT = "Décris brièvement la Joconde en 2 phrases."

print(f"""
╔══════════════════════════════════════════════════════════════╗
║         TEST DE PARALLÉLISATION OLLAMA                       ║
╠══════════════════════════════════════════════════════════════╣
║ URL: {OLLAMA_URL:<52} ║
║ Modèle: {MODEL:<49} ║
║ Requêtes parallèles: {NUM_REQUESTS:<37} ║
╚══════════════════════════════════════════════════════════════╝
""")

# Compteur de requêtes actives
active_count = 0
active_lock = threading.Lock()
max_concurrent = 0

def make_request(request_id: int):
    """Fait une requête à Ollama et retourne le temps d'exécution."""
    global active_count, max_concurrent
    
    start = time.time()
    
    with active_lock:
        active_count += 1
        if active_count > max_concurrent:
            max_concurrent = active_count
        current_active = active_count
    
    print(f"[REQ {request_id:02d}] 🚀 Démarrage (actives: {current_active})")
    
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": MODEL,
                "messages": [{"role": "user", "content": f"{PROMPT} (req #{request_id})"}],
                "stream": False,
                "options": {
                    "num_predict": 100,  # Limiter la réponse
                    "num_gpu": 0,  # CPU only
                }
            },
            timeout=120
        )
        
        with active_lock:
            active_count -= 1
        
        duration = time.time() - start
        
        if response.status_code == 200:
            print(f"[REQ {request_id:02d}] ✅ OK en {duration:.2f}s")
            return {'id': request_id, 'duration': duration, 'success': True}
        else:
            print(f"[REQ {request_id:02d}] ❌ Erreur HTTP {response.status_code}")
            return {'id': request_id, 'duration': duration, 'success': False, 'error': response.status_code}
            
    except Exception as e:
        with active_lock:
            active_count -= 1
        duration = time.time() - start
        print(f"[REQ {request_id:02d}] ❌ Exception: {e}")
        return {'id': request_id, 'duration': duration, 'success': False, 'error': str(e)}


def main():
    global max_concurrent
    
    # Vérifier Ollama
    print("🔍 Vérification Ollama...")
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if r.status_code != 200:
            print(f"❌ Ollama non accessible: HTTP {r.status_code}")
            sys.exit(1)
        models = r.json().get('models', [])
        print(f"✅ Ollama OK - {len(models)} modèles disponibles")
    except Exception as e:
        print(f"❌ Ollama non accessible: {e}")
        sys.exit(1)
    
    # Test séquentiel d'abord (baseline)
    print("\n" + "="*60)
    print("📏 TEST 1: Requête SÉQUENTIELLE (baseline)")
    print("="*60)
    
    seq_start = time.time()
    result = make_request(0)
    seq_duration = result['duration']
    print(f"⏱️ Temps séquentiel: {seq_duration:.2f}s")
    
    # Test parallèle
    print("\n" + "="*60)
    print(f"🚀 TEST 2: {NUM_REQUESTS} requêtes PARALLÈLES")
    print("="*60)
    
    max_concurrent = 0
    parallel_start = time.time()
    
    with ThreadPoolExecutor(max_workers=NUM_REQUESTS) as executor:
        futures = [executor.submit(make_request, i+1) for i in range(NUM_REQUESTS)]
        results = [f.result() for f in as_completed(futures)]
    
    parallel_duration = time.time() - parallel_start
    
    # Analyse
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]
    avg_duration = sum(r['duration'] for r in successful) / len(successful) if successful else 0
    
    print("\n" + "="*60)
    print("📊 RÉSULTATS")
    print("="*60)
    print(f"✅ Réussies: {len(successful)}/{NUM_REQUESTS}")
    print(f"❌ Échouées: {len(failed)}/{NUM_REQUESTS}")
    print(f"⏱️ Temps total parallèle: {parallel_duration:.2f}s")
    print(f"⏱️ Temps moyen par requête: {avg_duration:.2f}s")
    print(f"🔥 Max requêtes simultanées: {max_concurrent}")
    
    # Calcul du speedup
    expected_sequential = seq_duration * NUM_REQUESTS
    speedup = expected_sequential / parallel_duration if parallel_duration > 0 else 0
    
    print(f"\n📈 PERFORMANCE:")
    print(f"   Temps séquentiel estimé: {expected_sequential:.2f}s")
    print(f"   Temps parallèle réel: {parallel_duration:.2f}s")
    print(f"   Speedup: {speedup:.2f}x")
    
    if speedup < 1.5:
        print("\n⚠️ ATTENTION: Speedup faible! Ollama ne semble pas traiter les requêtes en parallèle.")
        print("   Vérifiez que OLLAMA_NUM_PARALLEL est bien configuré et que le container est redémarré.")
    elif speedup < NUM_REQUESTS * 0.5:
        print(f"\n⚠️ Speedup modéré ({speedup:.1f}x sur {NUM_REQUESTS} workers possibles)")
        print("   La parallélisation fonctionne partiellement.")
    else:
        print(f"\n✅ Excellent! Parallélisation efficace ({speedup:.1f}x)")
    
    print("\n🎯 Recommandation:")
    print(f"   Pour utiliser tous les {os.cpu_count() or 'N/A'} CPU, configurez OLLAMA_NUM_PARALLEL={os.cpu_count()//2 if os.cpu_count() else 12}")


if __name__ == "__main__":
    main()

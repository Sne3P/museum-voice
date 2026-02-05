"""
Museum Voice Backend API - Flask + PostgreSQL + Ollama + Piper TTS
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sys
import os
import logging
from pathlib import Path
from typing import Dict, List
import psycopg2
import psycopg2.extras
import requests

# Configuration du logger
logger = logging.getLogger(__name__)

from .core.ollama_generation import OllamaMediationSystem
from .core.generation_queue import get_endpoint_rate_limiter

from .core.db_postgres import (
    init_postgres_db, get_artwork, get_all_artworks,
    search_artworks, add_artwork, add_artist, add_movement,
    get_artwork_sections, get_artwork_anecdotes,
    add_section, add_anecdote,
    _connect_postgres, get_criteres
)

from .core.pregeneration_db import (
    add_pregeneration, get_pregeneration,
    get_artwork_pregenerations, get_pregeneration_stats
)

from .model_pdf_processor import ModelCompliantPDFProcessor
from .tts.routes import tts_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(tts_bp)

# Rate limiter pour endpoints de génération
rate_limiter = get_endpoint_rate_limiter()

print("🔄 Initialisation PostgreSQL...")
try:
    init_postgres_db()
    print("✅ PostgreSQL prêt")
except Exception as e:
    print(f"⚠️ Erreur PostgreSQL: {e}")


# ===== HEALTHCHECK =====

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'museum-backend',
        'database': 'postgresql'
    })


@app.route('/api/generation/stats', methods=['GET'])
def generation_stats():
    """Statistiques détaillées du système de génération"""
    from .core.generation_queue import get_generation_queue, get_endpoint_rate_limiter
    import multiprocessing
    try:
        queue = get_generation_queue()
        rate_limiter = get_endpoint_rate_limiter()
        
        # Infos CPU
        cpu_count = multiprocessing.cpu_count()
        
        return jsonify({
            'success': True,
            'system': {
                'cpu_count': cpu_count,
                'cpu_description': f'{cpu_count} threads disponibles'
            },
            'queue': queue.get_stats(),
            'rate_limiter': rate_limiter.get_stats(),
            'config': {
                'parallel_requests': queue.max_workers,
                'estimated_wait': queue.get_estimated_wait_time()
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== FICHIERS STATIQUES =====

@app.route('/uploads/<path:filepath>')
def serve_uploads(filepath):
    try:
        return send_from_directory('/app/uploads', filepath)
    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404


# ===== API CRITÈRES =====

@app.route('/api/criteria-types', methods=['GET'])
def get_criteria_types_legacy():
    """Compat client React: retourne les types de critères"""
    try:
        from .core.criteria_service import criteria_service
        types = criteria_service.get_criteria_types()
        adapted = [{
            'type_id': t['type_id'],
            'type_name': t['type'],
            'label': t['label'],
            'description': t['description'],
            'ordre': t['ordre']
        } for t in types]
        return jsonify({'success': True, 'types': adapted})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/criterias', methods=['GET'])
def get_criterias_query():
    """GET /api/criterias?type=age - Liste des paramètres pour un type"""
    try:
        type_name = request.args.get('type')
        if not type_name:
            return jsonify({'success': False, 'error': 'type query param requis'}), 400
        from .core.criteria_service import criteria_service
        criterias = criteria_service.get_criteria_by_type(type_name)
        return jsonify({'success': True, 'criterias': criterias})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/criterias/types', methods=['GET'])
def get_criteria_types():
    try:
        from .core.criteria_service import criteria_service
        return jsonify({
            'success': True,
            'criteria_types': criteria_service.get_criteria_types()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/criterias/by-type/<string:type_name>', methods=['GET'])
def get_criterias_by_type(type_name):
    try:
        from .core.criteria_service import criteria_service
        criterias = criteria_service.get_criteria_by_type(type_name)
        return jsonify({
            'success': True,
            'type': type_name,
            'criterias': criterias,
            'count': len(criterias)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/criterias/all', methods=['GET'])
def get_all_criterias():
    try:
        from .core.criteria_service import criteria_service
        criteria_types = criteria_service.get_criteria_types()
        result = []
        for ctype in criteria_types:
            criterias = criteria_service.get_criteria_by_type(ctype['type'])
            result.append({
                'type_id': ctype['type_id'],
                'type': ctype['type'],
                'label': ctype['label'],
                'description': ctype['description'],
                'ordre': ctype['ordre'],
                'options': criterias
            })
        return jsonify({
            'success': True,
            'criteria_groups': result,
            'total_types': len(result),
            'total_criterias': sum(len(g['options']) for g in result)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/criterias/clear-cache', methods=['POST'])
def clear_criteria_cache():
    try:
        from .core.criteria_service import criteria_service
        criteria_service.clear_cache()
        return jsonify({'success': True, 'message': 'Cache invalidé'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== API OEUVRES =====

@app.route('/api/artworks', methods=['GET'])
def get_artworks_list():
    try:
        artworks = get_all_artworks()
        return jsonify({'success': True, 'count': len(artworks), 'artworks': artworks})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/artworks/<int:artwork_id>', methods=['GET'])
def get_artwork_details(artwork_id):
    try:
        artwork = get_artwork(artwork_id)
        if not artwork:
            return jsonify({'success': False, 'error': 'Œuvre non trouvée'}), 404
        sections = get_artwork_sections(artwork_id)
        anecdotes = get_artwork_anecdotes(artwork_id)
        return jsonify({
            'success': True,
            'artwork': artwork,
            'sections': sections,
            'anecdotes': anecdotes
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/artworks/search', methods=['GET'])
def search_artworks_api():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'success': False, 'error': 'Paramètre de recherche manquant'}), 400
    try:
        results = search_artworks(query)
        return jsonify({'success': True, 'query': query, 'count': len(results), 'results': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/artworks', methods=['POST'])
def create_artwork():
    try:
        data = request.get_json()
        if not data.get('title') or not data.get('artist'):
            return jsonify({'success': False, 'error': 'Titre et artiste requis'}), 400
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
        return jsonify({'success': True, 'oeuvre_id': oeuvre_id}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== API PREGENERATIONS =====

@app.route('/api/pregenerations/stats', methods=['GET'])
def pregenerations_stats():
    try:
        stats = get_pregeneration_stats()
        return jsonify({'success': True, 'stats': stats})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pregenerations/<int:oeuvre_id>', methods=['GET'])
def get_artwork_pregen(oeuvre_id):
    try:
        pregenerations = get_artwork_pregenerations(oeuvre_id)
        return jsonify({
            'success': True,
            'oeuvre_id': oeuvre_id,
            'count': len(pregenerations),
            'pregenerations': pregenerations
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pregenerations', methods=['POST'])
def create_pregeneration():
    try:
        from .core.criteria_service import criteria_service
        data = request.get_json()
        
        required = ['oeuvre_id', 'criteria', 'pregeneration_text']
        for field in required:
            if field not in data:
                return jsonify({'success': False, 'error': f'Champ requis: {field}'}), 400
        
        criteria_dict = data['criteria']
        if not isinstance(criteria_dict, dict):
            return jsonify({'success': False, 'error': 'criteria doit être un objet {type: id}'}), 400
        
        is_valid, missing = criteria_service.validate_all_criteria(criteria_dict)
        if not is_valid:
            return jsonify({'success': False, 'error': f'Critères manquants: {", ".join(missing)}'}), 400
        
        if not criteria_service.validate_criteria_combination(criteria_dict):
            return jsonify({'success': False, 'error': 'Combinaison de critères invalide'}), 400
        
        pregeneration_id = add_pregeneration(
            oeuvre_id=data['oeuvre_id'],
            criteria_dict=criteria_dict,
            pregeneration_text=data['pregeneration_text'],
            voice_link=data.get('voice_link')
        )
        return jsonify({'success': True, 'pregeneration_id': pregeneration_id}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== API TRAITEMENT PDF =====

@app.route('/api/pdf/extract-metadata', methods=['POST'])
def extract_pdf_metadata():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'Aucun fichier fourni'}), 400
        
        file = request.files['file']
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            return jsonify({'success': False, 'error': 'Fichier PDF requis'}), 400
        
        pdf_path = request.form.get('pdf_path')
        if not pdf_path:
            return jsonify({'success': False, 'error': 'Chemin PDF requis'}), 400
        
        full_path = f"/app{pdf_path}"
        if not os.path.exists(full_path):
            return jsonify({'success': False, 'error': f'Fichier non trouvé: {full_path}'}), 404
        
        processor = ModelCompliantPDFProcessor()
        text = processor.extract_text_from_pdf(full_path)
        if not text:
            return jsonify({'success': False, 'error': 'Impossible d\'extraire le texte'}), 400
        
        metadata = {}
        for field in processor.patterns.keys():
            value = processor.extract_field(text, field)
            if value:
                metadata[field] = value
        
        anecdotes = processor.extract_anecdotes(text)
        
        return jsonify({
            'success': True,
            'metadata': {
                'title': metadata.get('titre', ''),
                'artist': metadata.get('artiste', ''),
                'lieu_naissance': metadata.get('lieu_naissance', ''),
                'date_oeuvre': metadata.get('date_oeuvre', ''),
                'materiaux': metadata.get('materiaux', ''),
                'mouvement': metadata.get('mouvement', ''),
                'provenance': metadata.get('provenance', ''),
                'contexte': metadata.get('contexte', ''),
                'description': metadata.get('description', ''),
                'analyse': metadata.get('analyse', ''),
                'iconographie': metadata.get('iconographie', ''),
                'reception': metadata.get('reception', ''),
                'parcours': metadata.get('parcours', ''),
                'anecdotes': anecdotes
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== API PRÉGÉNÉRATION OLLAMA =====

# Import du gestionnaire de jobs
from .core.generation_jobs import get_job_manager, JobStatus, get_combination_hash
import time as time_module
from concurrent.futures import ThreadPoolExecutor, as_completed

@app.route('/api/pregenerate-artwork/<int:oeuvre_id>', methods=['POST'])
def pregenerate_single_artwork(oeuvre_id):
    # Rate limiting
    client_ip = request.remote_addr or '0.0.0.0'
    allowed, error_msg = rate_limiter.check_rate_limit(client_ip)
    if not allowed:
        return jsonify({'success': False, 'error': error_msg}), 429
    
    try:
        data = request.get_json() or {}
        system = OllamaMediationSystem()
        all_criteres = get_criteres()
        result = system.pregenerate_artwork(
            oeuvre_id=oeuvre_id,
            artwork=get_artwork(oeuvre_id),
            combinaisons=system.generate_combinaisons(all_criteres),
            model="ministral-3:3b",
            force_regenerate=data.get('force_regenerate', False)
        )
        
        if result.get('success'):
            stats = result.get('stats', {})
            return jsonify({
                'success': True,
                'oeuvre_id': oeuvre_id,
                'title': result.get('title'),
                'stats': stats,
                'duration': result.get('duration'),
                'message': f"{stats.get('generated', 0)} narrations générées"
            })
        return jsonify({'success': False, 'error': result.get('error')}), 500
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pregenerate-all', methods=['POST'])
def pregenerate_all_artworks():
    # Rate limiting plus strict pour génération globale
    client_ip = request.remote_addr or '0.0.0.0'
    allowed, error_msg = rate_limiter.check_rate_limit(client_ip)
    if not allowed:
        return jsonify({'success': False, 'error': error_msg}), 429
    
    try:
        import time
        start_time = time.time()
        data = request.get_json() or {}
        force_regenerate = data.get('force_regenerate', False)
        
        conn = _connect_postgres()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT oeuvre_id FROM oeuvres ORDER BY oeuvre_id")
        oeuvres = cur.fetchall()
        cur.close()
        conn.close()
        
        if not oeuvres:
            return jsonify({'success': False, 'error': 'Aucune œuvre trouvée'}), 404
        
        system = OllamaMediationSystem()
        all_criteres = get_criteres()
        combinaisons = system.generate_combinaisons(all_criteres)
        
        total_stats = {
            'total_oeuvres': len(oeuvres),
            'total_generated': 0,
            'total_skipped': 0,
            'total_errors': 0,
            'oeuvres_processed': 0
        }
        
        for idx, oeuvre_row in enumerate(oeuvres):
            oeuvre_id = oeuvre_row['oeuvre_id']
            try:
                artwork = get_artwork(oeuvre_id)
                if not artwork:
                    total_stats['total_errors'] += 1
                    continue
                
                result = system.pregenerate_artwork(
                    oeuvre_id=oeuvre_id,
                    artwork=artwork,
                    combinaisons=combinaisons,
                    model="ministral-3:3b",
                    force_regenerate=force_regenerate
                )
                
                if result.get('success'):
                    stats = result.get('stats', {})
                    total_stats['total_generated'] += stats.get('generated', 0)
                    total_stats['total_skipped'] += stats.get('skipped', 0)
                    total_stats['oeuvres_processed'] += 1
                else:
                    total_stats['total_errors'] += 1
            except Exception:
                total_stats['total_errors'] += 1
        
        duration = time.time() - start_time
        return jsonify({
            'success': True,
            'stats': total_stats,
            'duration': f"{int(duration // 60)}m {int(duration % 60)}s"
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== API JOBS DE GÉNÉRATION ASYNCHRONE =====

@app.route('/api/generation/jobs', methods=['GET'])
def get_generation_jobs():
    """Liste tous les jobs de génération (actifs et historique)"""
    try:
        job_manager = get_job_manager()
        active_jobs = [j.to_dict() for j in job_manager.get_active_jobs()]
        all_jobs = [j.to_dict() for j in job_manager.get_all_jobs(limit=20)]
        stats = job_manager.get_stats()
        
        return jsonify({
            'success': True,
            'active_jobs': active_jobs,
            'recent_jobs': all_jobs,
            'stats': stats
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/generation/jobs/<string:job_id>', methods=['GET'])
def get_generation_job(job_id):
    """Récupère le statut d'un job spécifique"""
    try:
        job_manager = get_job_manager()
        job = job_manager.get_job(job_id)
        
        if not job:
            return jsonify({'success': False, 'error': 'Job non trouvé'}), 404
        
        return jsonify({
            'success': True,
            'job': job.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/generation/jobs/<string:job_id>/cancel', methods=['POST'])
def cancel_generation_job(job_id):
    """Annule un job (même en cours avec force=true)"""
    try:
        data = request.get_json() or {}
        force = data.get('force', False)
        
        job_manager = get_job_manager()
        cancelled = job_manager.cancel_job(job_id, force=force)
        
        if cancelled:
            return jsonify({'success': True, 'message': 'Job annulé'})
        return jsonify({'success': False, 'error': 'Impossible d\'annuler ce job (déjà terminé ou inexistant)'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/generation/jobs/cancel-all', methods=['POST'])
def cancel_all_generation_jobs():
    """Annule tous les jobs en cours ou en attente"""
    try:
        job_manager = get_job_manager()
        cancelled = job_manager.cancel_all_running_jobs()
        
        return jsonify({
            'success': True, 
            'message': f'{cancelled} job(s) annulé(s)',
            'cancelled_count': cancelled
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/generation/async/all', methods=['POST'])
def start_async_pregenerate_all():
    """Lance la prégénération de toutes les œuvres en arrière-plan avec parallélisation"""
    try:
        data = request.get_json() or {}
        force_regenerate = data.get('force_regenerate', False)
        
        job_manager = get_job_manager()
        
        # Vérifier qu'il n'y a pas déjà un job "all" en cours
        active = job_manager.get_active_jobs()
        if any(j.job_type == 'all' for j in active):
            return jsonify({
                'success': False, 
                'error': 'Une génération globale est déjà en cours'
            }), 409
        
        # Créer le job
        job = job_manager.create_job('all', {'force_regenerate': force_regenerate})
        
        # Définir la tâche de génération avec parallélisation
        def run_generation(job):
            import threading
            
            try:
                conn = _connect_postgres()
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute("SELECT oeuvre_id, title FROM oeuvres ORDER BY oeuvre_id")
                oeuvres = cur.fetchall()
                cur.close()
                conn.close()
                
                if not oeuvres:
                    job_manager.complete_job(job.job_id, success=False, error_message="Aucune œuvre trouvée")
                    return
                
                system = OllamaMediationSystem()
                all_criteres = get_criteres()
                combinaisons = system.generate_combinaisons(all_criteres)
                
                # Créer la liste de toutes les tâches à effectuer
                tasks = []
                for oeuvre_row in oeuvres:
                    oeuvre_id = oeuvre_row['oeuvre_id']
                    title = oeuvre_row.get('title', f'Œuvre {oeuvre_id}')
                    artwork = get_artwork(oeuvre_id)
                    if artwork:
                        for combo in combinaisons:
                            tasks.append({
                                'oeuvre_id': oeuvre_id,
                                'title': title,
                                'artwork': artwork,
                                'combination': combo
                            })
                
                total_tasks = len(tasks)
                job_manager.start_job(job.job_id, total_tasks)
                
                # Compteurs thread-safe
                stats_lock = threading.Lock()
                stats = {'completed': 0, 'generated': 0, 'skipped': 0, 'errors': 0}
                
                def process_single_task(task):
                    """Traite une seule combinaison"""
                    start_time = time_module.time()
                    result_type = 'error'
                    
                    try:
                        result = system.pregenerate_single_combination(
                            oeuvre_id=task['oeuvre_id'],
                            artwork=task['artwork'],
                            combination=task['combination'],
                            model="ministral-3:3b",
                            force_regenerate=force_regenerate
                        )
                        
                        if result.get('generated'):
                            result_type = 'generate'
                        elif result.get('skipped'):
                            result_type = 'skip'
                    except Exception as e:
                        logger.error(f"Erreur génération: {e}")
                    
                    duration_ms = int((time_module.time() - start_time) * 1000)
                    
                    # Enregistrer le timing
                    try:
                        combo_hash = get_combination_hash(task['combination'])
                        job_manager.record_timing(
                            job.job_id, result_type, duration_ms,
                            task['oeuvre_id'], combo_hash
                        )
                        logger.debug(f"Timing enregistré: {result_type} - {duration_ms}ms")
                    except Exception as timing_error:
                        logger.error(f"Erreur enregistrement timing: {timing_error}")
                    
                    return result_type, task['title']
                
                # Utiliser ThreadPoolExecutor pour paralléliser
                pool = job_manager.get_thread_pool()
                futures = {pool.submit(process_single_task, task): task for task in tasks}
                
                for future in as_completed(futures):
                    task = futures[future]
                    try:
                        result_type, title = future.result()
                        
                        with stats_lock:
                            stats['completed'] += 1
                            if result_type == 'generate':
                                stats['generated'] += 1
                            elif result_type == 'skip':
                                stats['skipped'] += 1
                            else:
                                stats['errors'] += 1
                            
                            # Mettre à jour la progression
                            job_manager.update_job_progress(
                                job.job_id,
                                completed_items=stats['completed'],
                                current_item=f"{title} ({stats['completed']}/{total_tasks})",
                                generated=stats['generated'],
                                skipped=stats['skipped'],
                                errors=stats['errors']
                            )
                    except Exception:
                        with stats_lock:
                            stats['completed'] += 1
                            stats['errors'] += 1
                
                job_manager.complete_job(job.job_id, success=True)
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                job_manager.complete_job(job.job_id, success=False, error_message=str(e))
        
        # Lancer en arrière-plan
        job_manager.run_async(job, run_generation)
        
        return jsonify({
            'success': True,
            'job_id': job.job_id,
            'message': 'Génération lancée en arrière-plan',
            'job': job.to_dict()
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/generation/async/artwork/<int:oeuvre_id>', methods=['POST'])
def start_async_pregenerate_artwork(oeuvre_id):
    """Lance la prégénération d'une œuvre en arrière-plan avec métriques de temps"""
    try:
        data = request.get_json() or {}
        force_regenerate = data.get('force_regenerate', False)
        
        job_manager = get_job_manager()
        
        # Vérifier que l'œuvre existe
        artwork = get_artwork(oeuvre_id)
        if not artwork:
            return jsonify({'success': False, 'error': 'Œuvre non trouvée'}), 404
        
        # Créer le job
        job = job_manager.create_job('artwork', {
            'oeuvre_id': oeuvre_id,
            'title': artwork.get('title', f'Œuvre {oeuvre_id}'),
            'force_regenerate': force_regenerate
        })
        
        def run_generation(job):
            import threading
            
            try:
                system = OllamaMediationSystem()
                all_criteres = get_criteres()
                combinaisons = system.generate_combinaisons(all_criteres)
                
                job_manager.start_job(job.job_id, len(combinaisons))
                
                # Compteurs thread-safe
                stats_lock = threading.Lock()
                stats = {'completed': 0, 'generated': 0, 'skipped': 0, 'errors': 0}
                
                def process_single_combo(combo, idx):
                    """Traite une seule combinaison"""
                    start_time = time_module.time()
                    result_type = 'error'
                    
                    try:
                        result = system.pregenerate_single_combination(
                            oeuvre_id=oeuvre_id,
                            artwork=artwork,
                            combination=combo,
                            model="ministral-3:3b",
                            force_regenerate=force_regenerate
                        )
                        
                        if result.get('generated'):
                            result_type = 'generate'
                        elif result.get('skipped'):
                            result_type = 'skip'
                    except Exception as e:
                        logger.error(f"Erreur génération combo {idx}: {e}")
                    
                    duration_ms = int((time_module.time() - start_time) * 1000)
                    
                    # Enregistrer le timing
                    try:
                        combo_hash = get_combination_hash(combo)
                        job_manager.record_timing(
                            job.job_id, result_type, duration_ms,
                            oeuvre_id, combo_hash
                        )
                        logger.debug(f"Timing enregistré: {result_type} - {duration_ms}ms")
                    except Exception as timing_error:
                        logger.error(f"Erreur enregistrement timing: {timing_error}")
                    
                    return result_type, idx
                
                # Utiliser ThreadPoolExecutor pour paralléliser
                pool = job_manager.get_thread_pool()
                futures = {pool.submit(process_single_combo, combo, idx): idx 
                          for idx, combo in enumerate(combinaisons)}
                
                total = len(combinaisons)
                for future in as_completed(futures):
                    idx = futures[future]
                    try:
                        result_type, _ = future.result()
                        
                        with stats_lock:
                            stats['completed'] += 1
                            if result_type == 'generate':
                                stats['generated'] += 1
                            elif result_type == 'skip':
                                stats['skipped'] += 1
                            else:
                                stats['errors'] += 1
                            
                            job_manager.update_job_progress(
                                job.job_id,
                                completed_items=stats['completed'],
                                current_item=f"Combinaison {stats['completed']}/{total}",
                                generated=stats['generated'],
                                skipped=stats['skipped'],
                                errors=stats['errors']
                            )
                    except Exception:
                        with stats_lock:
                            stats['completed'] += 1
                            stats['errors'] += 1
                
                job_manager.complete_job(job.job_id, success=True)
                
            except Exception as e:
                job_manager.complete_job(job.job_id, success=False, error_message=str(e))
        
        job_manager.run_async(job, run_generation)
        
        return jsonify({
            'success': True,
            'job_id': job.job_id,
            'message': f'Génération de "{artwork.get("title")}" lancée',
            'job': job.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/generation/async/profile', methods=['POST'])
def start_async_pregenerate_profile():
    """Lance la prégénération pour un profil (combinaison) sur toutes les œuvres - AVEC PARALLELISATION"""
    try:
        data = request.get_json() or {}
        criteria_combination = data.get('criteria_combination')
        force_regenerate = data.get('force_regenerate', False)
        
        if not criteria_combination:
            return jsonify({'success': False, 'error': 'criteria_combination requis'}), 400
        
        # ENRICHIR les critères: convertir IDs en objets complets avec name/description
        all_criteres = get_criteres()
        combinaison_enrichie = {}
        for crit_type, crit_id in criteria_combination.items():
            critere = next((c for c in all_criteres.get(crit_type, []) if c['criteria_id'] == crit_id), None)
            if critere:
                combinaison_enrichie[crit_type] = critere
            else:
                return jsonify({'success': False, 'error': f'Critère invalide: {crit_type}={crit_id}'}), 400
        
        job_manager = get_job_manager()
        
        # Créer le job avec les IDs pour le stockage
        job = job_manager.create_job('profile', {
            'criteria_combination': criteria_combination,  # IDs pour stockage
            'force_regenerate': force_regenerate
        })
        
        def run_generation(job):
            import threading
            
            try:
                conn = _connect_postgres()
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute("SELECT oeuvre_id, title FROM oeuvres ORDER BY oeuvre_id")
                oeuvres = cur.fetchall()
                cur.close()
                conn.close()
                
                if not oeuvres:
                    job_manager.complete_job(job.job_id, success=False, error_message="Aucune œuvre")
                    return
                
                system = OllamaMediationSystem()
                total_oeuvres = len(oeuvres)
                job_manager.start_job(job.job_id, total_oeuvres)
                
                # Compteurs thread-safe
                stats_lock = threading.Lock()
                stats = {'completed': 0, 'generated': 0, 'skipped': 0, 'errors': 0}
                
                def process_single_oeuvre(oeuvre_row):
                    """Traite une seule œuvre pour ce profil"""
                    oeuvre_id = oeuvre_row['oeuvre_id']
                    title = oeuvre_row.get('title', f'Œuvre {oeuvre_id}')
                    
                    start_time = time_module.time()
                    result_type = 'error'
                    
                    try:
                        artwork = get_artwork(oeuvre_id)
                        if not artwork:
                            return 'error', title
                        
                        # Utiliser la combinaison ENRICHIE (avec name/description)
                        result = system.pregenerate_single_combination(
                            oeuvre_id=oeuvre_id,
                            artwork=artwork,
                            combination=combinaison_enrichie,  # Enrichie avec name/description
                            model="ministral-3:3b",
                            force_regenerate=force_regenerate
                        )
                        
                        if result.get('generated'):
                            result_type = 'generate'
                        elif result.get('skipped'):
                            result_type = 'skip'
                    except Exception as e:
                        logger.error(f"Erreur génération profil pour œuvre {oeuvre_id}: {e}")
                    
                    duration_ms = int((time_module.time() - start_time) * 1000)
                    
                    # Enregistrer le timing - ESSENTIEL pour l'estimation du temps
                    try:
                        combo_hash = get_combination_hash(combinaison_enrichie)
                        job_manager.record_timing(
                            job.job_id, result_type, duration_ms,
                            oeuvre_id, combo_hash
                        )
                        logger.debug(f"[Profile] Timing enregistré: {result_type} - {duration_ms}ms pour {title}")
                    except Exception as timing_error:
                        logger.error(f"Erreur enregistrement timing: {timing_error}")
                    
                    return result_type, title
                
                # Utiliser ThreadPoolExecutor pour paralléliser (comme les autres routes)
                pool = job_manager.get_thread_pool()
                futures = {pool.submit(process_single_oeuvre, oeuvre_row): oeuvre_row for oeuvre_row in oeuvres}
                
                for future in as_completed(futures):
                    oeuvre_row = futures[future]
                    try:
                        result_type, title = future.result()
                        
                        with stats_lock:
                            stats['completed'] += 1
                            if result_type == 'generate':
                                stats['generated'] += 1
                            elif result_type == 'skip':
                                stats['skipped'] += 1
                            else:
                                stats['errors'] += 1
                            
                            job_manager.update_job_progress(
                                job.job_id,
                                completed_items=stats['completed'],
                                current_item=f"{title} ({stats['completed']}/{total_oeuvres})",
                                generated=stats['generated'],
                                skipped=stats['skipped'],
                                errors=stats['errors']
                            )
                    except Exception:
                        with stats_lock:
                            stats['completed'] += 1
                            stats['errors'] += 1
                
                job_manager.complete_job(job.job_id, success=True)
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                job_manager.complete_job(job.job_id, success=False, error_message=str(e))
        
        job_manager.run_async(job, run_generation)
        
        return jsonify({
            'success': True,
            'job_id': job.job_id,
            'message': 'Génération par profil lancée',
            'job': job.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/generation/async/single', methods=['POST'])
def start_async_pregenerate_single():
    """
    Lance la génération d'UNE SEULE narration (1 œuvre + 1 profil) via le système de jobs.
    Permet de ne pas interrompre les autres jobs en cours.
    """
    try:
        data = request.get_json() or {}
        oeuvre_id = data.get('oeuvre_id')
        criteria_combination = data.get('criteria_combination')
        force_regenerate = data.get('force_regenerate', True)  # Par défaut on force pour régénérer
        
        if not oeuvre_id or not criteria_combination:
            return jsonify({'success': False, 'error': 'oeuvre_id et criteria_combination requis'}), 400
        
        # Vérifier que l'œuvre existe
        artwork = get_artwork(oeuvre_id)
        if not artwork:
            return jsonify({'success': False, 'error': 'Œuvre non trouvée'}), 404
        
        # ENRICHIR les critères: convertir IDs en objets complets avec name/description
        all_criteres = get_criteres()
        combinaison_enrichie = {}
        for crit_type, crit_id in criteria_combination.items():
            critere = next((c for c in all_criteres.get(crit_type, []) if c['criteria_id'] == crit_id), None)
            if critere:
                combinaison_enrichie[crit_type] = critere
            else:
                return jsonify({'success': False, 'error': f'Critère invalide: {crit_type}={crit_id}'}), 400
        
        job_manager = get_job_manager()
        
        # Créer le job pour 1 seule narration
        job = job_manager.create_job('single', {
            'oeuvre_id': oeuvre_id,
            'title': artwork.get('title', f'Œuvre {oeuvre_id}'),
            'criteria_combination': criteria_combination,  # IDs pour stockage
            'force_regenerate': force_regenerate
        })
        
        def run_generation(job):
            try:
                system = OllamaMediationSystem()
                job_manager.start_job(job.job_id, 1)  # 1 seul item
                
                job_manager.update_job_progress(
                    job.job_id, 
                    current_item=f"{artwork.get('title', 'Œuvre')} (1/1)"
                )
                
                start_time = time_module.time()
                
                # Utiliser la combinaison ENRICHIE
                result = system.pregenerate_single_combination(
                    oeuvre_id=oeuvre_id,
                    artwork=artwork,
                    combination=combinaison_enrichie,
                    model="ministral-3:3b",
                    force_regenerate=force_regenerate
                )
                
                duration_ms = int((time_module.time() - start_time) * 1000)
                
                generated = 0
                skipped = 0
                errors = 0
                
                if result.get('generated'):
                    generated = 1
                    job_manager.record_timing(job.job_id, 'generate', duration_ms, oeuvre_id)
                elif result.get('skipped'):
                    skipped = 1
                    job_manager.record_timing(job.job_id, 'skip', duration_ms, oeuvre_id)
                else:
                    errors = 1
                
                job_manager.update_job_progress(
                    job.job_id,
                    completed_items=1,
                    generated=generated,
                    skipped=skipped,
                    errors=errors
                )
                
                job_manager.complete_job(job.job_id, success=True)
                
            except Exception as e:
                logger.error(f"Erreur génération single: {e}")
                job_manager.complete_job(job.job_id, success=False, error_message=str(e))
        
        job_manager.run_async(job, run_generation)
        
        return jsonify({
            'success': True,
            'job_id': job.job_id,
            'message': f'Génération de 1 narration lancée',
            'job': job.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== API PARCOURS =====

@app.route('/api/parcours/generate', methods=['POST'])
def generate_intelligent_parcours():
    try:
        from .parcours.intelligent_parcours_v3 import generate_parcours_v3
        from .core.criteria_service import criteria_service
        from .tts import get_piper_service
        import time
        
        data = request.get_json()
        criteria_names = data.get('criteria')
        
        if not criteria_names or not isinstance(criteria_names, dict):
            return jsonify({'success': False, 'error': 'criteria requis (objet {type: name})'}), 400
        
        criteria_dict = {}
        for type_name, criteria_name in criteria_names.items():
            criteria = criteria_service.get_criteria_by_name(type_name, criteria_name)
            if not criteria:
                return jsonify({'success': False, 'error': f'Critère invalide: {type_name}={criteria_name}'}), 400
            criteria_dict[type_name] = criteria['criteria_id']
        
        is_valid, missing = criteria_service.validate_all_criteria(criteria_dict)
        if not is_valid:
            return jsonify({'success': False, 'error': f'Critères manquants: {", ".join(missing)}'}), 400
        
        target_duration = data.get('target_duration_minutes', 60)
        variation_seed = data.get('variation_seed')
        generate_audio = data.get('generate_audio', True)
        
        parcours_json = generate_parcours_v3(
            profile=criteria_dict,
            target_duration_min=target_duration,
            seed=variation_seed
        )
        
        audio_result = {'generated': False, 'count': 0, 'paths': {}}
        
        if generate_audio:
            try:
                parcours_id = parcours_json.get('metadata', {}).get('unique_parcours_id', variation_seed or int(time.time() * 1000))
                narrations = [{'oeuvre_id': a['oeuvre_id'], 'narration_text': a['narration']} for a in parcours_json.get('artworks', [])]
                
                piper = get_piper_service('fr_FR')
                audio_results = piper.generate_parcours_audio(
                    parcours_id=parcours_id,
                    narrations=narrations,
                    language='fr_FR'
                )
                
                for artwork in parcours_json.get('artworks', []):
                    oeuvre_id = artwork['oeuvre_id']
                    if oeuvre_id in audio_results:
                        audio_data = audio_results[oeuvre_id]
                        artwork['audio_path'] = audio_data['path']
                        artwork['narration_duration'] = audio_data['duration_seconds']
                
                total_narration = sum(a.get('narration_duration', 0) for a in parcours_json['artworks']) / 60
                breakdown = parcours_json['metadata']['duration_breakdown']
                breakdown['narration_minutes'] = total_narration
                breakdown['total_minutes'] = total_narration + breakdown['walking_minutes'] + breakdown['observation_minutes']
                parcours_json['estimated_duration_min'] = breakdown['total_minutes']
                
                audio_result = {
                    'generated': True,
                    'count': len(audio_results),
                    'paths': {k: v['path'] for k, v in audio_results.items()},
                    'durations': {k: v['duration_seconds'] for k, v in audio_results.items()}
                }
            except Exception as audio_error:
                audio_result['error'] = str(audio_error)
        
        return jsonify({'success': True, 'parcours': parcours_json, 'audio': audio_result})
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/parcours/map', methods=['POST'])
def get_parcours_map():
    try:
        data = request.get_json()
        artworks_input = data.get('artworks', [])
        
        if not artworks_input:
            return jsonify({'success': False, 'error': 'No artworks provided'}), 400
        
        conn = _connect_postgres()
        cur = conn.cursor()
        
        oeuvre_ids = [a['oeuvre_id'] for a in artworks_input]
        order_map = {a['oeuvre_id']: a['order'] for a in artworks_input}
        
        cur.execute("""
            SELECT o.oeuvre_id, o.title, o.artist, o.room,
                   AVG(p.x) as center_x, AVG(p.y) as center_y
            FROM oeuvres o
            LEFT JOIN entities e ON e.oeuvre_id = o.oeuvre_id AND e.entity_type = 'ARTWORK'
            LEFT JOIN points p ON p.entity_id = e.entity_id
            WHERE o.oeuvre_id = ANY(%s)
            GROUP BY o.oeuvre_id, o.title, o.artist, o.room
        """, (oeuvre_ids,))
        
        artworks_data = []
        for row in cur.fetchall():
            artworks_data.append({
                'oeuvre_id': row['oeuvre_id'],
                'title': row['title'],
                'artist': row['artist'],
                'room': row['room'],
                'x': float(row['center_x']) if row['center_x'] else 100.0,
                'y': float(row['center_y']) if row['center_y'] else 100.0,
                'order': order_map.get(row['oeuvre_id'], 0)
            })
        
        cur.execute("""
            SELECT e.entity_id, e.name, p.x, p.y, p.ordre
            FROM entities e
            JOIN points p ON e.entity_id = p.entity_id
            WHERE e.entity_type = 'ROOM'
            ORDER BY e.entity_id, p.ordre
        """)
        
        rooms_dict = {}
        for row in cur.fetchall():
            room_id = row['entity_id']
            if room_id not in rooms_dict:
                rooms_dict[room_id] = {'room_id': room_id, 'name': row['name'] or f"Salle {room_id}", 'polygon_points': []}
            rooms_dict[room_id]['polygon_points'].append({'x': float(row['x']), 'y': float(row['y'])})
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'map_data': {
                'rooms': list(rooms_dict.values()),
                'artworks': sorted(artworks_data, key=lambda a: a['order'])
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== API MUSEUM FLOOR PLAN =====

@app.route('/api/museum/floor-plan', methods=['GET'])
def get_floor_plan():
    try:
        conn = _connect_postgres()
        cur = conn.cursor()
        
        floor_filter = request.args.get('floor')
        
        cur.execute("SELECT plan_id, nom FROM plans ORDER BY plan_id")
        plan_to_floor = {row['plan_id']: idx for idx, row in enumerate(cur.fetchall())}
        
        cur.execute("""
            SELECT e.entity_id, e.name, e.plan_id,
                   array_agg(p.x ORDER BY p.ordre) as xs,
                   array_agg(p.y ORDER BY p.ordre) as ys
            FROM entities e
            LEFT JOIN points p ON e.entity_id = p.entity_id
            WHERE e.entity_type = 'ROOM'
            GROUP BY e.entity_id, e.name, e.plan_id
        """)
        
        rooms = []
        for row in cur.fetchall():
            floor_num = plan_to_floor.get(row['plan_id'], 0)
            if floor_filter and floor_num != int(floor_filter):
                continue
            rooms.append({
                'entity_id': row['entity_id'],
                'name': row['name'],
                'floor': floor_num,
                'polygon_points': [{'x': x, 'y': y} for x, y in zip(row['xs'] or [], row['ys'] or [])]
            })
        
        cur.execute("""
            SELECT entrance_id, plan_id, name, x, y, icon
            FROM museum_entrances WHERE is_active = true
        """)
        
        entrances = []
        for row in cur.fetchall():
            floor_num = plan_to_floor.get(row['plan_id'], 0)
            if floor_filter and floor_num != int(floor_filter):
                continue
            entrances.append({
                'entrance_id': row['entrance_id'],
                'name': row['name'],
                'x': float(row['x']),
                'y': float(row['y']),
                'icon': row['icon'],
                'floor': floor_num
            })
        
        cur.close()
        conn.close()
        return jsonify({'success': True, 'rooms': rooms, 'entrances': entrances})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== ADMIN ROUTES =====

@app.route('/api/admin/delete-all-narrations', methods=['DELETE'])
def admin_delete_all_narrations():
    try:
        conn = _connect_postgres()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as count FROM pregenerations")
        count = cur.fetchone()['count']
        cur.execute("TRUNCATE TABLE pregenerations CASCADE")
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True, 'deleted': count})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/generate-narration-precise', methods=['POST'])
def admin_generate_narration_precise():
    try:
        import json as json_module
        data = request.get_json()
        oeuvre_id = data.get('oeuvre_id')
        criteria_combination = data.get('criteria_combination')
        
        if not oeuvre_id or not criteria_combination:
            return jsonify({'success': False, 'error': 'oeuvre_id et criteria_combination requis'}), 400
        
        conn = _connect_postgres()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute("""
            SELECT * FROM oeuvres WHERE oeuvre_id = %s
        """, (oeuvre_id,))
        artwork = cur.fetchone()
        
        if not artwork:
            cur.close()
            conn.close()
            return jsonify({'success': False, 'error': f'Œuvre {oeuvre_id} non trouvée'}), 404
        
        all_criteres = get_criteres()
        combinaison_enrichie = {}
        for crit_type, crit_id in criteria_combination.items():
            critere = next((c for c in all_criteres.get(crit_type, []) if c['criteria_id'] == crit_id), None)
            if critere:
                combinaison_enrichie[crit_type] = critere
        
        if len(combinaison_enrichie) != len(criteria_combination):
            cur.close()
            conn.close()
            return jsonify({'success': False, 'error': 'Critères invalides'}), 400
        
        ollama_system = OllamaMediationSystem()
        result = ollama_system.generate_mediation_for_one_work(
            artwork=dict(artwork),
            combinaison=combinaison_enrichie,
            duree_minutes=3
        )
        
        if not result['success']:
            cur.close()
            conn.close()
            return jsonify({'success': False, 'error': result.get('error')}), 500
        
        cur.execute("""
            INSERT INTO pregenerations (oeuvre_id, criteria_combination, pregeneration_text, created_at, updated_at)
            VALUES (%s, %s, %s, NOW(), NOW())
            ON CONFLICT (oeuvre_id, criteria_combination) 
            DO UPDATE SET pregeneration_text = EXCLUDED.pregeneration_text, updated_at = NOW()
            RETURNING pregeneration_id
        """, (oeuvre_id, json_module.dumps(criteria_combination), result['text']))
        
        pregen_id = cur.fetchone()['pregeneration_id']
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'pregeneration': {
                'pregeneration_id': pregen_id,
                'oeuvre_id': oeuvre_id,
                'criteria_combination': criteria_combination,
                'pregeneration_text': result['text']
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== CLEANUP ROUTES =====

@app.route('/api/cleanup/audio', methods=['POST'])
def cleanup_audio_files():
    try:
        from .core.cleanup_service import get_cleanup_service
        cleanup_service = get_cleanup_service()
        cleaned_count = cleanup_service.cleanup_all()
        return jsonify({'success': True, 'cleaned': cleaned_count})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/cleanup-all-sessions', methods=['POST'])
def cleanup_all_sessions():
    try:
        import shutil
        conn = _connect_postgres()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as count FROM qr_code WHERE parcours_id IS NOT NULL")
        session_count = cur.fetchone()['count']
        cur.execute("DELETE FROM qr_code")
        conn.commit()
        cur.close()
        conn.close()
        
        audio_dir = Path("/app/uploads/audio")
        deleted_folders = 0
        if audio_dir.exists():
            for folder in audio_dir.iterdir():
                if folder.is_dir() and folder.name.startswith('parcours_'):
                    try:
                        shutil.rmtree(folder)
                        deleted_folders += 1
                    except Exception:
                        pass
        
        return jsonify({
            'success': True,
            'deleted_sessions': session_count,
            'deleted_audio_folders': deleted_folders
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== ROUTES PARCOURS (liste, détails) =====

@app.route('/api/parcours', methods=['GET'])
def get_parcours_list():
    """Liste tous les parcours générés (sessions QR)"""
    try:
        conn = _connect_postgres()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT qr.*, 
                   (SELECT COUNT(*) FROM qr_code WHERE group_id = qr.group_id) as oeuvre_count
            FROM qr_code qr
            WHERE qr.parcours_id IS NOT NULL
            ORDER BY qr.created_at DESC
        """)
        parcours = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({'success': True, 'parcours': [dict(p) for p in parcours]})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/parcours/<int:parcours_id>', methods=['GET'])
def get_parcours_details(parcours_id):
    """Détails d'un parcours par ID"""
    try:
        conn = _connect_postgres()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM qr_code WHERE parcours_id = %s", (parcours_id,))
        parcours = cur.fetchone()
        if not parcours:
            cur.close()
            conn.close()
            return jsonify({'success': False, 'error': 'Parcours non trouvé'}), 404
        cur.close()
        conn.close()
        return jsonify({'success': True, 'parcours': dict(parcours)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== ROUTES ADMIN (seed-narrations, generate-by-profile) =====

@app.route('/api/admin/seed-narrations', methods=['POST'])
@app.route('/api/admin/seed-narrations/<int:oeuvre_id>', methods=['POST'])
def admin_seed_narrations(oeuvre_id=None):
    """Prégénère les narrations pour une ou toutes les œuvres"""
    try:
        data = request.get_json() or {}
        force = data.get('force', False)
        model = data.get('model', os.getenv('OLLAMA_MODEL', 'ministral-3:3b'))
        
        conn = _connect_postgres()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Récupérer œuvres
        if oeuvre_id:
            cur.execute("SELECT * FROM oeuvres WHERE oeuvre_id = %s", (oeuvre_id,))
        else:
            cur.execute("SELECT * FROM oeuvres ORDER BY oeuvre_id")
        oeuvres = cur.fetchall()
        
        if not oeuvres:
            cur.close()
            conn.close()
            return jsonify({'success': False, 'error': 'Aucune œuvre trouvée'}), 404
        
        # Récupérer toutes les combinaisons de critères
        all_criteres = get_criteres()
        combinaisons = _generate_all_combinaisons(all_criteres)
        
        # Générer pour chaque œuvre
        ollama_system = OllamaMediationSystem(default_model=model)
        results = []
        for oeuvre in oeuvres:
            result = ollama_system.pregenerate_artwork(
                oeuvre_id=oeuvre['oeuvre_id'],
                artwork=dict(oeuvre),
                combinaisons=combinaisons,
                force_regenerate=force,
                model=model
            )
            results.append(result)
        
        cur.close()
        conn.close()
        
        total_stats = {"generated": 0, "skipped": 0, "errors": 0}
        for r in results:
            for k in total_stats:
                total_stats[k] += r.get('stats', {}).get(k, 0)
        
        return jsonify({'success': True, 'results': results, 'total_stats': total_stats})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/generate-narrations-by-profile', methods=['POST'])
def admin_generate_narrations_by_profile():
    """Génère les narrations pour un profil spécifique (combinaison de critères)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Données manquantes'}), 400
        
        criteria_combination = data.get('criteria_combination', {})
        oeuvre_ids = data.get('oeuvre_ids', [])
        force = data.get('force', False)
        model = data.get('model', os.getenv('OLLAMA_MODEL', 'ministral-3:3b'))
        
        if not criteria_combination:
            return jsonify({'success': False, 'error': 'criteria_combination requis'}), 400
        
        conn = _connect_postgres()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        if oeuvre_ids:
            placeholders = ','.join(['%s'] * len(oeuvre_ids))
            cur.execute(f"SELECT * FROM oeuvres WHERE oeuvre_id IN ({placeholders})", oeuvre_ids)
        else:
            cur.execute("SELECT * FROM oeuvres ORDER BY oeuvre_id")
        oeuvres = cur.fetchall()
        
        if not oeuvres:
            cur.close()
            conn.close()
            return jsonify({'success': False, 'error': 'Aucune œuvre trouvée'}), 404
        
        # Enrichir la combinaison avec les détails des critères
        all_criteres = get_criteres()
        combinaison_enrichie = {}
        for crit_type, crit_id in criteria_combination.items():
            critere = next((c for c in all_criteres.get(crit_type, []) if c['criteria_id'] == crit_id), None)
            if critere:
                combinaison_enrichie[crit_type] = critere
        
        if not combinaison_enrichie:
            cur.close()
            conn.close()
            return jsonify({'success': False, 'error': 'Critères invalides'}), 400
        
        # Générer pour chaque œuvre
        ollama_system = OllamaMediationSystem(default_model=model)
        results = []
        for oeuvre in oeuvres:
            result = ollama_system.pregenerate_artwork(
                oeuvre_id=oeuvre['oeuvre_id'],
                artwork=dict(oeuvre),
                combinaisons=[combinaison_enrichie],
                force_regenerate=force,
                model=model
            )
            results.append(result)
        
        cur.close()
        conn.close()
        
        total_stats = {"generated": 0, "skipped": 0, "errors": 0}
        for r in results:
            for k in total_stats:
                total_stats[k] += r.get('stats', {}).get(k, 0)
        
        return jsonify({'success': True, 'results': results, 'total_stats': total_stats})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


def _generate_all_combinaisons(criteres_by_type: Dict[str, List]) -> List[Dict]:
    """Génère toutes les combinaisons possibles de critères"""
    import itertools
    types = list(criteres_by_type.keys())
    if not types:
        return []
    
    values_per_type = [criteres_by_type[t] for t in types]
    combinaisons = []
    for combo in itertools.product(*values_per_type):
        combinaison = {types[i]: combo[i] for i in range(len(types))}
        combinaisons.append(combinaison)
    return combinaisons


# ===== DÉMARRAGE =====

if __name__ == '__main__':
    print("🚀 Museum Voice Backend - Port 5000")
    app.run(host='0.0.0.0', port=5000, debug=True)

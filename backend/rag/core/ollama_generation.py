import os
import time
import itertools
import multiprocessing
from typing import Dict, Any, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

import requests
from rag.core.pregeneration_db import add_pregeneration

# ===== CONFIGURATION CPU DYNAMIQUE - UTILISATION MAXIMALE =====

def _detect_cpu_count():
    """
    Détection robuste du nombre de CPUs, compatible Docker.
    """
    cpu_count = None
    
    # Méthode 1: Variable d'environnement explicite
    env_cpu = os.getenv('CPU_COUNT')
    if env_cpu:
        try:
            return int(env_cpu)
        except:
            pass
    
    # Méthode 2: /proc/cpuinfo (Linux/Docker) - plus fiable dans Docker
    try:
        with open('/proc/cpuinfo', 'r') as f:
            proc_count = len([l for l in f.readlines() if l.startswith('processor')])
            if proc_count > 0:
                return proc_count
    except:
        pass
    
    # Méthode 3: multiprocessing
    try:
        cpu_count = multiprocessing.cpu_count()
        if cpu_count:
            return cpu_count
    except:
        pass
    
    # Fallback
    return os.cpu_count() or 8

# Détection CPU
_CPU_COUNT = _detect_cpu_count()

# ===== CONFIGURATION PARALLÉLISATION =====
# STRATÉGIE: Laisser Ollama gérer les threads, on contrôle juste le nombre de requêtes parallèles
# Le serveur Ollama est configuré avec OLLAMA_NUM_PARALLEL via Docker

# Nombre de requêtes parallèles côté backend (doit matcher OLLAMA_NUM_PARALLEL du serveur)
_ENV_PARALLEL = os.getenv('OLLAMA_PARALLEL_REQUESTS')
if _ENV_PARALLEL:
    _OLLAMA_PARALLEL_REQUESTS = int(_ENV_PARALLEL)
else:
    # Auto-calcul: pour CPU-only, ~2-4 requêtes parallèles sont optimales
    # Car chaque requête LLM est CPU-intensive
    _OLLAMA_PARALLEL_REQUESTS = max(4, min(12, _CPU_COUNT // 4))

# Semaphore pour limiter les requêtes simultanées au backend
# Doit matcher OLLAMA_NUM_PARALLEL du serveur Ollama
_ollama_semaphore = threading.Semaphore(_OLLAMA_PARALLEL_REQUESTS)

print(f"🔧 Backend Config: {_CPU_COUNT} CPUs détectés")
print(f"   → {_OLLAMA_PARALLEL_REQUESTS} requêtes parallèles max (sémaphore)")
print(f"   → Threads gérés par Ollama serveur (OLLAMA_NUM_THREAD)")


class OllamaMediationSystem:
    """
    Système de génération de médiations avec Ollama (inspiré du style de ton script).
    Flux: (optionnel) setup → préparation entrée → génération par combinaisons → stats.
    """

    def __init__(
        self,
        *,
        ollama_url: Optional[str] = None,
        default_model: str = None,
        timeout_s: int = 300000,  # 300 secondes = 5 minutes (pour les longues générations Ollama)
        temperature: float = 0.5,
        num_predict: int = -1,
        verbose: bool = True,
    ) -> None:
        self.ollama_url = (ollama_url or os.getenv("OLLAMA_API_URL", "http://localhost:11434")).rstrip("/")
        self.default_model = default_model or os.getenv("OLLAMA_MODEL", "ministral-3:3b")
        self.timeout_s = timeout_s
        self.temperature = temperature
        self.num_predict = num_predict
        self.verbose = verbose

        print("🚀 OllamaMediationSystem initialisé")
        print(f"   Ollama URL: {self.ollama_url}")
        print(f"   Modèle défaut: {self.default_model}")

    # ---------------------------------------------------------------------
    # Utils
    # ---------------------------------------------------------------------
    @staticmethod
    def normalize_str(x: Any) -> str:
        return str(x).strip() if x is not None else ""

    @staticmethod
    def truncate(text: str, max_chars: int) -> str:
        text = (text or "").strip()
        if len(text) <= max_chars:
            return text
        cut = text[:max_chars]
        if " " in cut:
            cut = cut.rsplit(" ", 1)[0]
        return cut + "…"

    @staticmethod
    def generate_combinaisons(criteres_dict: Dict[str, List[Any]]) -> List[Dict[str, Any]]:
        keys = criteres_dict.keys()
        values = criteres_dict.values()
        return [dict(zip(keys, combination)) for combination in itertools.product(*values)]

    @staticmethod
    def formater_parametres_criteres(combinaison: Dict[str, Dict[str, Any]]) -> str:
        """
        Transforme le dictionnaire en directives de style impératives.
        """
        instructions = []
        for type_critere, data in combinaison.items():
            nom = data.get("name", "")
            desc = data.get("description", "")
            ai_indication = data.get("ai_indication", "")
            
            # On construit un bloc identitaire fort
            bloc = f"TYPE DE {type_critere.upper()} : {nom}.\n"
            if desc:
                bloc += f"   CONTEXTE : {desc}\n"
            if ai_indication:
                bloc += f"   ORDRE DE STYLE : {ai_indication}\n"
            else:
                bloc += f"   ORDRE DE STYLE : Adopte le vocabulaire, le rythme et les tournures typiques de : {nom}.\n"
                
            instructions.append(bloc)

        return "\n".join(instructions)
    
    @staticmethod
    def _criteria_ids_from_combinaison(combinaison: Dict[str, Any]) -> Dict[str, int]:
        """
        Convertit une combinaison riche (avec name/description/dates) en dict minimal:
        {type_name: criteria_id}
        """
        out: Dict[str, int] = {}
        for type_name, value in (combinaison or {}).items():
            if isinstance(value, int) and not isinstance(value, bool):
                out[type_name] = value
            elif isinstance(value, dict) and "criteria_id" in value:
                out[type_name] = int(value["criteria_id"])
            else:
                raise ValueError(f"Combinaison invalide pour '{type_name}': {value!r}")
        return out

    def _check_existing(self, oeuvre_id: int, combinaison: Dict[str, Any]) -> bool:
        """
        Vérifie si une pregeneration existe déjà pour (oeuvre_id, criteria_combination).
        """
        try:
            import json
            from rag.core.pregeneration_db import _connect_postgres

            criteria_ids = self._criteria_ids_from_combinaison(combinaison)
            criteria_json = json.dumps(criteria_ids, sort_keys=True)

            conn = _connect_postgres()
            cur = conn.cursor()

            cur.execute(
                """
                SELECT 1
                FROM pregenerations
                WHERE oeuvre_id = %s
                  AND criteria_combination = %s::jsonb
                LIMIT 1
                """,
                (oeuvre_id, criteria_json),
            )

            return cur.fetchone() is not None

        except Exception:
            return False
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass


    # ---------------------------------------------------------------------
    # Ollama
    # ---------------------------------------------------------------------
    def check_ollama_available(self) -> bool:
        """
        Vérifie si l'API Ollama répond (simple ping).
        """
        try:
            r = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            return r.status_code == 200
        except Exception:
            return False

    def ollama_chat(
        self,
        *,
        model: str,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        stream: bool = False,
        timeout_s: Optional[int] = None,
    ) -> str:
        url = f"{self.ollama_url}/api/chat"
        
        # ===== OPTIONS OPTIMISÉES =====
        # NE PAS spécifier num_thread ici - laisser Ollama serveur gérer
        # Les threads sont configurés via OLLAMA_NUM_THREAD au niveau serveur
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
            "options": {
                "temperature": self.temperature if temperature is None else temperature,
                "num_predict": self.num_predict,
                # Laisser Ollama utiliser tous les CPU disponibles
                # num_thread: géré par OLLAMA_NUM_THREAD serveur (ne pas override)
                "num_ctx": 4096,  # Contexte standard
                "num_batch": 256,  # Batch size pour bonne performance CPU
            },
        }
        r = requests.post(url, json=payload, timeout=(timeout_s or self.timeout_s))
        r.raise_for_status()
        data = r.json()
        return data["message"]["content"]

    # ---------------------------------------------------------------------
    # Formatting oeuvre → texte prompt (OPTIMISÉ - tokens réduits)
    # ---------------------------------------------------------------------
    def oeuvre_to_prompt_text(self, payload: Dict[str, Any], *, max_chars: int = 4000) -> str:
        """Convertit une œuvre en texte de contexte compact pour le LLM"""
        titre = self.normalize_str(payload.get("title") or "Inconnu")
        artiste = self.normalize_str(payload.get("artist") or "Inconnu")
        date = self.normalize_str(payload.get("date_oeuvre") or "")
        technique = self.normalize_str(payload.get("materiaux_technique") or "")

        # Troncature plus agressive pour réduire tokens
        description = self.truncate(payload.get("description") or "", max_chars)
        analyse = self.truncate(payload.get("analyse_materielle_technique") or "", 2000)
        iconographie = self.truncate(payload.get("iconographie_symbolique") or "", 2000)
        contexte = self.truncate(payload.get("contexte_commande") or "", 1500)

        lines = [f"ŒUVRE: {titre} par {artiste}"]
        if date:
            lines.append(f"Date: {date}")
        if technique:
            lines.append(f"Technique: {technique}")
        if description:
            lines.append(f"\n{description}")
        if analyse:
            lines.append(f"\nAnalyse: {analyse}")
        if iconographie:
            lines.append(f"\nIconographie: {iconographie}")
        if contexte:
            lines.append(f"\nContexte: {contexte}")

        return "\n".join(lines)

    # ---------------------------------------------------------------------
    # Prompt building (OPTIMISE - tokens reduits de ~60%)
    # ---------------------------------------------------------------------
    def build_single_work_mediation_prompt(
        self,
        work_text: str,
        *,
        combinaison: Dict[str, Dict[str, Any]],
        duree_minutes: int = 3,
    ) -> List[Dict[str, str]]:
        bloc_criteres = self.formater_parametres_criteres(combinaison)
        
        # Ajuster duree/mots selon profil
        is_enfant = "enfant" in bloc_criteres.lower()
        duree = 1.5 if is_enfant else 3
        mots = "150-200" if is_enfant else "350-450"

        # System prompt compact (~100 tokens au lieu de ~200)
        system = (
            "Guide de musee expert. Genere un script audioguide oral. "
            "REGLES: Pas de parentheses/asterisques/titres/markdown. "
            "Texte pret a lire. Utilise UNIQUEMENT les infos fournies."
        )

        # User prompt compact (~250 tokens au lieu de ~500)
        user = f"""Genere un texte audioguide ({mots} mots, ~{duree} min).

OEUVRE:
{work_text}

STYLE:
{bloc_criteres}

FORMAT:
- Accroche visuelle -> Description -> Contexte -> Conclusion
- Phrases courtes, verbes de perception (regardez, observez)
- Ton sobre, pas d'injonctions emotionnelles
- INTERDIT: parentheses, asterisques, markdown, titres, faits inventes"""

        return [{"role": "system", "content": system}, {"role": "user", "content": user}]




    # ---------------------------------------------------------------------
    # Génération (une narration)
    # ---------------------------------------------------------------------
    def generate_mediation_for_one_work(
        self,
        *,
        artwork: Dict[str, Any],
        combinaison: Dict[str, Dict[str, Any]],
        duree_minutes: int = 3,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_chars: int = 7000,
    ) -> Dict[str, Any]:
        """
        Génère UNE médiation pour une œuvre + une combinaison de critères.
        Retour: {'success': bool, 'text': str, 'error': str|None}
        """
        try:
            work_text = self.oeuvre_to_prompt_text(artwork, max_chars=max_chars)
            
            messages = self.build_single_work_mediation_prompt(
                work_text,
                combinaison=combinaison,
                duree_minutes=duree_minutes,
            )
            
            print("Prompt messages:")
            for message in messages:
                print(f"{message['role']}: {message['content']}")

            text = self.ollama_chat(
                model=(model or self.default_model),
                messages=messages,
                temperature=temperature,
                stream=False,
            )

            if not text or len(text.strip()) < 30:
                return {"success": False, "error": "Médiation vide ou trop courte", "text": ""}

            return {"success": True, "text": text, "error": None}

        except Exception as e:
            return {"success": False, "error": str(e), "text": ""}

    # ---------------------------------------------------------------------
    # Generation style "pregenerate_artwork" (PARALLELE - optimisé VPS)
    # ---------------------------------------------------------------------
    def pregenerate_artwork(
        self,
        *,
        oeuvre_id: int,
        artwork: Dict[str, Any],
        combinaisons: List[Dict[str, Dict[str, Any]]],
        duree_minutes: int = 3,
        model: Optional[str] = None,
        force_regenerate: bool = False,
    ) -> Dict[str, Any]:
        """
        Pregenere une liste de narrations en PARALLELE.
        Optimisé pour VPS haute performance (96 threads).
        Utilise _OLLAMA_PARALLEL_REQUESTS workers dynamiques.
        """
        start_time = time.time()
        title = artwork.get("title", f"ID {oeuvre_id}")
        self.default_model = model

        print(f"\n{'='*60}")
        print(f"🎨 GENERATION ID {oeuvre_id}: {title[:40]}")
        print(f"⚙️ Config: {_OLLAMA_PARALLEL_REQUESTS} workers, {_THREADS_PER_REQUEST} threads/req")
        print(f"{'='*60}")

        if not self.check_ollama_available():
            print("⚠️ Ollama non disponible")
            return {"success": False, "error": "Ollama non disponible", 
                    "oeuvre_id": oeuvre_id, "title": title}

        stats = {"generated": 0, "updated": 0, "skipped": 0, "errors": 0}
        results: List[Dict[str, Any]] = []
        
        # Filtrer les combinaisons déjà existantes (batch check)
        to_generate = []
        for combinaison in combinaisons:
            if not force_regenerate:
                existing = self._check_existing(oeuvre_id, combinaison)
                if existing:
                    stats['skipped'] += 1
                    continue
            to_generate.append(combinaison)
        
        print(f"📊 {len(to_generate)}/{len(combinaisons)} à générer (skip: {stats['skipped']})")
        
        if not to_generate:
            return {"success": True, "oeuvre_id": oeuvre_id, "title": title,
                    "stats": stats, "duration": 0, "results": results}

        def generate_one(idx_comb: Tuple[int, Dict]) -> Dict:
            """Génère une narration avec semaphore"""
            idx, combinaison = idx_comb
            label = self._format_combinaison_label(combinaison)
            
            with _ollama_semaphore:  # Semaphore dynamique selon CPU
                res = self.generate_mediation_for_one_work(
                    artwork=artwork,
                    combinaison=combinaison,
                    duree_minutes=duree_minutes,
                    model=model,
                )
            
            return {"idx": idx, "combinaison": combinaison, "label": label, 
                    "result": res, "oeuvre_id": oeuvre_id, "title": title}

        # Parallélisation optimisée avec workers dynamiques
        print(f"🚀 Génération parallèle ({_OLLAMA_PARALLEL_REQUESTS} workers)...")
        completed = 0
        total = len(to_generate)
        
        with ThreadPoolExecutor(max_workers=_OLLAMA_PARALLEL_REQUESTS) as executor:
            futures = {executor.submit(generate_one, (i, c)): i 
                      for i, c in enumerate(to_generate)}
            
            for future in as_completed(futures):
                completed += 1
                try:
                    data = future.result()
                    res = data["result"]
                    combinaison = data["combinaison"]
                    
                    if res["success"]:
                        text_clean = res["text"].replace("*", "")
                        pregen_id = add_pregeneration(
                            oeuvre_id=oeuvre_id,
                            criteria_dict=combinaison,
                            pregeneration_text=text_clean
                        )
                        
                        if pregen_id:
                            if force_regenerate:
                                stats['updated'] += 1
                            else:
                                stats['generated'] += 1
                            # Affichage compact avec progression
                            print(f"  [{completed}/{total}] ✅ {data['label'][:30]}")
                        
                        results.append({
                            "oeuvre_id": oeuvre_id, "title": title,
                            "combinaison": combinaison, "text": text_clean
                        })
                    else:
                        stats["errors"] += 1
                        print(f"  [{completed}/{total}] ❌ {str(res['error'])[:40]}")
                        results.append({
                            "oeuvre_id": oeuvre_id, "title": title,
                            "combinaison": combinaison, "error": res["error"], "text": ""
                        })
                except Exception as e:
                    stats["errors"] += 1
                    print(f"  [{completed}/{total}] ❌ Exception: {str(e)[:40]}")

        duration = time.time() - start_time
        speed = stats['generated'] / duration if duration > 0 else 0
        
        print(f"\n📊 RÉSUMÉ: ✨{stats['generated']} 🔄{stats['updated']} ⏭️{stats['skipped']} ❌{stats['errors']}")
        print(f"⏱️ {duration:.1f}s | ⚡ {speed:.2f} narr/sec")

        return {"success": True, "oeuvre_id": oeuvre_id, "title": title,
                "stats": stats, "duration": duration, "results": results}


    # ---------------------------------------------------------------------
    # Helpers
    # ---------------------------------------------------------------------
    @staticmethod
    def _format_combinaison_label(combinaison: Dict[str, Dict[str, Any]]) -> str:
        """
        Petit label lisible pour l'affichage console.
        Exemple: "age=Enfant | theme=Technique | style=Découverte"
        """
        parts = []
        for k, v in combinaison.items():
            parts.append(f"{k}={v.get('name', '')}")
        return " | ".join(parts)

    # ---------------------------------------------------------------------
    # Génération d'une seule combinaison (pour jobs asynchrones)
    # ---------------------------------------------------------------------
    def pregenerate_single_combination(
        self,
        *,
        oeuvre_id: int,
        artwork: Dict[str, Any],
        combination: Dict[str, Any],
        model: Optional[str] = None,
        force_regenerate: bool = False,
        duree_minutes: int = 3,
    ) -> Dict[str, Any]:
        """
        Génère une seule narration pour une œuvre + combinaison.
        Utilisé par le système de jobs asynchrones pour un suivi granulaire.
        
        Returns:
            {
                'generated': bool,  # True si nouvelle génération
                'skipped': bool,    # True si existait déjà
                'error': str|None   # Message d'erreur éventuel
            }
        """
        try:
            # Vérifier si existe déjà
            if not force_regenerate and self._check_existing(oeuvre_id, combination):
                return {'generated': False, 'skipped': True, 'error': None}
            
            # Générer la narration
            with _ollama_semaphore:
                result = self.generate_mediation_for_one_work(
                    artwork=artwork,
                    combinaison=combination,
                    duree_minutes=duree_minutes,
                    model=model or self.default_model,
                )
            
            if not result.get('success'):
                return {
                    'generated': False, 
                    'skipped': False, 
                    'error': result.get('error', 'Génération échouée')
                }
            
            # Sauvegarder en DB
            text_clean = result['text'].replace('*', '')
            pregen_id = add_pregeneration(
                oeuvre_id=oeuvre_id,
                criteria_dict=combination,
                pregeneration_text=text_clean
            )
            
            if pregen_id:
                return {'generated': True, 'skipped': False, 'error': None}
            else:
                return {'generated': False, 'skipped': False, 'error': 'Échec sauvegarde DB'}
                
        except Exception as e:
            return {'generated': False, 'skipped': False, 'error': str(e)}

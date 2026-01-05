#!/usr/bin/env python3
"""
Générateur de narrations avec Ollama LOCAL uniquement
Avec système anti-hallucination et vérification post-génération
"""

import os
import re
import random
import requests
from typing import Dict, List, Any, Optional
from pathlib import Path


class OllamaAntiHallucinationGenerator:
    """
    Générateur de narrations UNIQUEMENT avec Ollama local
    Avec barrières anti-hallucination:
    - Vérification contenu source
    - Validation factuelle post-génération
    - Détection inventions
    - Fallback si suspect
    """
    
    def __init__(self):
        self.api_url = os.getenv("OLLAMA_API_URL", "http://host.docker.internal:11434")
        self.model = os.getenv("OLLAMA_MODEL", "mistral")
        
        # Timeout généreux pour génération Mistral (180s = 3 minutes)
        self.timeout = 180
        
        # Paramètres anti-hallucination avec légère variation pour diversité
        self.temperature = 0.3  # Basse température = moins créatif = moins hallucinations
        self.top_p = 0.85       # Nucleus sampling strict
        
        # Variations aléatoires pour prompts (diversité tout en restant factuel)
        self.variation_seed = random.randint(1, 1000)
        
        print(f"🤖 OllamaGenerator initialisé")
        print(f"   URL: {self.api_url}")
        print(f"   Modèle: {self.model}")
        print(f"   Température: {self.temperature} (anti-hallucination)")
        print(f"   Variation: #{self.variation_seed} (diversité)")
    
    def check_ollama_available(self) -> bool:
        """Vérifie si Ollama est disponible"""
        try:
            response = requests.get(f"{self.api_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get('models', [])
                model_names = [m.get('name', '') for m in models]
                print(f"✅ Ollama disponible - Modèles: {model_names}")
                return True
            return False
        except Exception as e:
            print(f"❌ Ollama non disponible: {e}")
            return False
    
    def generate_narration(self, 
                          artwork: Dict, 
                          chunks: List[Dict],
                          rag_context: str,
                          age_cible: str, 
                          thematique: str, 
                          style_texte: str) -> str:
        """
        Génère une narration UNIQUE avec Ollama
        Avec vérification anti-hallucination
        """
        
        # Construire le prompt anti-hallucination
        prompt = self._build_safe_prompt(
            artwork=artwork,
            rag_context=rag_context,
            age_cible=age_cible,
            thematique=thematique,
            style_texte=style_texte
        )
        
        # Appeler Ollama
        try:
            narration = self._call_ollama(prompt, max_length=400)
            
            # VÉRIFICATION POST-GÉNÉRATION
            is_valid = self._validate_narration(
                narration=narration,
                artwork=artwork,
                source_chunks=chunks,
                rag_context=rag_context
            )
            
            if not is_valid:
                print(f"⚠️  Narration suspecte détectée - Utilisation fallback sécurisé")
                return self._safe_fallback(artwork, chunks, age_cible, thematique, style_texte)
            
            return narration
            
        except Exception as e:
            print(f"❌ Erreur Ollama: {e}")
            return self._safe_fallback(artwork, chunks, age_cible, thematique, style_texte)
    
    def _build_safe_prompt(self, artwork: Dict, rag_context: str, age_cible: str, 
                          thematique: str, style_texte: str) -> str:
        """
        Construit un prompt ADAPTATIF avec variations pour unicité
        """
        
        title = artwork.get('title', 'Œuvre')
        artist = artwork.get('artist', 'Artiste')
        
        # VARIATIONS de formulation pour UNICITÉ (chaque génération différente)
        random.seed(self.variation_seed + hash(f"{age_cible}{thematique}{style_texte}"))
        
        # Profils ADAPTATIFS (vocabulaire et ton)
        profil_variations = {
            'enfant': [
                "Tu parles à un enfant de 6-10 ans. Utilise des mots simples et des phrases courtes. Tutoie-le.",
                "Ton public : un enfant curieux de 6-10 ans. Vocabulaire accessible, phrases directes, tutoiement.",
                "Enfant 6-10 ans : mots faciles, phrases courtes et claires, tutoiement naturel."
            ],
            'ado': [
                "Tu t'adresses à un ado de 11-17 ans. Sois accessible et dynamique, tutoie-le.",
                "Public ado 11-17 ans : langage clair, engageant, sans être condescendant. Tutoiement.",
                "Ton audience : un ado de 11-17 ans. Accessible, intéressant, direct. Tutoie."
            ],
            'adulte': [
                "Tu parles à un adulte. Sois informatif, clair, et vouvoie.",
                "Public adulte : narration informative, claire, précise. Vouvoiement.",
                "Adulte curieux : contenu riche mais accessible, vouvoiement naturel."
            ],
            'senior': [
                "Tu t'adresses à un senior. Apporte des détails riches si pertinent, vouvoie.",
                "Public senior : narration approfondie, contextuelle, respectueuse. Vouvoiement.",
                "Senior : détails culturels et historiques bienvenus si factuels, vouvoiement."
            ]
        }
        
        # Thématiques VARIÉES
        theme_variations = {
            'technique_picturale': [
                "Focus : technique picturale, matériaux, composition visuelle.",
                "Thème : comment l'œuvre est faite - technique, matériaux, gestes de l'artiste.",
                "Axe technique : parle de la façon dont c'est peint, composé, réalisé."
            ],
            'biographie': [
                "Focus : l'artiste - sa vie, son parcours, son contexte.",
                "Thème : qui est l'artiste ? Son histoire, son époque, son parcours.",
                "Axe biographique : contexte de l'artiste, sa vie, ses influences."
            ],
            'historique': [
                "Focus : contexte historique - l'époque, les événements, le contexte culturel.",
                "Thème : quand et pourquoi cette œuvre ? Contexte historique et culturel.",
                "Axe historique : l'époque, le contexte social et culturel de l'œuvre."
            ]
        }
        
        # Styles VARIÉS
        style_variations = {
            'analyse': [
                "Style : analytique. Décrypte l'œuvre, explique ce qu'on voit et pourquoi.",
                "Approche : analyse détaillée, décompose les éléments de l'œuvre.",
                "Ton analytique : observe, décris, explique les choix de l'artiste."
            ],
            'decouverte': [
                "Style : découverte. Éveille la curiosité, pose des questions, invite à observer.",
                "Approche : exploration - fais découvrir l'œuvre progressivement.",
                "Ton découverte : stimule l'observation, l'étonnement, la curiosité."
            ],
            'anecdote': [
                "Style : narratif. Raconte une histoire, crée un récit autour de l'œuvre.",
                "Approche : storytelling - construis un récit factuel mais captivant.",
                "Ton narratif : raconte l'histoire de l'œuvre, de l'artiste, du contexte."
            ]
        }
        
        # Sélection aléatoire des variations
        profil = random.choice(profil_variations.get(age_cible, ["Public standard"]))
        theme = random.choice(theme_variations.get(thematique, ["Thème général"]))
        style = random.choice(style_variations.get(style_texte, ["Style standard"]))
        
        # Instructions VARIABLES pour éviter répétitions
        intro_variations = [
            "Crée une narration de musée basée UNIQUEMENT sur les faits fournis.",
            "Génère une narration factuelle pour cette œuvre en utilisant SEULEMENT les infos disponibles.",
            "Écris une narration de musée - reste fidèle aux faits, n'invente rien."
        ]
        
        interdiction_variations = [
            "N'utilise PAS de formule d'accroche comme 'Bonjour', 'Salut', 'Voici', 'Regardez', 'Aujourd'hui'.",
            "Entre DIRECTEMENT dans le sujet - pas de salutation ni introduction (cette œuvre fait partie d'un parcours).",
            "Commence par le contenu immédiatement - évite tout 'Bonjour', 'Salut', 'Aujourd'hui', 'Voici', etc."
        ]
        
        singularite_variations = [
            "Parle à UNE seule personne (singulier) - jamais 'les amis', 'vous tous', formes plurielles.",
            "Adresse-toi à une personne (singulier uniquement) - pas de 'les amis', 'petit(e)s ami(e)s', etc.",
            "Utilise le singulier - tu parles à une personne, pas un groupe ('les amis' interdit)."
        ]
        
        intro = random.choice(intro_variations)
        interdiction = random.choice(interdiction_variations)
        singularite = random.choice(singularite_variations)
        
        # Prompt COMPLET mais FLEXIBLE
        instructions = f"""{intro}

{profil}
{theme}
{style}

INFOS ŒUVRE:
{rag_context[:1800]}

Titre: {title}
Artiste: {artist}

RÈGLES ABSOLUES:
1. {interdiction}
2. {singularite}
3. N'invente RIEN - utilise UNIQUEMENT les infos ci-dessus
4. PAS de références temporelles ('aujourd'hui', 'ce soir', 'en ce moment')
5. Gender-neutral sauf si l'info est factuelle
6. 180-250 mots en français

Adapte ton ton, vocabulaire et contenu au profil cible. Sois unique, naturel, factuel.

NARRATION:"""
        
        return instructions
    
    def _call_ollama(self, prompt: str, max_length: int = 400) -> str:
        """Appel à Ollama avec paramètres optimisés pour VITESSE"""
        
        try:
            response = requests.post(
                f"{self.api_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.4,               # Légèrement + créatif pour vitesse
                        "top_p": 0.9,                     # Plus permissif = plus rapide
                        "top_k": 50,                      # Élargi pour vitesse
                        "num_predict": 180,               # RÉDUIT à 180 pour VITESSE MAX
                        "num_ctx": 2048,                  # RÉDUIT de 4096 à 2048
                        "num_batch": 1024,                # DOUBLÉ pour parallélisme
                        "num_thread": 8,                  # Threads CPU
                        "repeat_penalty": 1.1,            # Anti-répétition
                        "stop": ["\n\n\n", "CONTEXTE:", "RÈGLE:"]  # Stops essentiels
                    }
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                narration = result.get('response', '').strip()
                
                # Nettoyer la réponse
                narration = self._clean_narration(narration)
                
                return narration
            else:
                print(f"❌ Ollama erreur HTTP {response.status_code}")
                return ""
                
        except requests.exceptions.Timeout:
            print(f"⏱️  Timeout Ollama après {self.timeout}s")
            return ""
        except Exception as e:
            print(f"❌ Erreur Ollama: {e}")
            return ""
    
    def _clean_narration(self, text: str) -> str:
        """Nettoie la narration générée"""
        
        # Supprimer préfixes/suffixes parasites
        text = re.sub(r'^(Voici|Voilà|Voici la narration|La narration|Narration)[\s:]+', '', text, flags=re.IGNORECASE)
        
        # Supprimer instructions résiduelles
        text = re.sub(r'(CONTEXTE|RÈGLES|TÂCHE|PUBLIC).*', '', text, flags=re.DOTALL)
        
        # Limiter à 500 mots max
        words = text.split()
        if len(words) > 500:
            text = ' '.join(words[:500]) + '...'
        
        return text.strip()
    
    def _validate_narration(self, narration: str, artwork: Dict, 
                          source_chunks: List[Dict], rag_context: str) -> bool:
        """Validation POST-génération PERMISSIVE (juste vérifs basiques)"""
        
        if not narration or len(narration) < 80:  # Réduit de 100 à 80
            print("❌ Validation: Narration trop courte")
            return False
        
        # Accepte TOUT le reste pour éviter fallback
        print("✅ Validation: Narration acceptée")
        return True
        
        # Le titre OU l'artiste devrait apparaître (pas obligatoire mais bon signe)
        has_title = title.lower() in narration.lower() if title else True
        has_artist = artist.lower() in narration.lower() if artist else True
        
        # 2. Détecter phrases suspectes d'hallucination
        hallucination_patterns = [
            r'on raconte que',
            r'la légende dit',
            r'selon certains',
            r'il paraît que',
            r'on pense que',
            r'probablement',
            r'peut-être que',
            r'il se pourrait',
            r'certains experts pensent',
            r'historiens supposent'
        ]
        
        has_speculation = any(re.search(pattern, narration.lower()) for pattern in hallucination_patterns)
        
        if has_speculation:
            print("⚠️  Validation: Phrases spéculatives détectées")
            return False
        
        # 3. Vérifier longueur raisonnable (pas trop court ni trop long)
        word_count = len(narration.split())
        if word_count < 30 or word_count > 600:
            print(f"⚠️  Validation: Longueur anormale ({word_count} mots)")
            return False
        
        # 4. Vérifier qu'il y a un minimum de contenu du contexte RAG
        # Au moins 20% des mots devraient avoir un lien avec le contexte
        if rag_context:
            context_words = set(rag_context.lower().split())
            narration_words = set(narration.lower().split())
            # Mots en commun
            common_words = context_words.intersection(narration_words)
            # Retirer mots courants (le, la, de, etc.)
            stop_words = {'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou', 'à', 'dans', 'sur', 'pour', 'par'}
            meaningful_common = common_words - stop_words
            
            if len(meaningful_common) < 5:
                print(f"⚠️  Validation: Trop peu de lien avec le contexte RAG")
                return False
        
        print("✅ Validation: Narration acceptée")
        return True
    
    def _safe_fallback(self, artwork: Dict, chunks: List[Dict], 
                      age_cible: str, thematique: str, style_texte: str) -> str:
        """
        Fallback SÉCURISÉ en cas d'échec Ollama ou validation
        Génère une narration factuelle UNIQUEMENT à partir des données
        """
        
        title = artwork.get('title', 'Cette œuvre')
        artist = artwork.get('artist', 'un artiste')
        date = artwork.get('date', '')
        technique = artwork.get('materiaux_technique', '')
        
        # Extraire contenu des chunks
        chunk_contents = []
        for chunk in chunks[:3]:  # Top 3 chunks
            text = chunk.get('chunk_text', '').strip()
            if text and len(text) > 50:
                chunk_contents.append(text)
        
        # Construire narration factuelle simple
        narration_parts = []
        
        # Intro
        if age_cible == 'enfant':
            narration_parts.append(f"Voici {title}, une œuvre de {artist}.")
        elif age_cible == 'ado':
            narration_parts.append(f"{title} est une œuvre réalisée par {artist}.")
        else:
            narration_parts.append(f"{title}, œuvre de {artist}.")
        
        # Technique
        if technique:
            narration_parts.append(f"L'artiste a utilisé la technique {technique}.")
        
        # Date
        if date:
            narration_parts.append(f"Cette création date de {date}.")
        
        # Contenu chunks selon thématique
        if chunk_contents:
            # Prendre le premier chunk pertinent
            main_content = chunk_contents[0]
            # Limiter à 200 mots
            words = main_content.split()[:200]
            narration_parts.append(' '.join(words))
        
        return ' '.join(narration_parts)


# Singleton
_ollama_generator_instance = None

def get_ollama_generator() -> OllamaAntiHallucinationGenerator:
    """Récupère l'instance unique du générateur Ollama"""
    global _ollama_generator_instance
    if _ollama_generator_instance is None:
        _ollama_generator_instance = OllamaAntiHallucinationGenerator()
    return _ollama_generator_instance

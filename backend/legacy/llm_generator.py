"""
Générateur de narrations avec LLM (Ollama, Groq, OpenAI)
Génère des narrations UNIQUES basées sur le contenu RAG
"""

import os
from typing import Dict, List, Any, Optional
import requests
import json

from .rag_engine_postgres import get_rag_engine
from .db_postgres import get_artwork


class LLMNarrationGenerator:
    """
    Générateur de narrations uniques via LLM
    Utilise le RAG pour récupérer le contenu pertinent, puis génère avec LLM
    """
    
    def __init__(self, provider: str = "groq"):
        """
        Args:
            provider: 'ollama', 'groq', ou 'openai'
        """
        self.provider = provider.lower()
        self.rag_engine = get_rag_engine()
        
        # Configuration selon le provider
        if self.provider == "ollama":
            self.api_url = os.getenv("OLLAMA_API_URL", "http://localhost:11434")
            self.model = os.getenv("OLLAMA_MODEL", "mistral")
            
        elif self.provider == "groq":
            self.api_key = os.getenv("GROQ_API_KEY")
            self.api_url = "https://api.groq.com/openai/v1/chat/completions"
            self.model = os.getenv("GROQ_MODEL", "mixtral-8x7b-32768")
            
        elif self.provider == "openai":
            self.api_key = os.getenv("OPENAI_API_KEY")
            self.api_url = "https://api.openai.com/v1/chat/completions"
            self.model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        
        print(f"🤖 LLM Generator: {self.provider} ({self.model})")
    
    def generate_narration(self, 
                          oeuvre_id: int,
                          age_cible: str,
                          thematique: str,
                          style_texte: str,
                          max_length: int = 800) -> str:
        """
        Génère une narration unique via LLM
        
        Args:
            oeuvre_id: ID de l'œuvre
            age_cible: 'enfant', 'ado', 'adulte', 'senior'
            thematique: 'technique_picturale', 'biographie', 'historique'
            style_texte: 'analyse', 'decouverte', 'anecdote'
            max_length: Longueur max en caractères
        
        Returns:
            Narration générée
        """
        
        # 1. Récupérer l'œuvre
        artwork = get_artwork(oeuvre_id)
        if not artwork:
            raise ValueError(f"Œuvre {oeuvre_id} non trouvée")
        
        # 2. Construire la requête RAG selon la thématique
        query = self._build_rag_query(artwork, thematique)
        
        # 3. Récupérer le contenu via RAG
        rag_content = self._get_rag_content(oeuvre_id, query)
        
        # 4. Construire le prompt pour le LLM
        prompt = self._build_llm_prompt(
            artwork=artwork,
            rag_content=rag_content,
            age_cible=age_cible,
            thematique=thematique,
            style_texte=style_texte,
            max_length=max_length
        )
        
        # 5. Générer avec le LLM
        narration = self._call_llm(prompt, max_length)
        
        return narration
    
    def _build_rag_query(self, artwork: Dict, thematique: str) -> str:
        """Construit la requête RAG selon la thématique"""
        
        title = artwork.get('title', '')
        artist = artwork.get('artist', '')
        
        if thematique == 'technique_picturale':
            return f"{title} {artist} technique matériaux composition couleurs style peinture"
        
        elif thematique == 'biographie':
            return f"{artist} {title} vie carrière formation influences contexte artistique"
        
        elif thematique == 'historique':
            return f"{title} {artist} contexte historique époque commande réception critique postérité"
        
        return f"{title} {artist}"
    
    def _get_rag_content(self, oeuvre_id: int, query: str, top_k: int = 5) -> str:
        """Récupère le contenu pertinent via RAG"""
        
        try:
            # Rechercher les chunks similaires
            results = self.rag_engine.search_similar_chunks(
                query=query,
                oeuvre_id=oeuvre_id,
                top_k=top_k,
                threshold=0.2
            )
            
            if not results:
                # Fallback: prendre tous les chunks de l'œuvre
                from .db_postgres import get_artwork_chunks
                chunks = get_artwork_chunks(oeuvre_id)
                return '\n\n'.join([c['chunk_text'] for c in chunks[:3]])
            
            # Assembler le contenu des meilleurs chunks
            content_parts = []
            for result in results:
                content_parts.append(result['chunk_text'])
            
            return '\n\n'.join(content_parts)
            
        except Exception as e:
            print(f"⚠️  Erreur RAG: {e}")
            # Fallback basique
            from .db_postgres import get_artwork_chunks
            chunks = get_artwork_chunks(oeuvre_id)
            return '\n\n'.join([c['chunk_text'] for c in chunks[:3]]) if chunks else ""
    
    def _build_llm_prompt(self, 
                         artwork: Dict,
                         rag_content: str,
                         age_cible: str,
                         thematique: str,
                         style_texte: str,
                         max_length: int) -> str:
        """Construit le prompt pour le LLM"""
        
        title = artwork.get('title', 'cette œuvre')
        artist = artwork.get('artist', 'l\'artiste')
        
        # Profils d'âge
        age_instructions = {
            'enfant': "Utilise un vocabulaire simple et des phrases courtes. Sois ludique et encourageant. Maximum 400 mots.",
            'ado': "Utilise un langage accessible et dynamique. Sois captivant. Maximum 500 mots.",
            'adulte': "Utilise un langage riche et précis. Sois informatif et analytique. Maximum 600 mots.",
            'senior': "Utilise un vocabulaire enrichi et des phrases développées. Sois respectueux et approfondi. Maximum 700 mots."
        }
        
        # Thématiques
        theme_instructions = {
            'technique_picturale': "Concentre-toi sur les techniques, matériaux, composition, couleurs et style artistique.",
            'biographie': "Parle de l'artiste, sa vie, sa carrière, ses influences et le contexte de création de l'œuvre.",
            'historique': "Explique le contexte historique, l'époque, la commande, la réception critique et la postérité."
        }
        
        # Styles
        style_instructions = {
            'analyse': "Adopte un ton analytique et structuré. Observe, décris et interprète.",
            'decouverte': "Adopte un ton engageant et exploratoire. Invite à la découverte et à l'émerveillement.",
            'anecdote': "Raconte des histoires et anecdotes fascinantes. Rends l'œuvre vivante et captivante."
        }
        
        prompt = f"""Tu es un guide culturel expert dans un musée. Tu dois créer une narration audio unique et captivante pour l'œuvre "{title}" de {artist}.

**Profil du visiteur:** {age_cible}
**Thématique:** {thematique}
**Style:** {style_texte}

**Instructions:**
- {age_instructions.get(age_cible, '')}
- {theme_instructions.get(thematique, '')}
- {style_instructions.get(style_texte, '')}
- Génère une narration FLUIDE et NATURELLE, comme si tu parlais directement au visiteur
- NE COMMENCE PAS par "Analyse :", "Bienvenue", ou des formules génériques
- Va DIRECTEMENT au contenu
- Utilise UNIQUEMENT les informations ci-dessous (contenu réel de l'œuvre)
- Sois UNIQUE et ORIGINAL - ne répète pas de formules toutes faites

**Informations sur l'œuvre (extraites du PDF):**
{rag_content}

**Narration (commence directement, maximum {max_length} caractères):**"""

        return prompt
    
    def _call_llm(self, prompt: str, max_length: int = 800) -> str:
        """Appelle le LLM pour générer la narration"""
        
        if self.provider == "ollama":
            return self._call_ollama(prompt, max_length)
        elif self.provider == "groq":
            return self._call_groq(prompt, max_length)
        elif self.provider == "openai":
            return self._call_openai(prompt, max_length)
        else:
            raise ValueError(f"Provider non supporté: {self.provider}")
    
    def _call_ollama(self, prompt: str, max_length: int) -> str:
        """Appel à Ollama local"""
        
        try:
            response = requests.post(
                f"{self.api_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "max_tokens": max_length // 3  # ~3 chars par token
                    }
                },
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('response', '').strip()
            else:
                print(f"❌ Erreur Ollama: {response.status_code}")
                return self._fallback_generation(prompt)
                
        except Exception as e:
            print(f"❌ Erreur Ollama: {e}")
            return self._fallback_generation(prompt)
    
    def _call_groq(self, prompt: str, max_length: int) -> str:
        """Appel à Groq API"""
        
        if not self.api_key:
            print("⚠️  GROQ_API_KEY non définie")
            return self._fallback_generation(prompt)
        
        try:
            response = requests.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "max_tokens": max_length // 3
                },
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content'].strip()
            else:
                print(f"❌ Erreur Groq: {response.status_code}")
                return self._fallback_generation(prompt)
                
        except Exception as e:
            print(f"❌ Erreur Groq: {e}")
            return self._fallback_generation(prompt)
    
    def _call_openai(self, prompt: str, max_length: int) -> str:
        """Appel à OpenAI API"""
        
        if not self.api_key:
            print("⚠️  OPENAI_API_KEY non définie")
            return self._fallback_generation(prompt)
        
        try:
            response = requests.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "max_tokens": max_length // 3
                },
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content'].strip()
            else:
                print(f"❌ Erreur OpenAI: {response.status_code}")
                return self._fallback_generation(prompt)
                
        except Exception as e:
            print(f"❌ Erreur OpenAI: {e}")
            return self._fallback_generation(prompt)
    
    def _fallback_generation(self, prompt: str) -> str:
        """Génération de secours si LLM échoue"""
        
        # Extraire le contenu du prompt (après "Informations sur l'œuvre")
        if "Informations sur l'œuvre" in prompt:
            parts = prompt.split("Informations sur l'œuvre")
            if len(parts) > 1:
                content = parts[1].split("**Narration")[0].strip()
                # Nettoyer
                content = content.replace(":**", "").replace("(extraites du PDF):", "").strip()
                return content[:800]
        
        return "Contenu non disponible. Veuillez réessayer."


# Instance globale
_generator = None

def get_llm_generator(provider: str = "groq") -> LLMNarrationGenerator:
    """Singleton pour LLM Generator"""
    global _generator
    if _generator is None:
        _generator = LLMNarrationGenerator(provider=provider)
    return _generator

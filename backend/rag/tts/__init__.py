"""
Module TTS (Text-To-Speech) avec Piper
Génération de narrations audio pour les parcours
"""

from .piper_service import PiperTTSService, get_piper_service

__all__ = ['PiperTTSService', 'get_piper_service']

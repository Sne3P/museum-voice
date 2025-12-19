#!/usr/bin/env python3
"""
Script raccourci pour lancer le traitement des PDFs
Usage: python traitement.py
"""

import sys
import os
from pathlib import Path

# Aller dans le dossier traitement et lancer cli.py
traitement_dir = Path(__file__).parent / "traitement"
os.chdir(traitement_dir)

# Importer et lancer cli
sys.path.append(str(traitement_dir))
from cli import main

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Script raccourci pour lancer la génération de parcours
Usage: python parcours.py
"""

import sys
import os
from pathlib import Path

# Aller dans le dossier parcours et lancer generation_rapide.py
parcours_dir = Path(__file__).parent / "parcours"
os.chdir(parcours_dir)

# Ajouter au path et lancer
sys.path.append(str(parcours_dir))
sys.path.append(str(parcours_dir.parent))
sys.path.append(str(parcours_dir.parent / "core"))

if __name__ == "__main__":
    from generation_rapide import main
    main()
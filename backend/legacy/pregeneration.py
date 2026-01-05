#!/usr/bin/env python3
"""
Script raccourci pour lancer la prégénération
Usage: python pregeneration.py
"""

import sys
import os
from pathlib import Path

# Aller dans le dossier pregeneration et lancer auto_pregeneration_optimized.py
pregeneration_dir = Path(__file__).parent / "pregeneration"
os.chdir(pregeneration_dir)

# Ajouter au path et importer
sys.path.append(str(pregeneration_dir))
sys.path.append(str(pregeneration_dir.parent))
sys.path.append(str(pregeneration_dir.parent / "core"))
sys.path.append(str(pregeneration_dir.parent / "utils"))

if __name__ == "__main__":
    from auto_pregeneration_optimized import main
    main()
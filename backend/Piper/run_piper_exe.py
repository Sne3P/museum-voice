import os
import time
import shutil
import numpy as np
import soundfile as sf
from piper import PiperVoice
import urllib.request

dest_folder = "piper_windows_amd64/piper/voices_models"

os.makedirs(dest_folder, exist_ok=True)

models = [
    {
        "name": "fr_FR-siwis-medium",
        "onnx": "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx",
        "json": "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json",
        "language" : "fr_FR"
    },
    # {
    #     "name": "fr_FR-mls-medium",
    #     "onnx": "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/mls/medium/fr_FR-mls-medium.onnx",
    #     "json": "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/mls/medium/fr_FR-mls-medium.onnx.json",
    #     "language" : "fr_FR"
    # },
    {
        "name": "en_US-ryan-high",
        "onnx": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx",
        "json": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx.json",
        "language" : "en_US"
    }
]

list_model_info = []

for model in models:
    lang_folder = os.path.join(dest_folder, model["language"])
    os.makedirs(lang_folder, exist_ok=True) 
    
    model_path = os.path.join(dest_folder, model["language"], f"{model['name']}.onnx")
    json_path = os.path.join(dest_folder, model["language"], f"{model['name']}.onnx.json")
    
    list_model_info.append({
        "path": model_path,
        "language": model["language"]
    })

    if not os.path.exists(model_path):
        urllib.request.urlretrieve(model["onnx"], model_path)
        print(f"✅ Modèle {model['name']} téléchargé !")
    else:
        print(f"ℹ️ Le modèle {model['name']} existe déjà.")

    if not os.path.exists(json_path):
        urllib.request.urlretrieve(model["json"], json_path)
        print(f"✅ JSON {model['name']} téléchargé !")
    else:
        print(f"ℹ️ Le JSON {model['name']} existe déjà.")

# ===== CONFIG =====
#MODEL = r"piper_windows_amd64\piper\voices_models\fr_FR-mls-medium.onnx"
#MODEL = r"piper_windows_amd64\piper\voices_models\fr_FR-gilles-low.onnx"
#MODEL = r"piper_windows_amd64\piper\voices_models\fr_FR-siwis-medium.onnx"
#MODEL = r"piper_windows_amd64\piper\voices_models\en_US-amy-medium.onnx"
#MODEL = r"piper_windows_amd64\piper\voices_models\en_US-arctic-medium.onnx"
#MODEL = r"piper_windows_amd64\piper\voices_models\tom1.onnx"
#MODEL = r"piper_windows_amd64\piper\voices_models\tom2.onnx"
# MODEL = r"piper_windows_amd64\piper\voices_models\next.onnx"

for info in list_model_info:
    if info["language"] == "fr_FR":  # ou une variable qui contient le le choix de langue
        path_model = info["path"]
        break
    
MODEL = path_model # ou utiliser le chemin directement 
TEXT_DIR = r"Parcours_txt"

LENGTH_SCALE = 0.9
NOISE_SCALE = 0.45
NOISE_W = 0.85

# ---- CRÉATION D'UN DOSSIER UNIQUE PAR EXÉCUTION ----
ROOT_OUTPUT = "Voices"
os.makedirs(ROOT_OUTPUT, exist_ok=True)

timestamp = int(time.time())
parcours_name = f"Parcours_{timestamp}"
OUTPUT_DIR = os.path.join(ROOT_OUTPUT, parcours_name)
os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"📁 Nouveau dossier créé : {OUTPUT_DIR}")

# ---- VÉRIFICATION DU MODÈLE ----
if not os.path.exists(MODEL):
    raise FileNotFoundError(f"❌ Modèle introuvable : {MODEL}")

# ---- CHARGEMENT DU MODÈLE PIPER ----
print("🔄 Chargement du modèle Piper...")
voice = PiperVoice.load(
    MODEL,
    # length_scale=LENGTH_SCALE,
    # noise_scale=NOISE_SCALE,
    # noise_w=NOISE_W
)
print("✅ Modèle chargé")

# Compteur global de fichiers audio créés
created_files_count = 0


def generate_audio(input_path):
    global created_files_count

    basename = os.path.basename(input_path)
    title = os.path.splitext(basename)[0]
    output_file = os.path.join(OUTPUT_DIR, f"{title}.wav")

    with open(input_path, "r", encoding="utf-8") as f:
        text = f.read().strip()

    if not text:
        print(f"⚠️ Fichier vide : {input_path}")
        return

    try:
        print(f"🎤 Génération de : {output_file}")

        audio_chunks = voice.synthesize(text)

        # 🎯 CORRECTION DÉFINITIVE : Utilisation de l'attribut découvert
        audio = np.concatenate([
            np.frombuffer(chunk.audio_int16_bytes, dtype=np.int16)
            for chunk in audio_chunks
        ])

        # Normalisation et conversion en float32 pour soundfile
        audio = audio.astype(np.float32) / 32768.0

        sf.write(
            output_file,
            audio,
            voice.config.sample_rate
        )

        print(f"✅ Audio créé : {output_file}")
        created_files_count += 1

    except Exception as e:
        print(f"❌ Erreur Piper pour {title} : {e}")


def process_all_texts():
    print("🔎 Recherche des textes...")

    if not os.path.exists(TEXT_DIR):
        print(f"❌ Dossier texte introuvable : {TEXT_DIR}")
        return

    files = sorted(os.listdir(TEXT_DIR))

    for file in files:
        if file.endswith(".txt"):
            generate_audio(os.path.join(TEXT_DIR, file))

    print("🎉 Génération terminée.")


def cleanup_if_empty():
    if created_files_count == 0:
        print(f"🗑 Aucun fichier audio n’a été généré. Suppression du dossier : {OUTPUT_DIR}")
        shutil.rmtree(OUTPUT_DIR)
    else:
        print(f"📦 {created_files_count} fichiers audio générés. Dossier conservé.")


if __name__ == "__main__":
    process_all_texts()
    cleanup_if_empty()

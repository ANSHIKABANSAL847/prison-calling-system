import os
import subprocess
import threading
import numpy as np
import shutil
import uuid

from fastapi import FastAPI, UploadFile, File, Form
from speechbrain.pretrained import SpeakerRecognition

# ─────────────────────────────────────────────
# Environment Setup
# ─────────────────────────────────────────────

os.environ["SB_DISABLE_SYMLINKS"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"
os.environ["SPEECHBRAIN_CACHE_DIR"] = os.path.abspath("audio_cache")
os.environ["HF_HOME"] = os.path.abspath("hf_cache")

# ─────────────────────────────────────────────
# App Init
# ─────────────────────────────────────────────

app = FastAPI(title="Voice Verification Service")

model = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir="pretrained_models"
)

DB_PATH = "voices_db.npy"
db_lock = threading.Lock()

# Load DB safely
if os.path.exists(DB_PATH):
    voices_db = np.load(DB_PATH, allow_pickle=True).item()
else:
    voices_db = {}

# ─────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────

def convert_to_wav(input_path: str, output_path: str):
    try:
        cmd = [
            "ffmpeg",
            "-y",
            "-i", input_path,
            "-ac", "1",
            "-ar", "16000",
            output_path
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        raise Exception("FFmpeg conversion failed. Ensure FFmpeg is installed.")

def cosine_similarity(a, b):
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return float(np.dot(a, b) / (norm_a * norm_b))

# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Voice ML Service is running"}

@app.get("/debug")
def debug():
    return {"stored_ids": list(voices_db.keys())}

# ─────────────────────────────────────────────
# ENROLL
# ─────────────────────────────────────────────

@app.post("/enroll")
async def enroll(contactId: str = Form(...), file: UploadFile = File(...)):
    raw_path = f"raw_{uuid.uuid4().hex}"
    wav_path = f"conv_{uuid.uuid4().hex}.wav"

    try:
        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        convert_to_wav(raw_path, wav_path)

        signal = model.load_audio(wav_path)
        embedding = model.encode_batch(signal).squeeze().detach().cpu().numpy()

        with db_lock:
            voices_db[contactId] = embedding
            np.save(DB_PATH, voices_db)

        return {
            "status": "success",
            "contactId": contactId
        }

    except Exception as e:
        print("ENROLL ERROR:", e)
        return {"status": "error", "message": str(e)}

    finally:
        if os.path.exists(raw_path):
            os.remove(raw_path)
        if os.path.exists(wav_path):
            os.remove(wav_path)

# ─────────────────────────────────────────────
# VERIFY (1:1 Matching)
# ─────────────────────────────────────────────

@app.post("/verify")
async def verify(contactId: str = Form(...), file: UploadFile = File(...)):

    if contactId not in voices_db:
        return {
            "authorized": False,
            "message": "Voice not enrolled for this contact"
        }

    raw_path = f"raw_{uuid.uuid4().hex}"
    wav_path = f"conv_{uuid.uuid4().hex}.wav"

    try:
        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        convert_to_wav(raw_path, wav_path)

        signal = model.load_audio(wav_path)
        test_embedding = model.encode_batch(signal).squeeze().detach().cpu().numpy()

        stored_embedding = voices_db[contactId]
        score = cosine_similarity(test_embedding, stored_embedding)

        THRESHOLD = 0.7

        return {
            "authorized": bool(score >= THRESHOLD),
            "score": score,
            "contactId": contactId
        }

    except Exception as e:
        print(" VERIFY ERROR:", e)
        return {"authorized": False, "error": str(e)}

    finally:
        if os.path.exists(raw_path):
            os.remove(raw_path)
        if os.path.exists(wav_path):
            os.remove(wav_path)
import os

#  Disable symlinks on Windows (IMPORTANT)
os.environ["SB_DISABLE_SYMLINKS"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"

# Optional but recommended: force cache dirs
os.environ["SPEECHBRAIN_CACHE_DIR"] = os.path.abspath("audio_cache")
os.environ["HF_HOME"] = os.path.abspath("hf_cache")

from fastapi import FastAPI, UploadFile, File, Form
import numpy as np
from speechbrain.pretrained import SpeakerRecognition
import shutil
import uuid

app = FastAPI(title="Voice Verification Service")

# Load model once
model = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir="pretrained_models"
)

DB_PATH = "voices_db.npy"

# Load or create DB
if os.path.exists(DB_PATH):
    voices_db = np.load(DB_PATH, allow_pickle=True).item()
else:
    voices_db = {}

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

@app.get("/")
def root():
    return {"message": "Voice ML Service is running"}

# -------- ENROLL --------
@app.post("/enroll")
async def enroll(name: str = Form(...), file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1] or ".wav"
    temp_path = f"temp_{uuid.uuid4().hex}{ext}"

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print("File saved:", temp_path)

        signal = model.load_audio(temp_path)
        print("Audio loaded:", signal.shape)

        embedding = model.encode_batch(signal).squeeze().detach().cpu().numpy()
        print("Embedding extracted")

        voices_db[name] = embedding
        np.save(DB_PATH, voices_db)

        return {"status": "success", "message": f"Voice enrolled for {name}"}

    except Exception as e:
        print(" ML ENROLL ERROR:", e)
        return {"status": "error", "message": str(e)}

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
# -------- VERIFY --------
@app.post("/verify")
async def verify(file: UploadFile = File(...)):
    if len(voices_db) == 0:
        return {"authorized": False, "message": "No voices enrolled yet"}

    temp_path = f"temp_{uuid.uuid4().hex}.wav"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    signal = model.load_audio(temp_path)
    test_embedding = model.encode_batch(signal).squeeze().detach().cpu().numpy()

    best_score = -1
    best_person = None

    for person, emb in voices_db.items():
        score = cosine_similarity(test_embedding, emb)
        if score > best_score:
            best_score = score
            best_person = person

    os.remove(temp_path)

    THRESHOLD = 0.7

    if best_score >= THRESHOLD:
        return {
            "authorized": True,
            "person": best_person,
            "score": float(best_score)
        }
    else:
        return {
            "authorized": False,
            "person": None,
            "score": float(best_score)
        }
import os
import subprocess
import numpy as np
import shutil
import uuid
import torch
from dataclasses import dataclass
from typing import Annotated

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from speechbrain.pretrained import SpeakerRecognition
from scipy.io import wavfile as scipy_wavfile

# =========================
# Environment Setup
# =========================

os.environ["SB_DISABLE_SYMLINKS"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"
os.environ["SPEECHBRAIN_CACHE_DIR"] = os.path.abspath("audio_cache")
os.environ["HF_HOME"] = os.path.abspath("hf_cache")

# =========================
# Configuration
# =========================

@dataclass
class Config:
    MATCH_THRESHOLD = 0.70
    SAMPLE_RATE = 16000
    MIN_VOICE_SAMPLES = 5

config = Config()

app = FastAPI(title="Advanced Voice Verification Service (Stateless)")

# =========================
# Load Model
# =========================

model = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir="pretrained_models"
)

# =========================
# Audio Utils
# =========================

FFMPEG = os.environ.get("FFMPEG_PATH", "ffmpeg")

def convert_to_wav(input_path: str, output_path: str):
    cmd = [
        FFMPEG, "-y", "-i", input_path,
        "-ac", "1",
        "-ar", "16000",
        "-acodec", "pcm_s16le",
        output_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def cosine_similarity(a, b):
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

# =========================
# ROUTES
# =========================

@app.get("/")
def root():
    return {"status": "ML service running (stateless mode)"}

# =========================
# MULTI ENROLL (Optional – Just Validates Audio)
# =========================

@app.post("/enroll_multi")
async def enroll_multiple_samples(
    prisonerId: Annotated[str, Form()],
    samples: Annotated[list[UploadFile], File(...)]
):
    if len(samples) < config.MIN_VOICE_SAMPLES:
        raise HTTPException(status_code=400, detail="Minimum 5 samples required")

    return {
        "status": "success",
        "message": "Enrollment handled by backend storage",
        "samples_received": len(samples)
    }

# =========================
# STATELESS VERIFY
# Backend must send:
# - enrolled audio file
# - live audio file
# =========================

@app.post("/verify_advanced")
async def verify_stateless(
    enrolled: UploadFile = File(...),
    live: UploadFile = File(...)
):
    raw_e = f"raw_e_{uuid.uuid4().hex}"
    wav_e = f"conv_e_{uuid.uuid4().hex}.wav"
    raw_l = f"raw_l_{uuid.uuid4().hex}"
    wav_l = f"conv_l_{uuid.uuid4().hex}.wav"

    try:
        # Save both files
        with open(raw_e, "wb") as f:
            shutil.copyfileobj(enrolled.file, f)

        with open(raw_l, "wb") as f:
            shutil.copyfileobj(live.file, f)

        convert_to_wav(raw_e, wav_e)
        convert_to_wav(raw_l, wav_l)

        # Load audio properly (SpeechBrain way)
        sig_e = model.load_audio(wav_e).unsqueeze(0)
        sig_l = model.load_audio(wav_l).unsqueeze(0)

        # Use built-in verification (recommended)
        score, _ = model.verify_batch(sig_e, sig_l)
        score_val = float(score.squeeze().item())

        return {
            "authorized": bool(score_val >= config.MATCH_THRESHOLD),
            "similarity": round(score_val, 4)
        }

    except Exception as e:
        print("VERIFY ERROR:", e)
        return {
            "authorized": False,
            "similarity": 0.0,
            "error": str(e)
        }

    finally:
        for p in [raw_e, wav_e, raw_l, wav_l]:
            if os.path.exists(p):
                os.remove(p)

# =========================
# COMPARE (Pure Similarity API)
# =========================
@app.post("/analyze_speakers")
async def analyze_speakers(audio: UploadFile = File(...)): 
    return { "message": "Analyze endpoint working", "speakers_in_call": 1, "unknown_speakers": 0 }
@app.post("/compare")
async def compare(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...)
):
    raw1 = f"raw1_{uuid.uuid4().hex}"
    wav1 = f"conv1_{uuid.uuid4().hex}.wav"
    raw2 = f"raw2_{uuid.uuid4().hex}"
    wav2 = f"conv2_{uuid.uuid4().hex}.wav"

    try:
        with open(raw1, "wb") as f:
            shutil.copyfileobj(file1.file, f)

        with open(raw2, "wb") as f:
            shutil.copyfileobj(file2.file, f)

        convert_to_wav(raw1, wav1)
        convert_to_wav(raw2, wav2)

        sig1 = model.load_audio(wav1).unsqueeze(0)
        sig2 = model.load_audio(wav2).unsqueeze(0)

        score, _ = model.verify_batch(sig1, sig2)
        score_val = float(score.squeeze().item())

        return {"score": round(score_val, 4)}

    except Exception as e:
        print("COMPARE ERROR:", e)
        return {"score": 0.0, "error": str(e)}

    finally:
        for p in [raw1, wav1, raw2, wav2]:
            if os.path.exists(p):
                os.remove(p)

# =========================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

@app.post("/analyze")
async def analyze(audio: UploadFile = File(...)):
    raw = f"raw_{uuid.uuid4().hex}"
    wav = f"conv_{uuid.uuid4().hex}.wav"

    try:
        with open(raw, "wb") as f:
            shutil.copyfileobj(audio.file, f)

        convert_to_wav(raw, wav)

        signal = model.load_audio(wav)

        duration_sec = len(signal) / config.SAMPLE_RATE

        # --- SIMPLE SNR ESTIMATION ---
        power = np.mean(signal.numpy() ** 2)
        snr_db = 10 * np.log10(power + 1e-6)

        # --- SIMPLE CLARITY SCORE ---
        clarity_score = min(max((snr_db / 30) * 100, 0), 100)

        # --- TEMPORARY SPEAKER COUNT (single speaker only for now) ---
        speaker_count = 1
        speaker_segments = [{"speaker": "S1", "start": 0, "end": duration_sec}]

        return {
            "snr_db": round(float(snr_db), 2),
            "clarity_score": round(float(clarity_score), 2),
            "speaker_count": speaker_count,
            "speaker_segments": speaker_segments,
            "duration_sec": round(float(duration_sec), 2)
        }

    except Exception as e:
        return {
            "snr_db": 0,
            "clarity_score": 0,
            "speaker_count": 1,
            "speaker_segments": [],
            "duration_sec": 0,
            "error": str(e)
        }

    finally:
        for p in [raw, wav]:
            if os.path.exists(p):
                os.remove(p)

@app.post("/diarize_compare")
async def diarize_compare(
    enrolled: UploadFile = File(...),
    live: UploadFile = File(...)
):
    raw_e = f"raw_e_{uuid.uuid4().hex}"
    wav_e = f"conv_e_{uuid.uuid4().hex}.wav"
    raw_l = f"raw_l_{uuid.uuid4().hex}"
    wav_l = f"conv_l_{uuid.uuid4().hex}.wav"

    try:
        with open(raw_e, "wb") as f:
            shutil.copyfileobj(enrolled.file, f)

        with open(raw_l, "wb") as f:
            shutil.copyfileobj(live.file, f)

        convert_to_wav(raw_e, wav_e)
        convert_to_wav(raw_l, wav_l)

        sig_e = model.load_audio(wav_e).unsqueeze(0)
        sig_l = model.load_audio(wav_l).unsqueeze(0)

        score, _ = model.verify_batch(sig_e, sig_l)
        score_val = float(score.squeeze().item())

        return {
            "best_score": round(score_val, 4),
            "speaker_scores": {
                "speaker_1": round(score_val, 4)
            }
        }

    except Exception as e:
        return {
            "best_score": 0.0,
            "speaker_scores": {},
            "error": str(e)
        }

    finally:
        for p in [raw_e, wav_e, raw_l, wav_l]:
            if os.path.exists(p):
                os.remove(p)

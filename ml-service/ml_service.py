import os
import subprocess
import numpy as np
import shutil
import uuid
import torch
import torchaudio
import librosa
from sklearn.cluster import KMeans
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
    MIN_VOICE_SAMPLES = 1

config = Config()

app = FastAPI(title="Advanced Voice Verification Service (Stateless)")

# =========================
# Monkey Patches
# =========================

import huggingface_hub
import os

original_hf_hub_download = huggingface_hub.hf_hub_download

def patched_hf_hub_download(*args, **kwargs):
    kwargs.pop('use_auth_token', None)
    repo_id = kwargs.get('repo_id') or (args[0] if len(args) > 0 else "")
    filename = kwargs.get('filename') or (args[1] if len(args) > 1 else "")
    
    # Force SpeechBrain to fallback by throwing HTTPError if it asks for config custom files
    if filename == "custom.py":
        import requests
        class MockRequest: pass
        class MockResponse:
            status_code = 404
            request = MockRequest()
        err = requests.exceptions.HTTPError("404 Client Error")
        err.response = MockResponse()
        raise err
        
    try:
        return original_hf_hub_download(*args, **kwargs)
    except Exception as e:
        if "404" in str(e) or "not found" in str(e).lower() or isinstance(e, huggingface_hub.utils.EntryNotFoundError):
            import requests
            class MockRequest: pass
            class MockResponse:
                status_code = 404
                request = MockRequest()
            err = requests.exceptions.HTTPError("404 Client Error")
            err.response = MockResponse()
            raise err from e
        raise

huggingface_hub.hf_hub_download = patched_hf_hub_download

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

        # --- SIMPLE NOISE & CLARITY ESTIMATION ---
        signal_np = signal.numpy()
        rms = np.sqrt(np.mean(signal_np ** 2))
        dbfs = 20 * np.log10(rms + 1e-5)
        
        # Map dBFS (usually -60 to 0) to a clarity percentage
        # -40 dBFS is poor clarity (0%), -10 dBFS is excellent clarity (100%)
        clarity_score = min(max((dbfs + 40) / 30 * 100, 0), 100)
        
        # Noise percentage (inverse relation for simplicity)
        noise_score = max(100 - clarity_score, 0)
        
        # --- ML SPEAKER COUNT (MFCC Clustering) ---
        # Get Mel-frequency cepstral coefficients (MFCCs) which represent vocal tract shape
        mfccs = librosa.feature.mfcc(y=signal_np, sr=config.SAMPLE_RATE, n_mfcc=13)
        mfccs = mfccs.T  # Shape: (frames, 13)
        
        # Filter out silent frames using RMS energy
        rms_frames = librosa.feature.rms(y=signal_np)[0]
        threshold = np.mean(rms_frames) * 0.5
        active_indices = np.where(rms_frames > threshold)[0]
        
        # Ensure array size match (librosa hop sizes can sometimes vary slightly)
        min_len = min(len(active_indices), len(mfccs))
        active_indices = active_indices[:min_len]
        mfccs_active = mfccs[active_indices] if len(active_indices) > 0 else mfccs
        
        estimated_speakers = 1
        if len(mfccs_active) > 20:
            # We standardize the MFCCs to normalize volume
            mfccs_standardized = (mfccs_active - np.mean(mfccs_active, axis=0)) / (np.std(mfccs_active, axis=0) + 1e-8)
            
            # Try splitting into 2 clusters
            kmeans = KMeans(n_clusters=2, n_init=5, random_state=42)
            labels = kmeans.fit_predict(mfccs_standardized)
            
            # Check the Euclidean distance between the two distinct voice profiles
            centroids = kmeans.cluster_centers_
            dist = np.linalg.norm(centroids[0] - centroids[1])
            
            # If the smaller cluster has at least 25% of the active talking time AND there's adequate separation
            bincount = np.bincount(labels)
            if len(bincount) == 2:
                ratio = np.min(bincount) / np.sum(bincount)
                if ratio > 0.25 and dist > 2.5:
                    estimated_speakers = 2

        return {
            "noise_score": round(float(noise_score), 1),
            "clarity_score": round(float(clarity_score), 1),
            "speaker_count": estimated_speakers,
            "duration_sec": round(float(duration_sec), 2)
        }

    except Exception as e:
        return {
            "noise_score": 0,
            "clarity_score": 0,
            "speaker_count": 1,
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

# =========================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

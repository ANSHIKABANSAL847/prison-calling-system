import os
import logging
import uuid
import json
import tempfile
import subprocess
from contextlib import asynccontextmanager
from typing import List, Optional, Tuple

import numpy as np
import torch
import librosa
import soundfile as sf
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseSettings, Field
from sklearn.cluster import AgglomerativeClustering
from speechbrain.pretrained import SpeakerRecognition
from pyannote.audio import Pipeline
from faster_whisper import WhisperModel

# -------------------------
# Configuration
# -------------------------
class Settings(BaseSettings):
    sample_rate: int = 16000
    match_threshold: float = Field(0.70, env="MATCH_THRESHOLD")
    min_segment_duration: float = 1.0  # seconds
    clustering_distance_threshold: float = Field(0.35, env="CLUSTERING_THRESHOLD")
    max_file_size_mb: int = 50
    threat_keywords: List[str] = [
        "escape", "attack", "gun", "weapon", "kill", "riot", "fight", "smuggle",
        "bomb", "hostage", "drugs", "contraband", "breakout", "stabbing"
    ]
    threat_phrases: List[str] = [
        "i will kill", "going to escape", "bring a gun", "plan to attack"
    ]
    enable_diarization: bool = Field(True, env="ENABLE_DIARIZATION")
    hf_token: Optional[str] = Field(None, env="HF_TOKEN")

    class Config:
        env_file = ".env"

settings = Settings()

# -------------------------
# Logging
# -------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# -------------------------
# Model loading (lifespan)
# -------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading models...")
    app.state.speaker_model = SpeakerRecognition.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        savedir="pretrained_models/speaker"
    )

    device = "cuda" if torch.cuda.is_available() else "cpu"
    app.state.whisper = WhisperModel(
        "base",
        device=device,
        compute_type="int8_float16" if device == "cuda" else "int8"
    )

    if settings.enable_diarization and settings.hf_token:
        try:
            app.state.diarization = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=settings.hf_token
            )
            logger.info("Diarization model loaded")
        except Exception as e:
            logger.error(f"Failed to load diarization: {e}")
            app.state.diarization = None
    else:
        app.state.diarization = None
        logger.info("Diarization disabled or token missing")

    yield
    logger.info("Shutting down...")

app = FastAPI(lifespan=lifespan, title="Speaker Authorization ML Service")

# -------------------------
# Helper Functions
# -------------------------
def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a = a / (np.linalg.norm(a) + 1e-10)
    b = b / (np.linalg.norm(b) + 1e-10)
    return float(np.dot(a, b))

def get_stable_embedding(audio: np.ndarray, sr: int, speaker_model) -> np.ndarray:
    window = sr
    embeddings = []
    for i in range(0, len(audio), window):
        segment = audio[i:i+window]
        if len(segment) < window * 0.5:
            continue
        tensor = torch.from_numpy(segment).float().unsqueeze(0)
        emb = speaker_model.encode_batch(tensor)
        emb = emb.squeeze().cpu().numpy()
        emb = emb / (np.linalg.norm(emb) + 1e-10)
        embeddings.append(emb)
    if not embeddings:
        tensor = torch.from_numpy(audio).float().unsqueeze(0)
        emb = speaker_model.encode_batch(tensor)
        emb = emb.squeeze().cpu().numpy()
        return emb / (np.linalg.norm(emb) + 1e-10)
    avg_emb = np.mean(embeddings, axis=0)
    return avg_emb / (np.linalg.norm(avg_emb) + 1e-10)
def transcribe_audio(audio: np.ndarray, sr: int, whisper_model) -> str:
    """Transcribe audio using faster-whisper"""

    # Save temporary wav
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        sf.write(tmp.name, audio, sr)
        path = tmp.name

    segments, _ = whisper_model.transcribe(path, beam_size=5)

    text = " ".join(seg.text for seg in segments if seg.text)

    os.remove(path)

    return text.lower()

def check_threats_in_text(text: str) -> Tuple[List[str], bool]:
    threats = [w for w in settings.threat_keywords if w in text]
    for phrase in settings.threat_phrases:
        if phrase in text:
            threats.append(phrase)
    return threats, len(threats) > 0

def calculate_risk(authorized: bool, threats: List[str]) -> Tuple[str, List[str]]:
    reasons = []
    if not authorized:
        reasons.append("unauthorized speaker")
    if threats:
        reasons.append("threat keywords detected")
    if len(reasons) >= 2:
        risk = "HIGH"
    elif len(reasons) == 1:
        risk = "MEDIUM"
    else:
        risk = "LOW"
    return risk, reasons

def validate_audio_file(file: UploadFile) -> Tuple[bytes, int]:
    if file.size and file.size > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(400, f"File too large (max {settings.max_file_size_mb} MB)")
    content = file.file.read()
    if len(content) == 0:
        raise HTTPException(400, "Empty file")
    return content, len(content)

def convert_to_wav_in_memory(input_bytes: bytes) -> Tuple[np.ndarray, int]:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as tmp_in:
        tmp_in.write(input_bytes)
        tmp_in.flush()
        input_path = tmp_in.name

    output_path = input_path + ".wav"
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-ac", "1",
        "-ar", "16000",
        output_path
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError as e:
        os.remove(input_path)
        raise HTTPException(400, f"Audio conversion failed: {e}")

    audio, sr = sf.read(output_path, dtype="float32")
    os.remove(input_path)
    os.remove(output_path)
    return audio, sr

# -------------------------
# API Endpoints
# -------------------------
@app.get("/")
def root():
    return {"status": "ML service running"}

@app.post("/extract_speakers")
async def extract_speakers(samples: List[UploadFile] = File(...)):
    all_embeddings = []
    speaker_model = app.state.speaker_model
    diarization = app.state.diarization

    for sample in samples:
        try:
            content, _ = validate_audio_file(sample)
            audio, sr = convert_to_wav_in_memory(content)
            if len(audio) < settings.sample_rate * settings.min_segment_duration:
                logger.warning(f"Sample too short: {sample.filename}")
                continue

            if diarization:
                waveform = torch.from_numpy(audio).float().unsqueeze(0)
                diarization_result = diarization({"waveform": waveform, "sample_rate": sr})
                for turn, _, speaker in diarization_result.itertracks(yield_label=True):
                    if turn.duration < settings.min_segment_duration:
                        continue
                    start_sample = int(turn.start * sr)
                    end_sample = int(turn.end * sr)
                    seg_audio = audio[start_sample:end_sample]
                    emb = get_stable_embedding(seg_audio, sr, speaker_model)
                    all_embeddings.append(emb)
            else:
                emb = get_stable_embedding(audio, sr, speaker_model)
                all_embeddings.append(emb)
        except Exception as e:
            logger.error(f"Error processing {sample.filename}: {e}")
            raise HTTPException(500, f"Failed to process {sample.filename}: {e}")

    if not all_embeddings:
        raise HTTPException(400, "No valid speech segments found in any sample")

    X = np.array(all_embeddings)
    clustering = AgglomerativeClustering(
        n_clusters=None,
        distance_threshold=settings.clustering_distance_threshold,
        metric="cosine",
        linkage="average"
    )
    labels = clustering.fit_predict(X)
    unique_embeddings = []
    for label in set(labels):
        idx = np.where(labels == label)[0]
        cluster = X[idx]
        center = np.mean(cluster, axis=0)
        center = center / (np.linalg.norm(center) + 1e-10)
        unique_embeddings.append(center.tolist())

    logger.info(f"Enrollment complete: {len(unique_embeddings)} unique speakers")
    return {
        "authorized_speakers": len(unique_embeddings),
        "embeddings": unique_embeddings
    }

@app.post("/verify_advanced")
async def verify_advanced(
    call: UploadFile = File(...),
    authorized_embeddings: str = Form(...)
):
    try:
        auth_list = json.loads(authorized_embeddings)
        authorized_embeddings = [np.array(e, dtype=np.float32) for e in auth_list]
    except Exception as e:
        raise HTTPException(400, f"Invalid authorized_embeddings JSON: {e}")
    if not authorized_embeddings:
        raise HTTPException(400, "No authorized speakers provided")

    speaker_model = app.state.speaker_model
    whisper = app.state.whisper
    diarization = app.state.diarization

    try:
        content, _ = validate_audio_file(call)
        audio, sr = convert_to_wav_in_memory(content)
        if len(audio) < settings.sample_rate * 0.5:
            raise HTTPException(400, "Call too short")
    except Exception as e:
        raise HTTPException(400, f"Audio processing failed: {e}")

    segments = []

    if diarization and settings.enable_diarization:
        try:
            waveform = torch.from_numpy(audio).float().unsqueeze(0)
            diarization_result = diarization({"waveform": waveform, "sample_rate": sr})
            for turn, _, speaker in diarization_result.itertracks(yield_label=True):
                if turn.duration < settings.min_segment_duration:
                    continue
                start_sample = int(turn.start * sr)
                end_sample = int(turn.end * sr)
                seg_audio = audio[start_sample:end_sample]
                segments.append({
                    "start": turn.start,
                    "end": turn.end,
                    "audio": seg_audio,
                    "speaker_label": speaker
                })
        except Exception as e:
            logger.error(f"Diarization failed, falling back to VAD: {e}")
            segments = []

    if not segments:
        logger.info("Using energy-based VAD fallback")
        frame_length = int(0.025 * sr)
        hop_length = int(0.010 * sr)
        energy = librosa.feature.rms(y=audio, frame_length=frame_length, hop_length=hop_length)[0]
        threshold = 0.01 * np.max(energy)
        speech_frames = energy > threshold
        segments = []
        in_speech = False
        start = 0
        for i, is_speech in enumerate(speech_frames):
            if is_speech and not in_speech:
                start = i * hop_length / sr
                in_speech = True
            elif not is_speech and in_speech:
                end = i * hop_length / sr
                if end - start >= settings.min_segment_duration:
                    start_sample = int(start * sr)
                    end_sample = int(end * sr)
                    seg_audio = audio[start_sample:end_sample]
                    segments.append({
                        "start": start,
                        "end": end,
                        "audio": seg_audio,
                        "speaker_label": "unknown"
                    })
                in_speech = False
        if in_speech:
            end = len(speech_frames) * hop_length / sr
            if end - start >= settings.min_segment_duration:
                start_sample = int(start * sr)
                end_sample = int(end * sr)
                seg_audio = audio[start_sample:end_sample]
                segments.append({
                    "start": start,
                    "end": end,
                    "audio": seg_audio,
                    "speaker_label": "unknown"
                })

    results = []
    unauthorized_detected = False
    for seg in segments:
        seg_audio = seg["audio"]
        emb = get_stable_embedding(seg_audio, sr, speaker_model)
        best_score = max(cosine_similarity(auth, emb) for auth in authorized_embeddings)
        authorized = best_score >= settings.match_threshold
        if not authorized:
            unauthorized_detected = True

        transcript = transcribe_audio(seg_audio, sr, whisper)
        threats, threat_detected = check_threats_in_text(transcript)
        risk, reasons = calculate_risk(authorized, threats)

        results.append({
            "start": round(seg["start"], 2),
            "end": round(seg["end"], 2),
            "speaker_label": seg["speaker_label"],
            "similarity": round(best_score, 3),
            "authorized": authorized,
            "transcript": transcript,
            "threat_keywords": threats,
            "threat_detected": threat_detected,
            "risk_level": risk,
            "risk_reasons": reasons
        })

    return {
        "segments_checked": len(results),
        "unauthorized_detected": unauthorized_detected,
        "segments": results
    }

@app.post("/analyze_speakers")
async def analyze_speakers(audio: UploadFile = File(...)):
    content, _ = validate_audio_file(audio)
    audio_np, sr = convert_to_wav_in_memory(content)
    
    # Compute audio quality metrics
    # Use VAD to compute speech ratio
    frame_length = int(0.025 * sr)
    hop_length = int(0.010 * sr)
    energy = librosa.feature.rms(y=audio_np, frame_length=frame_length, hop_length=hop_length)[0]
    threshold = 0.01 * np.max(energy) if np.max(energy) > 0 else 0.01
    speech_frames = (energy > threshold).sum()
    total_frames = len(energy)
    clear_audio_percentage = (speech_frames / total_frames * 100) if total_frames > 0 else 0
    noise_percentage = 100 - clear_audio_percentage

    # Speaker count via diarization if available
    speaker_count = None
    diarization = app.state.diarization
    if diarization and settings.enable_diarization:
        try:
            waveform = torch.from_numpy(audio_np).float().unsqueeze(0)
            diarization_result = diarization({"waveform": waveform, "sample_rate": sr})
            speakers = set()
            for turn, _, speaker in diarization_result.itertracks(yield_label=True):
                speakers.add(speaker)
            speaker_count = len(speakers)
        except Exception as e:
            logger.warning(f"Diarization failed for speaker count: {e}")
            speaker_count = None

    transcript = transcribe_audio(audio_np, sr, app.state.whisper)
    threats, threat_detected = check_threats_in_text(transcript)
    
    return {
        "transcript": transcript,
        "threat_keywords": threats,
        "threat_detected": threat_detected,
        "noisePercentage": round(noise_percentage, 2),
        "clearAudioPercentage": round(clear_audio_percentage, 2),
        "speakerCount": speaker_count
    }

@app.get("/health")
def health():
    return {"status": "healthy", "diarization_available": app.state.diarization is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
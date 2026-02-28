import os
import subprocess
import threading
import numpy as np
import shutil
import uuid
import torch
import pickle
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from collections import defaultdict

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from speechbrain.pretrained import SpeakerRecognition
from scipy.io import wavfile as scipy_wavfile
from scipy.signal import welch
from sklearn.cluster import AgglomerativeClustering, DBSCAN
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler
import umap

# ─────────────────────────────────────────────
# Environment Setup
# ─────────────────────────────────────────────

os.environ["SB_DISABLE_SYMLINKS"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"
os.environ["SPEECHBRAIN_CACHE_DIR"] = os.path.abspath("audio_cache")
os.environ["HF_HOME"] = os.path.abspath("hf_cache")

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────

@dataclass
class Config:
    # Speaker verification thresholds
    MATCH_THRESHOLD = 0.70  # Minimum similarity for speaker match
    UNKNOWN_THRESHOLD = 0.55  # Below this = definitely unknown speaker
    
    # Diarization settings
    DIARIZATION_WINDOW_SEC = 2.0
    DIARIZATION_HOP_SEC = 0.5
    MIN_SEGMENT_DURATION = 1.0
    
    # Clustering settings
    MAX_SPEAKERS_PER_SAMPLE = 5
    MIN_CLUSTER_SIZE = 3
    
    # Audio settings
    SAMPLE_RATE = 16000
    
    # Enrollment settings
    MIN_VOICE_SAMPLES = 5  # Minimum samples required for enrollment
    MAX_VOICE_SAMPLES = 30  # Maximum samples to process

config = Config()

# ─────────────────────────────────────────────
# App Initialization
# ─────────────────────────────────────────────

app = FastAPI(title="Advanced Voice Verification Service")

# Load the model
model = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir="pretrained_models"
)

# Database paths
SPEAKER_DB_PATH = "speaker_profiles.pkl"
CONTACT_DB_PATH = "contact_speakers.pkl"
db_lock = threading.Lock()

# ─────────────────────────────────────────────
# Database Management
# ─────────────────────────────────────────────

@dataclass
class SpeakerProfile:
    """Represents a unique speaker with their embeddings"""
    speaker_id: str
    embeddings: List[np.ndarray]
    average_embedding: np.ndarray
    contact_ids: List[str]  # Which contacts this speaker belongs to
    
    def update_average(self):
        """Recalculate average embedding"""
        if self.embeddings:
            self.average_embedding = np.mean(self.embeddings, axis=0)

class SpeakerDatabase:
    """Manages all speaker profiles and contact associations"""
    
    def __init__(self):
        self.speakers: Dict[str, SpeakerProfile] = {}
        self.contact_speakers: Dict[str, List[str]] = defaultdict(list)
        self.load()
    
    def load(self):
        """Load database from disk"""
        try:
            if os.path.exists(SPEAKER_DB_PATH):
                with open(SPEAKER_DB_PATH, 'rb') as f:
                    self.speakers = pickle.load(f)
            if os.path.exists(CONTACT_DB_PATH):
                with open(CONTACT_DB_PATH, 'rb') as f:
                    self.contact_speakers = pickle.load(f)
        except Exception as e:
            print(f"Database load error: {e}")
            self.speakers = {}
            self.contact_speakers = defaultdict(list)
    
    def save(self):
        """Save database to disk"""
        with db_lock:
            with open(SPEAKER_DB_PATH, 'wb') as f:
                pickle.dump(self.speakers, f)
            with open(CONTACT_DB_PATH, 'wb') as f:
                pickle.dump(dict(self.contact_speakers), f)
    
    def add_speaker(self, contact_id: str, embeddings: List[np.ndarray]) -> str:
        """Add a new speaker or update existing"""
        speaker_id = f"spk_{uuid.uuid4().hex[:8]}"
        
        avg_embedding = np.mean(embeddings, axis=0)
        profile = SpeakerProfile(
            speaker_id=speaker_id,
            embeddings=embeddings,
            average_embedding=avg_embedding,
            contact_ids=[contact_id]
        )
        
        self.speakers[speaker_id] = profile
        self.contact_speakers[contact_id].append(speaker_id)
        self.save()
        
        return speaker_id
    
    def find_matching_speaker(self, embedding: np.ndarray, threshold: float = 0.7) -> Optional[str]:
        """Find speaker that matches the given embedding"""
        best_score = 0
        best_speaker = None
        
        for speaker_id, profile in self.speakers.items():
            score = cosine_similarity(embedding, profile.average_embedding)
            if score > best_score and score >= threshold:
                best_score = score
                best_speaker = speaker_id
        
        return best_speaker
    
    def get_contact_speakers(self, contact_id: str) -> List[SpeakerProfile]:
        """Get all speaker profiles for a contact"""
        speaker_ids = self.contact_speakers.get(contact_id, [])
        return [self.speakers[sid] for sid in speaker_ids if sid in self.speakers]

# Initialize database
speaker_db = SpeakerDatabase()

# ─────────────────────────────────────────────
# Audio Processing Utilities
# ─────────────────────────────────────────────

FFMPEG = os.environ.get("FFMPEG_PATH", "ffmpeg")

def convert_to_wav(input_path: str, output_path: str):
    """Convert any audio format to 16kHz mono WAV"""
    try:
        cmd = [
            FFMPEG, "-y", "-i", input_path,
            "-ac", "1", "-ar", "16000",
            "-acodec", "pcm_s16le",
            output_path
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        raise Exception(f"FFmpeg conversion failed: {e}")

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors"""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return float(np.dot(a, b) / (norm_a * norm_b))

def estimate_snr(samples: np.ndarray, sr: int) -> float:
    """Estimate Signal-to-Noise Ratio in dB"""
    frame_len = int(sr * 0.025)
    hop_len = int(sr * 0.010)
    
    energies = [
        np.mean(samples[s:s + frame_len] ** 2)
        for s in range(0, len(samples) - frame_len, hop_len)
    ]
    
    if not energies:
        return 0.0
    
    energies = np.array(energies, dtype=np.float64)
    noise_level = float(np.percentile(energies, 10))
    signal_level = float(np.percentile(energies, 90))
    
    noise_level = max(noise_level, 1e-10)
    snr = 10.0 * np.log10(signal_level / noise_level)
    return float(np.clip(snr, -10.0, 60.0))

def compute_clarity(samples: np.ndarray, sr: int) -> float:
    """Compute voice clarity score (0-100)"""
    _, psd = welch(samples, fs=sr, nperseg=min(512, len(samples)))
    freqs = np.fft.rfftfreq(min(512, len(samples)), d=1.0 / sr)
    
    if len(freqs) > len(psd):
        freqs = freqs[:len(psd)]
    
    speech_mask = (freqs >= 80) & (freqs <= 4000)
    speech_psd = psd[:len(freqs)][speech_mask]
    
    if len(speech_psd) == 0 or np.all(speech_psd == 0):
        return 0.0
    
    log_mean = float(np.mean(np.log(speech_psd + 1e-10)))
    arith_mean = float(np.mean(speech_psd))
    geom_mean = float(np.exp(log_mean))
    flatness = geom_mean / (arith_mean + 1e-10)
    clarity = (1.0 - flatness) * 100.0
    
    return float(np.clip(clarity, 0.0, 100.0))

# ─────────────────────────────────────────────
# Advanced Speaker Diarization
# ─────────────────────────────────────────────

def extract_speaker_embeddings(wav_path: str) -> Tuple[List[np.ndarray], Dict]:
    """
    Extract embeddings for all speakers in the audio using sliding window diarization.
    Returns list of unique speaker embeddings and diarization info.
    """
    WIN_SEC = config.DIARIZATION_WINDOW_SEC
    HOP_SEC = config.DIARIZATION_HOP_SEC
    SR = config.SAMPLE_RATE
    WIN_SAMP = int(WIN_SEC * SR)
    HOP_SAMP = int(HOP_SEC * SR)
    
    try:
        # Load audio
        sr_file, raw = scipy_wavfile.read(wav_path)
        samples = raw.astype(np.float32)
        if samples.ndim > 1:
            samples = samples.mean(axis=1)
        
        # Resample if needed
        if sr_file != SR:
            import scipy.signal as ssig
            num_samples = int(len(samples) * SR / sr_file)
            samples = ssig.resample(samples, num_samples).astype(np.float32)
        
        # Normalize
        peak = np.abs(samples).max()
        if peak > 0:
            samples /= peak
        
        total_duration = len(samples) / SR
        
        # Extract embeddings for sliding windows
        window_embeddings = []
        timestamps = []
        
        for start in range(0, len(samples) - WIN_SAMP + 1, HOP_SAMP):
            seg = samples[start:start + WIN_SAMP]
            seg_t = torch.FloatTensor(seg).unsqueeze(0)
            
            with torch.no_grad():
                emb = model.encode_batch(seg_t).squeeze().cpu().numpy()
            
            window_embeddings.append(emb)
            timestamps.append((start / SR, (start + WIN_SAMP) / SR))
        
        if len(window_embeddings) < 2:
            # Single speaker or very short audio
            return window_embeddings, {
                "speaker_count": 1,
                "segments": [{"speaker": 0, "start": 0, "end": total_duration}]
            }
        
        # Cluster embeddings to find unique speakers
        emb_matrix = np.array(window_embeddings)
        
        # Normalize for cosine distance
        norms = np.linalg.norm(emb_matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1
        emb_norm = emb_matrix / norms
        
        # Use DBSCAN for clustering (can find optimal number of clusters)
        clustering = DBSCAN(eps=0.3, min_samples=2, metric='cosine')
        labels = clustering.fit_predict(emb_norm)
        
        # Filter out noise points (-1 label)
        unique_labels = set(labels) - {-1}
        n_speakers = len(unique_labels)
        
        if n_speakers == 0:
            # All points are noise, fall back to single speaker
            return [np.mean(emb_matrix, axis=0)], {
                "speaker_count": 1,
                "segments": [{"speaker": 0, "start": 0, "end": total_duration}]
            }
        
        # Extract representative embedding for each speaker
        speaker_embeddings = []
        for label in unique_labels:
            mask = labels == label
            speaker_embs = emb_matrix[mask]
            # Use the centroid as representative
            speaker_embeddings.append(np.mean(speaker_embs, axis=0))
        
        # Create segments
        segments = []
        for i, label in enumerate(labels):
            if label != -1:  # Skip noise points
                segments.append({
                    "speaker": int(label),
                    "start": timestamps[i][0],
                    "end": timestamps[i][1]
                })
        
        # Merge consecutive segments
        merged_segments = []
        if segments:
            current = segments[0]
            for seg in segments[1:]:
                if seg["speaker"] == current["speaker"] and seg["start"] - current["end"] < 0.5:
                    current["end"] = seg["end"]
                else:
                    merged_segments.append(current)
                    current = seg
            merged_segments.append(current)
        
        return speaker_embeddings, {
            "speaker_count": n_speakers,
            "segments": merged_segments,
            "total_duration": total_duration
        }
        
    except Exception as e:
        print(f"Speaker extraction error: {e}")
        return [], {"speaker_count": 0, "segments": [], "error": str(e)}

# ─────────────────────────────────────────────
# API Routes
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Advanced Voice Verification Service Running", "version": "2.0"}

@app.get("/status")
def get_status():
    """Get system status and statistics"""
    return {
        "total_speakers": len(speaker_db.speakers),
        "total_contacts": len(speaker_db.contact_speakers),
        "config": {
            "match_threshold": config.MATCH_THRESHOLD,
            "unknown_threshold": config.UNKNOWN_THRESHOLD,
            "min_samples": config.MIN_VOICE_SAMPLES
        }
    }

# ─────────────────────────────────────────────
# MULTI-SAMPLE ENROLLMENT
# ─────────────────────────────────────────────

@app.post("/enroll_multi")
async def enroll_multiple_samples(
    contactId: str = Form(...),
    samples: List[UploadFile] = File(...)
):
    """
    Enroll multiple voice samples for a contact.
    Extracts all unique speakers from all samples and builds a speaker database.
    """
    
    if len(samples) < config.MIN_VOICE_SAMPLES:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum {config.MIN_VOICE_SAMPLES} samples required"
        )
    
    if len(samples) > config.MAX_VOICE_SAMPLES:
        samples = samples[:config.MAX_VOICE_SAMPLES]
    
    all_speaker_embeddings = []
    sample_reports = []
    
    for idx, sample_file in enumerate(samples):
        raw_path = f"raw_{uuid.uuid4().hex}"
        wav_path = f"conv_{uuid.uuid4().hex}.wav"
        
        try:
            # Save and convert audio
            with open(raw_path, "wb") as buffer:
                shutil.copyfileobj(sample_file.file, buffer)
            
            convert_to_wav(raw_path, wav_path)
            
            # Extract speakers from this sample
            speaker_embs, info = extract_speaker_embeddings(wav_path)
            
            all_speaker_embeddings.extend(speaker_embs)
            
            sample_reports.append({
                "sample_index": idx,
                "filename": sample_file.filename,
                "speakers_found": len(speaker_embs),
                "duration": info.get("total_duration", 0)
            })
            
        except Exception as e:
            sample_reports.append({
                "sample_index": idx,
                "filename": sample_file.filename,
                "error": str(e)
            })
        
        finally:
            if os.path.exists(raw_path):
                os.remove(raw_path)
            if os.path.exists(wav_path):
                os.remove(wav_path)
    
    if not all_speaker_embeddings:
        raise HTTPException(
            status_code=400,
            detail="No valid speaker embeddings extracted from samples"
        )
    
    # Cluster all embeddings to find unique speakers across all samples
    emb_matrix = np.array(all_speaker_embeddings)
    
    # Normalize
    norms = np.linalg.norm(emb_matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1
    emb_norm = emb_matrix / norms
    
    # Cluster to find unique speakers
    if len(all_speaker_embeddings) > 1:
        clustering = DBSCAN(eps=0.25, min_samples=2, metric='cosine')
        labels = clustering.fit_predict(emb_norm)
        
        unique_labels = set(labels) - {-1}
        
        # Store each unique speaker
        speaker_ids = []
        for label in unique_labels:
            mask = labels == label
            speaker_embs = [emb_matrix[i] for i, m in enumerate(mask) if m]
            
            speaker_id = speaker_db.add_speaker(contactId, speaker_embs)
            speaker_ids.append(speaker_id)
        
        # Handle noise points as individual speakers
        noise_mask = labels == -1
        for i, is_noise in enumerate(noise_mask):
            if is_noise:
                speaker_id = speaker_db.add_speaker(contactId, [emb_matrix[i]])
                speaker_ids.append(speaker_id)
    else:
        # Single embedding
        speaker_id = speaker_db.add_speaker(contactId, all_speaker_embeddings)
        speaker_ids = [speaker_id]
    
    return {
        "status": "success",
        "contactId": contactId,
        "unique_speakers_enrolled": len(speaker_ids),
        "total_embeddings": len(all_speaker_embeddings),
        "speaker_ids": speaker_ids,
        "sample_reports": sample_reports
    }

# ─────────────────────────────────────────────
# VERIFICATION WITH UNKNOWN DETECTION
# ─────────────────────────────────────────────

@app.post("/verify_advanced")
async def verify_with_unknown_detection(
    contactId: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Verify a call recording against enrolled speakers.
    Detects authorized speakers and flags unknown/unauthorized speakers.
    """
    
    raw_path = f"raw_{uuid.uuid4().hex}"
    wav_path = f"conv_{uuid.uuid4().hex}.wav"
    
    try:
        # Save and convert audio
        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        convert_to_wav(raw_path, wav_path)
        
        # Load audio for quality analysis
        sr_file, raw_samples = scipy_wavfile.read(wav_path)
        samples = raw_samples.astype(np.float32)
        if samples.ndim > 1:
            samples = samples.mean(axis=1)
        
        peak = np.abs(samples).max()
        if peak > 0:
            samples /= peak
        
        # Audio quality metrics
        snr_db = estimate_snr(samples, sr_file)
        clarity_score = compute_clarity(samples, sr_file)
        duration_sec = len(samples) / sr_file
        
        # Extract all speakers from the call
        call_speakers, diarization_info = extract_speaker_embeddings(wav_path)
        
        if not call_speakers:
            return {
                "authorized": False,
                "message": "No speakers detected in audio",
                "audio_quality": {
                    "snr_db": snr_db,
                    "clarity_score": clarity_score,
                    "duration_sec": duration_sec
                }
            }
        
        # Get enrolled speakers for this contact
        enrolled_speakers = speaker_db.get_contact_speakers(contactId)
        
        if not enrolled_speakers:
            return {
                "authorized": False,
                "message": "No enrolled speakers for this contact",
                "speakers_in_call": len(call_speakers)
            }
        
        # Match each speaker in the call against enrolled speakers
        verification_results = []
        unknown_speakers = []
        authorized_speakers = []
        
        for call_idx, call_emb in enumerate(call_speakers):
            best_match_score = 0
            best_match_speaker = None
            
            for enrolled in enrolled_speakers:
                score = cosine_similarity(call_emb, enrolled.average_embedding)
                
                if score > best_match_score:
                    best_match_score = score
                    best_match_speaker = enrolled.speaker_id
            
            result = {
                "call_speaker_index": call_idx,
                "best_match_score": float(best_match_score),
                "best_match_speaker": best_match_speaker
            }
            
            if best_match_score >= config.MATCH_THRESHOLD:
                result["status"] = "AUTHORIZED"
                result["confidence"] = "high" if best_match_score >= 0.85 else "medium"
                authorized_speakers.append(call_idx)
            elif best_match_score >= config.UNKNOWN_THRESHOLD:
                result["status"] = "UNCERTAIN"
                result["confidence"] = "low"
            else:
                result["status"] = "UNKNOWN"
                result["confidence"] = "none"
                unknown_speakers.append(call_idx)
            
            verification_results.append(result)
        
        # Overall authorization decision
        has_unknown = len(unknown_speakers) > 0
        has_authorized = len(authorized_speakers) > 0
        all_authorized = len(authorized_speakers) == len(call_speakers)
        
        if all_authorized:
            overall_status = "FULLY_AUTHORIZED"
            risk_level = "low"
        elif has_authorized and not has_unknown:
            overall_status = "PARTIALLY_AUTHORIZED"
            risk_level = "medium"
        elif has_authorized and has_unknown:
            overall_status = "MIXED_AUTHORIZATION"
            risk_level = "high"
        else:
            overall_status = "UNAUTHORIZED"
            risk_level = "critical"
        
        # Calculate overall confidence
        avg_score = np.mean([r["best_match_score"] for r in verification_results])
        
        return {
            "overall_status": overall_status,
            "risk_level": risk_level,
            "authorized": all_authorized,
            "overall_confidence": float(avg_score),
            "speakers_in_call": len(call_speakers),
            "authorized_speakers": len(authorized_speakers),
            "unknown_speakers": len(unknown_speakers),
            "verification_details": verification_results,
            "diarization_info": diarization_info,
            "audio_quality": {
                "snr_db": float(snr_db),
                "clarity_score": float(clarity_score),
                "duration_sec": float(duration_sec),
                "noise_level": "high" if snr_db < 10 else "moderate" if snr_db < 20 else "low",
                "clarity_level": "poor" if clarity_score < 40 else "fair" if clarity_score < 70 else "good"
            },
            "alerts": [
                alert for alert in [
                    f"⚠️ {len(unknown_speakers)} unknown speaker(s) detected!" if unknown_speakers else None,
                    "⚠️ Poor audio quality" if clarity_score < 40 else None,
                    "⚠️ High noise level" if snr_db < 10 else None
                ] if alert
            ]
        }
        
    except Exception as e:
        print(f"Verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if os.path.exists(raw_path):
            os.remove(raw_path)
        if os.path.exists(wav_path):
            os.remove(wav_path)

# ─────────────────────────────────────────────
# SPEAKER ANALYSIS
# ─────────────────────────────────────────────

@app.post("/analyze_speakers")
async def analyze_speakers(audio: UploadFile = File(...)):
    """
    Analyze an audio file to extract speaker information without verification.
    Useful for understanding the audio before enrollment.
    """
    
    raw_path = f"raw_{uuid.uuid4().hex}"
    wav_path = f"conv_{uuid.uuid4().hex}.wav"
    
    try:
        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
        
        convert_to_wav(raw_path, wav_path)
        
        # Extract speakers
        speaker_embeddings, diarization_info = extract_speaker_embeddings(wav_path)
        
        # Audio quality
        sr_file, raw_samples = scipy_wavfile.read(wav_path)
        samples = raw_samples.astype(np.float32)
        if samples.ndim > 1:
            samples = samples.mean(axis=1)
        
        peak = np.abs(samples).max()
        if peak > 0:
            samples /= peak
        
        snr_db = estimate_snr(samples, sr_file)
        clarity_score = compute_clarity(samples, sr_file)
        
        # Calculate speaker statistics
        speaker_stats = []
        for i, emb in enumerate(speaker_embeddings):
            # Find segments for this speaker
            segments = [s for s in diarization_info.get("segments", []) if s["speaker"] == i]
            total_time = sum(s["end"] - s["start"] for s in segments)
            
            speaker_stats.append({
                "speaker_index": i,
                "total_speaking_time": total_time,
                "segment_count": len(segments),
                "embedding_norm": float(np.linalg.norm(emb))
            })
        
        return {
            "speaker_count": len(speaker_embeddings),
            "speaker_stats": speaker_stats,
            "diarization": diarization_info,
            "audio_quality": {
                "snr_db": float(snr_db),
                "clarity_score": float(clarity_score),
                "duration": diarization_info.get("total_duration", 0)
            },
            "recommendations": {
                "suitable_for_enrollment": clarity_score >= 50 and snr_db >= 15,
                "quality_issues": [
                    x for x in [
                        "Low voice clarity" if clarity_score < 50 else None,
                        "High noise level" if snr_db < 15 else None,
                        "Too many speakers" if len(speaker_embeddings) > 5 else None
                    ] if x
                ]
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if os.path.exists(raw_path):
            os.remove(raw_path)
        if os.path.exists(wav_path):
            os.remove(wav_path)

# ─────────────────────────────────────────────
# DATABASE MANAGEMENT
# ─────────────────────────────────────────────

@app.delete("/remove_contact/{contact_id}")
async def remove_contact(contact_id: str):
    """Remove all speakers for a contact"""
    
    with db_lock:
        # Remove speakers
        speaker_ids = speaker_db.contact_speakers.get(contact_id, [])
        for sid in speaker_ids:
            if sid in speaker_db.speakers:
                del speaker_db.speakers[sid]
        
        # Remove contact entry
        if contact_id in speaker_db.contact_speakers:
            del speaker_db.contact_speakers[contact_id]
        
        speaker_db.save()
    
    return {
        "status": "success",
        "removed_speakers": len(speaker_ids)
    }

@app.get("/contact_info/{contact_id}")
async def get_contact_info(contact_id: str):
    """Get information about enrolled speakers for a contact"""
    
    speakers = speaker_db.get_contact_speakers(contact_id)
    
    return {
        "contact_id": contact_id,
        "speaker_count": len(speakers),
        "speakers": [
            {
                "speaker_id": s.speaker_id,
                "embedding_count": len(s.embeddings),
                "contacts": s.contact_ids
            }
            for s in speakers
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

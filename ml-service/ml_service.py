import os
import subprocess
import threading
import numpy as np
import shutil
import uuid
import torch

from fastapi import FastAPI, UploadFile, File, Form
from speechbrain.pretrained import SpeakerRecognition
from scipy.io import wavfile as scipy_wavfile
from scipy.signal import welch
try:
    from sklearn.cluster import AgglomerativeClustering
    from sklearn.metrics import silhouette_score
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

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
    try:
        voices_db = np.load(DB_PATH, allow_pickle=True).item()
    except (EOFError, ValueError, Exception):
        print("[WARN] voices_db.npy is corrupt or empty — starting fresh")
        os.remove(DB_PATH)
        voices_db = {}
else:
    voices_db = {}

# ─────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────

FFMPEG = os.environ.get(
    "FFMPEG_PATH",
    r"C:\Users\Satyam Pandey\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe"
)

def convert_to_wav(input_path: str, output_path: str):
    try:
        cmd = [
            FFMPEG,
            "-y",
            "-i", input_path,
            "-ac", "1",
            "-ar", "16000",
            output_path
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        raise Exception(f"FFmpeg conversion failed: {e}")

def cosine_similarity(a, b):
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return float(np.dot(a, b) / (norm_a * norm_b))


# ─────────────────────────────────────────────
# Audio Quality Helpers
# ─────────────────────────────────────────────

def estimate_snr(samples: np.ndarray, sr: int) -> float:
    """Estimate Signal-to-Noise Ratio in dB using frame energy statistics."""
    frame_len = int(sr * 0.025)   # 25 ms frames
    hop_len   = int(sr * 0.010)   # 10 ms hop

    energies = [
        np.mean(samples[s:s + frame_len] ** 2)
        for s in range(0, len(samples) - frame_len, hop_len)
    ]
    if not energies:
        return 0.0

    energies = np.array(energies, dtype=np.float64)
    noise_level  = float(np.percentile(energies, 10))   # quietest 10 % = noise floor
    signal_level = float(np.percentile(energies, 90))   # loudest  10 % = speech

    noise_level = max(noise_level, 1e-10)
    snr = 10.0 * np.log10(signal_level / noise_level)
    return float(np.clip(snr, -10.0, 60.0))


def compute_clarity(samples: np.ndarray, sr: int) -> float:
    """
    Voice clarity score 0-100.
    Based on spectral flatness in the speech band (80-4000 Hz).
    High flatness → noisy → low clarity.
    """
    _, psd = welch(samples, fs=sr, nperseg=min(512, len(samples)))
    freqs  = np.fft.rfftfreq(min(512, len(samples)), d=1.0 / sr)
    if len(freqs) > len(psd):
        freqs = freqs[:len(psd)]

    speech_mask  = (freqs >= 80) & (freqs <= 4000)
    speech_psd   = psd[:len(freqs)][speech_mask]

    if len(speech_psd) == 0 or np.all(speech_psd == 0):
        return 0.0

    log_mean      = float(np.mean(np.log(speech_psd + 1e-10)))
    arith_mean    = float(np.mean(speech_psd))
    geom_mean     = float(np.exp(log_mean))
    flatness      = geom_mean / (arith_mean + 1e-10)
    clarity       = (1.0 - flatness) * 100.0
    return float(np.clip(clarity, 0.0, 100.0))


def diarize(wav_path: str, max_speakers: int = 4):
    """
    Embedding-based speaker diarization using ECAPA-TDNN.
    Uses 2-second sliding windows + agglomerative clustering.
    Returns (speaker_count, segments) where each segment is
    {"speaker": int, "start": float, "end": float}.
    """
    WINDOW_SEC = 2.0
    HOP_SEC    = 0.75
    SR         = 16000
    WIN_SAMP   = int(WINDOW_SEC * SR)
    HOP_SAMP   = int(HOP_SEC   * SR)

    try:
        sr_file, raw = scipy_wavfile.read(wav_path)
        samples = raw.astype(np.float32)
        if samples.ndim > 1:
            samples = samples.mean(axis=1)
        # Resample to 16 kHz if needed (simple approach)
        if sr_file != SR:
            import scipy.signal as ssig
            num_samples = int(len(samples) * SR / sr_file)
            samples = ssig.resample(samples, num_samples).astype(np.float32)
        # Normalize
        peak = np.abs(samples).max()
        if peak > 0:
            samples /= peak

        total_duration = len(samples) / SR

        if total_duration < WINDOW_SEC:
            return 1, [{"speaker": 0, "start": 0.0, "end": round(total_duration, 2)}]

        embeddings  = []
        timestamps  = []

        for start in range(0, len(samples) - WIN_SAMP + 1, HOP_SAMP):
            seg = samples[start:start + WIN_SAMP]
            seg_t = torch.FloatTensor(seg).unsqueeze(0)
            with torch.no_grad():
                emb = model.encode_batch(seg_t).squeeze().cpu().numpy()
            embeddings.append(emb)
            timestamps.append((round(start / SR, 2), round((start + WIN_SAMP) / SR, 2)))

        if len(embeddings) < 2 or not HAS_SKLEARN:
            return 1, [{"speaker": 0, "start": 0.0, "end": round(total_duration, 2)}]

        emb_matrix = np.array(embeddings)
        # Normalize embeddings for cosine distance
        norms = np.linalg.norm(emb_matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1
        emb_norm = emb_matrix / norms

        # Find best speaker count by silhouette score
        best_n     = 1
        best_sil   = -1.0
        upper_n    = min(max_speakers + 1, len(embeddings))

        for n in range(2, upper_n):
            try:
                clust  = AgglomerativeClustering(n_clusters=n, metric="cosine", linkage="average")
                labels = clust.fit_predict(emb_norm)
                if len(set(labels)) > 1:
                    sil = silhouette_score(emb_norm, labels, metric="cosine")
                    if sil > best_sil:
                        best_sil = sil
                        best_n   = n
            except Exception:
                pass

        if best_n == 1:
            labels = np.zeros(len(embeddings), dtype=int)
        else:
            clust  = AgglomerativeClustering(n_clusters=best_n, metric="cosine", linkage="average")
            labels = clust.fit_predict(emb_norm)

        # Merge consecutive same-speaker windows into segments
        segments   = []
        prev_lbl   = int(labels[0])
        seg_start  = timestamps[0][0]

        for i in range(1, len(labels)):
            if int(labels[i]) != prev_lbl:
                segments.append({"speaker": prev_lbl, "start": seg_start, "end": timestamps[i - 1][1]})
                seg_start = timestamps[i][0]
                prev_lbl  = int(labels[i])

        segments.append({"speaker": prev_lbl, "start": seg_start, "end": timestamps[-1][1]})

        return best_n, segments

    except Exception as e:
        print("DIARIZE ERROR:", e)
        return 1, [{"speaker": 0, "start": 0.0, "end": 0.0}]

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

# ---------------------------------------------
# COMPARE (stateless � no DB needed)
# Backend fetches stored audio from Cloudinary and sends both files here.
# Returns only the similarity score; authorization decision is in the backend.
# ---------------------------------------------

@app.post("/compare")
async def compare(file1: UploadFile = File(...), file2: UploadFile = File(...)):
    raw1 = f"raw1_{uuid.uuid4().hex}"
    wav1 = f"conv1_{uuid.uuid4().hex}.wav"
    raw2 = f"raw2_{uuid.uuid4().hex}"
    wav2 = f"conv2_{uuid.uuid4().hex}.wav"

    try:
        with open(raw1, "wb") as buf:
            shutil.copyfileobj(file1.file, buf)
        with open(raw2, "wb") as buf:
            shutil.copyfileobj(file2.file, buf)

        convert_to_wav(raw1, wav1)
        convert_to_wav(raw2, wav2)

        # load_audio returns 1-D tensor [samples]; verify_batch needs [batch, samples]
        import torch
        sig1 = model.load_audio(wav1).unsqueeze(0)   # [1, samples]
        sig2 = model.load_audio(wav2).unsqueeze(0)   # [1, samples]

        # verify_batch uses the model's own cosine-similarity (same as training)
        # SpeechBrain's ECAPA-TDNN built-in threshold is 0.25
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


# ─────────────────────────────────────────────
# ANALYZE — noise level, voice clarity, speaker count
# Returns audio quality metrics without doing identity verification.
# ─────────────────────────────────────────────

@app.post("/analyze")
async def analyze_audio(audio: UploadFile = File(...)):
    raw_path = f"raw_{uuid.uuid4().hex}"
    wav_path = f"conv_{uuid.uuid4().hex}.wav"

    try:
        with open(raw_path, "wb") as buf:
            shutil.copyfileobj(audio.file, buf)

        convert_to_wav(raw_path, wav_path)

        sr_file, raw_samples = scipy_wavfile.read(wav_path)
        samples = raw_samples.astype(np.float32)
        if samples.ndim > 1:
            samples = samples.mean(axis=1)
        # Normalize to [-1, 1]
        peak = np.abs(samples).max()
        if peak > 0:
            samples /= peak

        snr_db          = estimate_snr(samples, sr_file)
        clarity_score   = compute_clarity(samples, sr_file)
        speaker_count, segments = diarize(wav_path)
        duration_sec    = round(len(samples) / sr_file, 2)

        return {
            "snr_db":          round(snr_db,        2),
            "clarity_score":   round(clarity_score, 2),
            "speaker_count":   speaker_count,
            "speaker_segments": segments,
            "duration_sec":    duration_sec,
        }

    except Exception as e:
        print("ANALYZE ERROR:", e)
        return {
            "snr_db": 0.0, "clarity_score": 0.0,
            "speaker_count": 1, "speaker_segments": [],
            "duration_sec": 0.0, "error": str(e),
        }
    finally:
        for p in [raw_path, wav_path]:
            if os.path.exists(p):
                os.remove(p)


# ─────────────────────────────────────────────
# DIARIZE_COMPARE — multi-speaker aware identity check
# Diarizes the live audio, builds a per-speaker embedding, compares
# each against the enrolled voice. Best-matching speaker's score wins.
# Sends:  enrolled (stored audio file) + live (incoming audio file)
# Returns: best_score, speaker_count, per-speaker scores, segments
# ─────────────────────────────────────────────

@app.post("/diarize_compare")
async def diarize_compare(enrolled: UploadFile = File(...), live: UploadFile = File(...)):
    raw_e = f"raw_e_{uuid.uuid4().hex}"
    wav_e = f"conv_e_{uuid.uuid4().hex}.wav"
    raw_l = f"raw_l_{uuid.uuid4().hex}"
    wav_l = f"conv_l_{uuid.uuid4().hex}.wav"

    try:
        with open(raw_e, "wb") as buf:
            shutil.copyfileobj(enrolled.file, buf)
        with open(raw_l, "wb") as buf:
            shutil.copyfileobj(live.file, buf)

        convert_to_wav(raw_e, wav_e)
        convert_to_wav(raw_l, wav_l)

        # Enrolled embedding
        sig_e = model.load_audio(wav_e).unsqueeze(0)   # [1, samples]
        with torch.no_grad():
            emb_e = model.encode_batch(sig_e).squeeze().cpu().numpy()

        # Diarize live audio
        speaker_count, segments = diarize(wav_l)

        # Load live audio for segment slicing
        sr_l, raw_l_data = scipy_wavfile.read(wav_l)
        live_samples = raw_l_data.astype(np.float32)
        if live_samples.ndim > 1:
            live_samples = live_samples.mean(axis=1)
        peak = np.abs(live_samples).max()
        if peak > 0:
            live_samples /= peak

        speaker_scores: dict[int, list[float]] = {}

        for seg in segments:
            spk_id    = int(seg["speaker"])
            start_s   = int(seg["start"] * sr_l)
            end_s     = int(seg["end"]   * sr_l)
            seg_audio = live_samples[start_s:end_s]

            if len(seg_audio) < sr_l:          # skip segments < 1 second
                continue

            seg_t = torch.FloatTensor(seg_audio).unsqueeze(0)
            with torch.no_grad():
                emb_s = model.encode_batch(seg_t).squeeze().cpu().numpy()

            # Compare embeddings directly using cosine similarity.
            # NOTE: do NOT pass embeddings to verify_batch — it expects raw
            # audio signals and would treat the 192-d embedding as ~12 ms of
            # audio, causing a Conv1D padding error on [1, 80, 2].
            score_val = cosine_similarity(emb_e, emb_s)

            speaker_scores.setdefault(spk_id, []).append(score_val)

        if not speaker_scores:
            # Fallback: compare full live audio against enrolled
            sig_l = model.load_audio(wav_l).unsqueeze(0)
            score, _ = model.verify_batch(sig_e, sig_l)
            best_score = float(score.squeeze().item())
            return {
                "best_score":       round(best_score, 4),
                "speaker_count":    1,
                "speaker_scores":   {"0": round(best_score, 4)},
                "matched_speaker":  0,
                "speaker_segments": segments,
            }

        avg_scores   = {spk: sum(v) / len(v) for spk, v in speaker_scores.items()}
        best_speaker = max(avg_scores, key=avg_scores.__getitem__)
        best_score   = avg_scores[best_speaker]

        return {
            "best_score":       round(best_score, 4),
            "speaker_count":    speaker_count,
            "speaker_scores":   {str(k): round(v, 4) for k, v in avg_scores.items()},
            "matched_speaker":  best_speaker,
            "speaker_segments": segments,
        }

    except Exception as e:
        print("DIARIZE_COMPARE ERROR:", e)
        return {"best_score": 0.0, "speaker_count": 1, "speaker_segments": [], "error": str(e)}

    finally:
        for p in [raw_e, wav_e, raw_l, wav_l]:
            if os.path.exists(p):
                os.remove(p)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
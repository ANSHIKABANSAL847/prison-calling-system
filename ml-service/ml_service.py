import os
import subprocess
import numpy as np
import shutil
import uuid
import torch
import json
import librosa
from dataclasses import dataclass

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from speechbrain.pretrained import SpeakerRecognition
from speechbrain.pretrained import EncoderClassifier
from scipy.io import wavfile as scipy_wavfile
from sklearn.cluster import DBSCAN

from pyannote.audio import Pipeline
from faster_whisper import WhisperModel


# =========================
# CONFIG
# =========================

@dataclass
class Config:
    SAMPLE_RATE = 16000
    MATCH_THRESHOLD = 0.70
    CHUNK_SEC = 3

config = Config()

app = FastAPI(title="Speaker Authorization ML Service")

# =========================
# LOAD MODELS
# =========================

speaker_model = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir="pretrained_models"
)



device = "cuda" if torch.cuda.is_available() else "cpu"

whisper_model = WhisperModel("base", device=device ,compute_type="int8_float16" if device=="cuda" else "int8")

HF_TOKEN = os.getenv("HF_TOKEN")

try:
    diarization_pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        use_auth_token=HF_TOKEN
    )
    print("✅ Diarization model loaded")

except Exception as e:
    print("❌ Failed to load diarization:", e)
    diarization_pipeline = None


THREAT_WORDS = [
    "escape","attack","gun","weapon",
    "kill","riot","fight","smuggle"
]


# =========================
# UTILS
# =========================

def convert_to_wav(inp,out):

    cmd=[
        "ffmpeg","-y",
        "-i",inp,
        "-ac","1",
        "-ar","16000",
        "-acodec","pcm_s16le",
        out
    ]

    subprocess.run(cmd,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=30)


def cosine_similarity(a,b):

    a=a/(np.linalg.norm(a)+1e-10)
    b=b/(np.linalg.norm(b)+1e-10)

    return float(np.dot(a,b))


def get_embedding(audio_path):

    signal=speaker_model.load_audio(audio_path).unsqueeze(0)

    emb=speaker_model.encode_batch(signal)

    emb=emb.squeeze().cpu().numpy()

    emb=emb/(np.linalg.norm(emb)+1e-10)

    return emb
def get_stable_embedding(wav_path):

    signal = speaker_model.load_audio(wav_path)

    window = config.SAMPLE_RATE
    embeddings = []

    for i in range(0, len(signal), window):

        segment = signal[i:i+window]

        if len(segment) < window * 0.5:
            continue

        segment = segment.unsqueeze(0)

        emb = speaker_model.encode_batch(segment)
        emb = emb.squeeze().cpu().numpy()
        emb = emb / (np.linalg.norm(emb)+1e-10)

        embeddings.append(emb)

    if len(embeddings) == 0:
        return get_embedding(wav_path)

    embeddings = np.array(embeddings)

    return np.mean(embeddings, axis=0)

def split_audio(signal):

    chunk_size=config.SAMPLE_RATE*config.CHUNK_SEC

    chunks=[]

    for i in range(0,len(signal),chunk_size):

        chunk=signal[i:i+chunk_size]

        if len(chunk)>chunk_size*0.5:
            chunks.append(chunk)

    return chunks


# =========================
# NEW HELPER FUNCTIONS
# =========================

def detect_emotion_from_file(wav):
    return "neutral"


def transcribe_audio(wav):

    segments,_ = whisper_model.transcribe(
        wav,
        beam_size=5
    )

    text = " ".join([s.text for s in segments if s.text]).lower()

    return text


def detect_threat_from_text(text):

    threats = [w for w in THREAT_WORDS if w in text]

    return threats


def calculate_risk(authorized, emotion, threats):

    reasons=[]
    risk="LOW"

    if not authorized:
        reasons.append("unauthorized speaker")

    if emotion in ["angry","fear"]:
        reasons.append("high risk emotion")

    if len(threats)>0:
        reasons.append("threat keywords detected")

    if len(reasons)>=2:
        risk="HIGH"
    elif len(reasons)==1:
        risk="MEDIUM"

    return risk,reasons


# =========================
# ROOT
# =========================

@app.get("/")
def root():

    return {
        "status":"ML service running"
    }


# =========================
# ENROLL SPEAKERS
# =========================

@app.post("/extract_speakers")
async def extract_speakers(samples:list[UploadFile]=File(...)):

    all_embeddings=[]

    for sample in samples:

        raw=f"raw_{uuid.uuid4().hex}"
        wav=f"wav_{uuid.uuid4().hex}.wav"

        with open(raw,"wb") as f:
            shutil.copyfileobj(sample.file,f)

        convert_to_wav(raw, wav)

        # 🔹 Check audio duration before diarization
        duration = librosa.get_duration(path=wav)

        if duration < 1:
            os.remove(raw)
            os.remove(wav)
            raise HTTPException(400, "Audio too short for diarization")

        if diarization_pipeline is None:
            raise HTTPException(500, "Diarization model unavailable")

        # 🔹 Run diarization
        diarization = diarization_pipeline({
            "uri": "sample",
            "audio": wav
        })

        for turn,_,speaker in diarization.itertracks(yield_label=True):

            seg=f"seg_{uuid.uuid4().hex}.wav"

            cmd=[
                "ffmpeg","-y",
                "-i",wav,
                "-ss",str(turn.start),
                "-to",str(turn.end),
                seg
            ]

            subprocess.run(cmd, check=True)

            emb=get_embedding(seg)

            all_embeddings.append(emb)

            os.remove(seg)

        os.remove(raw)
        os.remove(wav)

    if len(all_embeddings)==0:
        raise HTTPException(400,"No voices detected")


    X=np.array(all_embeddings)

    clustering=DBSCAN(
        eps=0.35,
        min_samples=2,
        metric="cosine"
    ).fit(X)

    labels=clustering.labels_

    unique_embeddings=[]

    for label in set(labels):

        if label==-1:
            continue

        idx=np.where(labels==label)[0]

        cluster=X[idx]

        center=np.mean(cluster,axis=0)

        unique_embeddings.append(center.tolist())

    return {
        "authorized_speakers":len(unique_embeddings),
        "embeddings":unique_embeddings
    }


# =========================
# VERIFY CALL (UPDATED)
# =========================

@app.post("/verify_advanced")
async def verify_advanced(
    call: UploadFile = File(...),
    authorized_embeddings: str = Form(...)
):

    authorized_embeddings = json.loads(authorized_embeddings)
    authorized_embeddings = [np.array(e) for e in authorized_embeddings]

    if len(authorized_embeddings) == 0:
        raise HTTPException(400, "No authorized speakers provided")

    raw=f"call_{uuid.uuid4().hex}"
    wav=f"call_{uuid.uuid4().hex}.wav"

    with open(raw,"wb") as f:
        shutil.copyfileobj(call.file,f)

    convert_to_wav(raw,wav)

    signal=speaker_model.load_audio(wav)

    chunks=split_audio(signal)

    results=[]
    unauthorized=False

    for i,chunk in enumerate(chunks):
        if len(chunk) < config.SAMPLE_RATE:
           continue
        temp=f"chunk_{uuid.uuid4().hex}.wav"

        scipy_wavfile.write(temp,config.SAMPLE_RATE,chunk.numpy())

        emb=get_stable_embedding(temp)

        best_score=-1

        for auth in authorized_embeddings:

            score=cosine_similarity(auth,emb)

            if score>best_score:
                best_score=score

        authorized=best_score>=config.MATCH_THRESHOLD

        if not authorized:
            unauthorized=True

        emotion = detect_emotion_from_file(temp)

        transcript = transcribe_audio(temp)

        threats = detect_threat_from_text(transcript)

        risk_level,reasons = calculate_risk(
            authorized,
            emotion,
            threats
        )

        results.append({
            "chunk":i,
            "similarity":round(best_score,3),
            "authorized":authorized,
            "emotion":emotion,
            "transcript":transcript,
            "threat_keywords":threats,
            "threat_detected":len(threats)>0,
            "risk_level":risk_level,
            "risk_reasons":reasons
        })

        if os.path.exists(temp):
          os.remove(temp)

    os.remove(raw)
    os.remove(wav)

    return{
        "segments_checked":len(results),
        "unauthorized_detected":unauthorized,
        "segments":results
    }


# =========================
# THREAT DETECTION (UNCHANGED)
# =========================

@app.post("/detect_threat")
async def detect_threat(audio:UploadFile=File(...)):

    raw=f"raw_{uuid.uuid4().hex}"
    wav=f"wav_{uuid.uuid4().hex}.wav"

    with open(raw,"wb") as f:
        shutil.copyfileobj(audio.file,f)

    convert_to_wav(raw,wav)

    segments,_=whisper_model.transcribe(wav)

    text=" ".join([s.text for s in segments if s.text]).lower()

    threats=[w for w in THREAT_WORDS if w in text]

    os.remove(raw)
    os.remove(wav)

    return{
        "transcript":text,
        "threat_keywords":threats,
        "threat_detected":len(threats)>0
    }


# =========================

if __name__=="__main__":

    import uvicorn

    uvicorn.run(app,host="0.0.0.0",port=8001)
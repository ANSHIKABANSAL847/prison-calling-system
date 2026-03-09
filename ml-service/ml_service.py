import os
from dotenv import load_dotenv
load_dotenv()
import json
import tempfile
import subprocess
import logging
from contextlib import asynccontextmanager
from typing import List, Optional, Tuple

import numpy as np
import torch
import librosa
import soundfile as sf
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
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
    match_threshold: float = 0.70
    min_segment_duration: float = 0.5
    clustering_distance_threshold: float = 0.25
    max_file_size_mb: int = 50
    enable_diarization: bool = Field(True, env="ENABLE_DIARIZATION")
    hf_token: Optional[str] = Field(None, env="HF_TOKEN")

    threat_keywords: List[str] = [
        "escape","attack","gun","weapon","kill","riot","fight",
        "smuggle","bomb","hostage","drugs","contraband","breakout"
    ]

    threat_phrases: List[str] = [
        "i will kill","going to escape","bring a gun","plan to attack"
    ]

    class Config:
        env_file = ".env"


settings = Settings()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==============================
# Model Loading
# ==============================

@asynccontextmanager
async def lifespan(app: FastAPI):

    logger.info("Loading speaker model")

    app.state.speaker_model = SpeakerRecognition.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        savedir="pretrained_models/speaker"
    )

    device = "cuda" if torch.cuda.is_available() else "cpu"

    logger.info("Loading Whisper model")

    app.state.whisper = WhisperModel(
        "base",
        device=device,
        compute_type="int8_float16" if device == "cuda" else "int8"
    )

    if settings.enable_diarization and settings.hf_token:

        logger.info("Loading diarization model")

        app.state.diarization = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=settings.hf_token
        )

    else:

        logger.warning("Diarization disabled")

        app.state.diarization = None

    yield


app = FastAPI(lifespan=lifespan)


# ==============================
# Utility Functions
# ==============================

def cosine_similarity(a,b):
    a=a/(np.linalg.norm(a)+1e-10)
    b=b/(np.linalg.norm(b)+1e-10)
    return float(np.dot(a,b))


def convert_audio(input_bytes):

    with tempfile.NamedTemporaryFile(delete=False,suffix=".tmp") as tmp:
        tmp.write(input_bytes)
        input_path=tmp.name

    output_path=input_path+".wav"

    subprocess.run([
        "ffmpeg","-y",
        "-i",input_path,
        "-ac","1",
        "-ar","16000",
        output_path
    ],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

    audio,sr=sf.read(output_path,dtype="float32")

    os.remove(input_path)
    os.remove(output_path)

    audio=librosa.util.normalize(audio)

    return audio,sr


def get_embedding(audio,sr,model):

    tensor=torch.from_numpy(audio).float().unsqueeze(0)

    emb=model.encode_batch(tensor)

    emb=emb.squeeze().cpu().numpy()

    emb=emb/(np.linalg.norm(emb)+1e-10)

    return emb


def transcribe(audio,sr,whisper):

    with tempfile.NamedTemporaryFile(delete=False,suffix=".wav") as tmp:

        sf.write(tmp.name,audio,sr)

        segments,_=whisper.transcribe(tmp.name)

        text=" ".join(s.text for s in segments)

    os.remove(tmp.name)

    return text.lower()


def check_threats(text):

    threats=[w for w in settings.threat_keywords if w in text]

    for p in settings.threat_phrases:
        if p in text:
            threats.append(p)

    return threats,len(threats)>0


# ==============================
# ROOT
# ==============================

@app.get("/")
def root():
    return {"service":"voice monitoring AI running"}


# ==============================
# ENROLL
# ==============================

@app.post("/extract_speakers")
async def extract_speakers(samples:List[UploadFile]=File(...)):

    speaker_model=app.state.speaker_model
    diarization=app.state.diarization

    embeddings=[]

    for sample in samples:

        audio_bytes=await sample.read()

        audio,sr=convert_audio(audio_bytes)

        if diarization:

            waveform=torch.from_numpy(audio).float().unsqueeze(0)

            diarization_result=diarization({
                "waveform":waveform,
                "sample_rate":sr
            })

            segments=0

            for turn,_,speaker in diarization_result.itertracks(yield_label=True):

                if turn.duration<settings.min_segment_duration:
                    continue

                start=int(turn.start*sr)
                end=int(turn.end*sr)

                seg_audio=audio[start:end]

                if len(seg_audio)<sr*0.5:
                    continue

                emb=get_embedding(seg_audio,sr,speaker_model)

                embeddings.append(emb)

                segments+=1

            logger.info(f"segments extracted {segments}")

        else:

            emb=get_embedding(audio,sr,speaker_model)

            embeddings.append(emb)

    if len(embeddings)<1:
        raise HTTPException(400,"no speech detected")

    X=np.array(embeddings)

    logger.info(f"total embeddings {len(X)}")

    clustering=AgglomerativeClustering(
        n_clusters=None,
        distance_threshold=settings.clustering_distance_threshold,
        metric="cosine",
        linkage="average"
    )

    labels=clustering.fit_predict(X)

    logger.info(f"detected speakers {len(set(labels))}")

    unique_embeddings=[]

    for label in set(labels):

        cluster=X[labels==label]

        center=np.mean(cluster,axis=0)

        center=center/(np.linalg.norm(center)+1e-10)

        unique_embeddings.append(center.tolist())

    return{
        "authorized_speakers":len(unique_embeddings),
        "embeddings":unique_embeddings
    }


# ==============================
# VERIFY
# ==============================

@app.post("/verify_advanced")
async def verify_advanced(
    call: UploadFile = File(...),
    authorized_embeddings: str = Form(...)
):

    speaker_model = app.state.speaker_model
    whisper = app.state.whisper

    auth = [np.array(e) for e in json.loads(authorized_embeddings)]

    audio_bytes = await call.read()

    audio, sr = convert_audio(audio_bytes)

    segments = []

    diarization = app.state.diarization

    waveform = torch.from_numpy(audio).float().unsqueeze(0)

    diarization_result = diarization({
       "waveform": waveform,
        "sample_rate": sr
     })

    for turn, _, speaker in diarization_result.itertracks(yield_label=True):

      if turn.duration < settings.min_segment_duration:
        continue

      start = int(turn.start * sr)
      end = int(turn.end * sr)

      seg_audio = audio[start:end]

      segments.append((turn.start, turn.end, seg_audio))

    results = []
    unauthorized_detected = False
    best_score = 0

    for start, end, seg_audio in segments:

        emb = get_embedding(seg_audio, sr, speaker_model)

        score = max(cosine_similarity(e, emb) for e in auth)

        if score > best_score:
            best_score = score

        authorized = score >= settings.match_threshold

        if not authorized:
            unauthorized_detected = True

        transcript = transcribe(audio, sr, whisper)

        threats, detected = check_threats(transcript)

        results.append({
    "start": round(start,2),
    "end": round(end,2),
    "similarity": round(score,3),
    "authorized": authorized,
    "speaker_status": "AUTHORIZED" if authorized else "UNAUTHORIZED"
})

    return {
    "segments_checked": len(results),
    "segments": results,
    "unauthorized_detected": unauthorized_detected,
    "overall_similarity": round(best_score * 100),
    "transcript": transcript,
    "threat_detected": detected
}
# ==============================
# ANALYZE
# ==============================

@app.post("/analyze_speakers")
async def analyze_speakers(audio:UploadFile=File(...)):

    content=await audio.read()

    audio_np,sr=convert_audio(content)

    diarization=app.state.diarization

    speaker_count=None

    if diarization:

        waveform=torch.from_numpy(audio_np).float().unsqueeze(0)

        diarization_result=diarization({
            "waveform":waveform,
            "sample_rate":sr
        })

        speakers=set()

        for turn,_,speaker in diarization_result.itertracks(yield_label=True):
            speakers.add(speaker)

        speaker_count=len(speakers)

    transcript=transcribe(audio_np,sr,app.state.whisper)

    threats,detected=check_threats(transcript)

    return{
        "transcript":transcript,
        "speakerCount":speaker_count,
        "threat_keywords":threats,
        "threat_detected":detected
    }


@app.get("/health")
def health():
    return {"status":"healthy","diarization_available":app.state.diarization is not None}


if __name__=="__main__":

    import uvicorn

    uvicorn.run(app,host="0.0.0.0",port=8001)
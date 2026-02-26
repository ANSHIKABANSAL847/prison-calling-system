"use client";

import { useRef, useState } from "react";
import { Mic, Upload, Square, Trash2, Play, Pause, RotateCcw } from "lucide-react";

interface Props {
  onAudioReady: (file: File | null) => void;
}

const MIN_SECONDS = 3;
const MAX_SECONDS = 10;

export default function VoiceRecorder({ onAudioReady }: Props) {
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recording waveform refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Playback waveform refs
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const playCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const playAnalyserRef = useRef<AnalyserNode | null>(null);
  const playAnimRef = useRef<number | null>(null);
  const playSourceCreated = useRef(false);

  // Bypass audioFile guard when triggered from reRecord
  const reRecordPendingRef = useRef(false);

  // ── Waveform helpers ────────────────────────────────────────────────────
  function startWaveform(stream: MediaStream) {
    try {
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function draw() {
        animFrameRef.current = requestAnimationFrame(draw);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barCount = 48;
        const step = Math.floor(bufferLength / barCount);
        const gap = 3;
        const barWidth = (canvas.width - gap * (barCount - 1)) / barCount;

        for (let i = 0; i < barCount; i++) {
          const value = dataArray[i * step] / 255;
          const barH = Math.max(4, value * canvas.height);
          const x = i * (barWidth + gap);
          const y = (canvas.height - barH) / 2;
          // Colour shifts from teal → amber → red as amplitude rises
          const r = Math.round(value * 230);
          const g = Math.round(180 - value * 100);
          const b = Math.round(120 - value * 120);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, 2);
          ctx.fill();
        }
      }

      draw();
    } catch {
      // Web Audio not available – silently skip visualisation
    }
  }

  function stopWaveform() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    // Clear the canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  // ── Playback waveform helpers ────────────────────────────────────────────
  function startPlaybackWaveform() {
    try {
      const audioEl = audioElRef.current;
      if (!audioEl) return;

      // Create AudioContext once per component lifetime
      if (!playCtxRef.current) {
        const ctx = new AudioContext();
        playCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        playAnalyserRef.current = analyser;

        if (!playSourceCreated.current) {
          const source = ctx.createMediaElementSource(audioEl);
          source.connect(analyser);
          analyser.connect(ctx.destination); // keep audio audible
          playSourceCreated.current = true;
        }
      }

      if (playCtxRef.current.state === "suspended") {
        playCtxRef.current.resume();
      }

      const analyser = playAnalyserRef.current!;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function draw() {
        playAnimRef.current = requestAnimationFrame(draw);
        const canvas = playCanvasRef.current;
        if (!canvas) return;
        const ctx2d = canvas.getContext("2d");
        if (!ctx2d) return;

        analyser.getByteFrequencyData(dataArray);
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);

        const barCount = 48;
        const step = Math.floor(bufferLength / barCount);
        const gap = 3;
        const barWidth = (canvas.width - gap * (barCount - 1)) / barCount;

        for (let i = 0; i < barCount; i++) {
          const value = dataArray[i * step] / 255;
          const barH = Math.max(4, value * canvas.height);
          const x = i * (barWidth + gap);
          const y = (canvas.height - barH) / 2;
          // Green-teal palette for playback
          const r = Math.round(30 + value * 40);
          const g = Math.round(180 + value * 75);
          const b = Math.round(120 + value * 80);
          ctx2d.fillStyle = `rgb(${r},${g},${b})`;
          ctx2d.beginPath();
          ctx2d.roundRect(x, y, barWidth, barH, 2);
          ctx2d.fill();
        }
      }

      draw();
    } catch {
      // Web Audio API unavailable — skip silently
    }
  }

  function stopPlaybackWaveform() {
    if (playAnimRef.current) {
      cancelAnimationFrame(playAnimRef.current);
      playAnimRef.current = null;
    }
    const canvas = playCanvasRef.current;
    if (canvas) {
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setPlaying(false);
  }
  // ────────────────────────────────────────────────────────────────────────

  // Delete current audio
  function clearAudio() {
    stopPlaybackWaveform();
    // Close playback AudioContext so next recording gets a fresh one
    playCtxRef.current?.close();
    playCtxRef.current = null;
    playAnalyserRef.current = null;
    playSourceCreated.current = false;
    setAudioURL(null);
    setAudioFile(null);
    setError("");
    onAudioReady(null);
  }

  // Clear and immediately start a new recording
  async function reRecord() {
    reRecordPendingRef.current = true;
    clearAudio();
    await startRecording();
  }

  //Start recording (ONLY on button click)
  async function startRecording() {
    if (recording || (audioFile && !reRecordPendingRef.current)) return;
    reRecordPendingRef.current = false;

    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startWaveform(stream);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // Clear auto-stop timer
        if (autoStopTimerRef.current) {
          clearTimeout(autoStopTimerRef.current);
          autoStopTimerRef.current = null;
        }

        stopWaveform();

        // Stop mic tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const durationSec = (Date.now() - startTimeRef.current) / 1000;

        if (durationSec < MIN_SECONDS) {
          setError(
            `Recording too short. Please record at least ${MIN_SECONDS} seconds.`
          );
          return;
        }

const blob = new Blob(chunksRef.current, { type: "audio/wav" });
const file = new File([blob], "voice.wav", { type: "audio/wav" });

        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioFile(file);
        onAudioReady(file);
      };

      mediaRecorder.start();
      setRecording(true);

      // FORCE auto-stop after MAX_SECONDS
      autoStopTimerRef.current = setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setRecording(false);
        }
      }, MAX_SECONDS * 1000);
    } catch (err) {
      setError("Microphone access denied or not available.");
    }
  }

  //stop recording manually
  function stopRecording() {
    if (!recording) return;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    stopWaveform();
    setRecording(false);
  }

  // Handle upload
  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (audioFile) return;

    setError("");

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      setError("Please upload a valid audio file.");
      return;
    }

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);

    audio.onloadedmetadata = () => {
      if (audio.duration < MIN_SECONDS) {
        setError(`Audio too short. Must be at least ${MIN_SECONDS} seconds.`);
        return;
      }
      if (audio.duration > MAX_SECONDS) {
        setError(`Audio too long. Max allowed is ${MAX_SECONDS} seconds.`);
        return;
      }

      setAudioURL(url);
      setAudioFile(file);
      onAudioReady(file);
    };
  }

  return (
    <div className="border rounded-xl p-5 bg-gray-50 space-y-4 overflow-hidden w-full">
      <h3 className="text-lg font-semibold text-center">Audio Registration</h3>

      {/* Live waveform — visible only while recording */}
      {recording && (
        <div className="bg-gray-950 rounded-xl px-3 py-2 border border-gray-700 flex items-center gap-2 overflow-hidden">
          <span className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-red-400 tracking-widest uppercase">Live</span>
          </span>
          <canvas
            ref={canvasRef}
            width={480}
            height={56}
            className="flex-1 min-w-0 max-w-full h-14 rounded-lg"
          />
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-center gap-4 flex-wrap">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={!!audioFile}
            className="flex items-center gap-2 px-5 py-2 border rounded-full bg-white hover:bg-gray-100 disabled:opacity-50"
          >
            <Mic className="w-5 h-5 text-red-500" />
            Record
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 px-5 py-2 border rounded-full bg-white hover:bg-gray-100"
          >
            <Square className="w-5 h-5 text-gray-700" />
            Stop
          </button>
        )}

        <label className="flex items-center gap-2 px-5 py-2 border rounded-full bg-white hover:bg-gray-100 cursor-pointer disabled:opacity-50">
          <Upload className="w-5 h-5" />
          Upload File
          <input
            type="file"
            accept="audio/*"
            hidden
            onChange={handleUpload}
            disabled={!!audioFile}
          />
        </label>

        {audioFile && (
          <>
            <button
              type="button"
              onClick={reRecord}
              className="flex items-center gap-2 px-5 py-2 border rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
            >
              <RotateCcw className="w-4 h-4" />
              Re-record
            </button>
            <button
              type="button"
              onClick={clearAudio}
              className="flex items-center gap-2 px-5 py-2 border rounded-full bg-red-50 text-red-600 hover:bg-red-100"
            >
              <Trash2 className="w-5 h-5" />
              Delete
            </button>
          </>
        )}
      </div>

      {/* Player */}
      <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
        {audioURL ? (
          <>
            {/* Hidden audio element — routed through Web Audio analyser */}
            <audio
              ref={audioElRef}
              src={audioURL}
              onPlay={() => { setPlaying(true); startPlaybackWaveform(); }}
              onPause={stopPlaybackWaveform}
              onEnded={stopPlaybackWaveform}
            />

            {/* Waveform canvas */}
            <div className="px-3 pt-3 overflow-hidden">
              <canvas
                ref={playCanvasRef}
                width={480}
                height={56}
                className="w-full max-w-full h-14 rounded-lg bg-gray-900 block"
              />
            </div>

            {/* Custom controls */}
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  const el = audioElRef.current;
                  if (!el) return;
                  playing ? el.pause() : el.play();
                }}
                className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-full bg-green-500 hover:bg-green-400 text-white shrink-0 transition"
              >
                {playing
                  ? <Pause className="w-3.5 h-3.5" />
                  : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>
              <span className="text-xs text-gray-400 font-mono">
                {playing ? "Playing…" : "Recorded audio ready"}
              </span>
              {playing && (
                <span className="flex items-center gap-1 ml-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] text-green-400 font-bold tracking-widest uppercase">Playing</span>
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-sm text-gray-500 py-6">
            No audio selected yet (Record or Upload 3–10 seconds)
          </div>
        )}
      </div>

      {/* Errors */}
      {error && (
        <p className="text-sm text-red-600 text-center font-medium">{error}</p>
      )}

      {/* Required hint */}
      {!audioFile && !error && (
        <p className="text-sm text-red-500 text-center">
          Voice enrollment is required (3–10 seconds)
        </p>
      )}
    </div>
  );
}
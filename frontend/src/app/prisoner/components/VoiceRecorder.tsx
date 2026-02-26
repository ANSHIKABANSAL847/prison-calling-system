"use client";

import { useRef, useState } from "react";
import { Mic, Upload, Square, Trash2 } from "lucide-react";

interface Props {
  onAudioReady: (file: File | null) => void;
}

const MIN_SECONDS = 3;
const MAX_SECONDS = 10;

export default function VoiceRecorder({ onAudioReady }: Props) {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete current audio
  function clearAudio() {
    setAudioURL(null);
    setAudioFile(null);
    setError("");
    onAudioReady(null);
  }

  //Start recording (ONLY on button click)
  async function startRecording() {
    if (recording || audioFile) return;

    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

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
    <div className="border rounded-xl p-5 bg-gray-50 space-y-4">
      <h3 className="text-lg font-semibold text-center">Audio Registration</h3>

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
          <button
            type="button"
            onClick={clearAudio}
            className="flex items-center gap-2 px-5 py-2 border rounded-full bg-red-50 text-red-600 hover:bg-red-100"
          >
            <Trash2 className="w-5 h-5" />
            Delete
          </button>
        )}
      </div>

      {/* Player */}
      <div className="bg-white rounded-lg p-4 border">
        {audioURL ? (
          <audio controls src={audioURL} className="w-full" />
        ) : (
          <div className="text-center text-sm text-gray-400">
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
"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, RefreshCw } from "lucide-react";

const BAR_HEIGHTS = [
  30, 55, 42, 70, 48, 80, 62, 45, 75, 55, 38, 65, 50, 72, 40,
  60, 80, 52, 45, 68, 35, 75, 58, 42, 65, 50, 78, 43, 55, 70,
  48, 60, 35, 72, 55, 42, 78, 50, 65, 40, 70, 55, 45, 68, 52,
  38, 75, 60, 48, 80,
];

interface WaveformPlayerProps {
  duration: string;
  durationSeconds: number;
}

export default function WaveformPlayer({ duration, durationSeconds }: WaveformPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [currentSeconds, setCurrentSeconds] = useState(2);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrentSeconds((s) => {
          if (s >= durationSeconds) {
            setPlaying(false);
            return durationSeconds;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, durationSeconds]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  const progress = durationSeconds > 0 ? currentSeconds / durationSeconds : 0;
  const activeBars = Math.floor(progress * BAR_HEIGHTS.length);

  function handleReset() {
    setPlaying(false);
    setCurrentSeconds(0);
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Time labels */}
      <div className="flex justify-between text-xs text-gray-500 mb-1 px-1">
        <span>{formatTime(currentSeconds)}</span>
        <span>{duration}</span>
      </div>

      {/* Waveform bars */}
      <div
        className="flex items-center gap-[2px] h-14 px-1 cursor-pointer select-none"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          setCurrentSeconds(Math.round(ratio * durationSeconds));
        }}
      >
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors duration-150 ${
              i < activeBars ? "bg-[#0B1F4B]" : "bg-[#CBD0D8]"
            }`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-1 mx-1 h-0.5 rounded-full relative" style={{ background: "#E5E8EC" }}>
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all"
          style={{ width: `${progress * 100}%`, background: "#C9A227" }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <button
          onClick={() => setCurrentSeconds((s) => Math.max(0, s - 15))}
          className="text-gray-500 hover:text-gray-800 transition cursor-pointer"
          title="−15s"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="w-8 h-8 text-white rounded-full flex items-center justify-center transition cursor-pointer"
          style={{ background: "#0B1F4B" }}
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <button
          onClick={() => setCurrentSeconds((s) => Math.min(durationSeconds, s + 15))}
          className="text-gray-500 hover:text-gray-800 transition cursor-pointer"
          title="+15s"
        >
          <SkipForward className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="text-gray-500 hover:text-gray-800 transition cursor-pointer"
          title="Restart"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

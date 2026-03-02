import SimilarityGauge from "./SimilarityGauge";
import { Mic2, AlertTriangle } from "lucide-react";

interface SimilarityScorePanelProps {
  similarity: number;
  speakerCount: number;
  unknownSpeakers: number;
}

export default function SimilarityScorePanel({
  similarity,
  speakerCount,
  unknownSpeakers,
}: SimilarityScorePanelProps) {

  const description =
    similarity === 0
      ? "Waiting for audio…"
      : similarity >= 80
      ? "Strong voice match"
      : similarity >= 50
      ? "Partial match — monitoring"
      : "Low confidence";

  const multiSpeaker = speakerCount > 1;
  const hasUnknown = unknownSpeakers > 0;

  return (
    <div
      className="p-5 flex flex-col"
      style={{
        background: "#0B1F4B",
        border: "1px solid #1e3a7a",
        borderTop: "3px solid #C9A227",
        borderRadius: 4,
      }}
    >
      <p
        className="text-[10px] font-bold tracking-[0.15em] uppercase mb-3 self-start"
        style={{ color: "rgba(201,162,39,0.7)" }}
      >
        Voice Analysis
      </p>

      {/* Similarity Gauge */}
      <div className="flex flex-col items-center justify-center">
        <SimilarityGauge score={Math.round(similarity)} />
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      </div>

      {/* Speaker Info */}
      <div className="mt-4 border-t border-white/10 pt-3 space-y-2">

        {/* Speaker Count */}
        <div
          className="flex items-center justify-between px-3 py-2 rounded"
          style={{
            background: multiSpeaker
              ? "rgba(251,191,36,0.15)"
              : "rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-2">
            <Mic2
              className="w-4 h-4"
              style={{ color: multiSpeaker ? "#fbbf24" : "#9ca3af" }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: multiSpeaker ? "#fbbf24" : "#9ca3af" }}
            >
              {multiSpeaker ? "Multiple Speakers Detected" : "Single Speaker"}
            </span>
          </div>

          <span
            className="text-xs font-mono"
            style={{ color: multiSpeaker ? "#fbbf24" : "#9ca3af" }}
          >
            {speakerCount}
          </span>
        </div>

        {/* Unknown Speakers */}
        {hasUnknown && (
          <div
            className="flex items-center justify-between px-3 py-2 rounded"
            style={{
              background: "rgba(239,68,68,0.15)",
            }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: "#ef4444" }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: "#ef4444" }}
              >
                Unknown Speakers
              </span>
            </div>

            <span
              className="text-xs font-mono"
              style={{ color: "#ef4444" }}
            >
              {unknownSpeakers}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
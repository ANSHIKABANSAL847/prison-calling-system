import SimilarityGauge from "./SimilarityGauge";
import { Volume2, VolumeX, Sparkles, Mic2 } from "lucide-react";

interface AudioQuality {
  snrDb: number;
  clarityScore: number;
  speakerCount: number;
  noiseLabel: string;
  clarityLabel: string;
}

interface SimilarityScorePanelProps {
  similarity: number;
  audioQuality?: AudioQuality | null;
}

export default function SimilarityScorePanel({ similarity, audioQuality }: SimilarityScorePanelProps) {
  const description =
    similarity === 0
      ? "Waiting for audio…"
      : similarity >= 80
      ? "Strong voice match"
      : similarity >= 50
      ? "Partial match — monitoring"
      : "Low confidence";

  const snrColor =
    !audioQuality ? "#6b7280"
    : audioQuality.snrDb >= 20 ? "#10b981"
    : audioQuality.snrDb >= 10 ? "#f59e0b"
    : "#ef4444";

  const snrBg =
    !audioQuality ? "rgba(255,255,255,0.06)"
    : audioQuality.snrDb >= 20 ? "rgba(16,185,129,0.15)"
    : audioQuality.snrDb >= 10 ? "rgba(245,158,11,0.15)"
    : "rgba(239,68,68,0.15)";

  const clarityColor =
    !audioQuality ? "#6b7280"
    : audioQuality.clarityScore >= 70 ? "#10b981"
    : audioQuality.clarityScore >= 40 ? "#f59e0b"
    : "#ef4444";

  return (
    <div
      className="p-5 flex flex-col"
      style={{ background: "#0B1F4B", border: "1px solid #1e3a7a", borderTop: "3px solid #C9A227", borderRadius: 4 }}
    >
      <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-3 self-start" style={{ color: "rgba(201,162,39,0.7)" }}>
        Similarity Score
      </p>

      <div className="flex flex-col items-center justify-center">
        <SimilarityGauge score={Math.round(similarity)} />
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>

      {/* Audio quality metrics */}
      <div className="mt-4 border-t border-white/10 pt-3 grid grid-cols-1 gap-2">
        <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(201,162,39,0.55)" }}>
          Audio Quality
        </p>

        {/* SNR / Noise */}
        <div className="flex items-center justify-between px-3 py-2 rounded" style={{ background: snrBg }}>
          <div className="flex items-center gap-1.5">
            {audioQuality && audioQuality.snrDb >= 10
              ? <Volume2 className="w-3 h-3" style={{ color: snrColor }} />
              : <VolumeX  className="w-3 h-3" style={{ color: snrColor }} />}
            <span className="text-[10px] font-semibold" style={{ color: snrColor }}>
              {audioQuality ? audioQuality.noiseLabel : "Noise Level"}
            </span>
          </div>
          <span className="text-[10px] font-mono" style={{ color: snrColor }}>
            {audioQuality ? `${audioQuality.snrDb.toFixed(1)} dB` : "—"}
          </span>
        </div>

        {/* Clarity */}
        <div className="flex items-center justify-between px-3 py-2 rounded" style={{ background: "rgba(167,139,250,0.12)" }}>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" style={{ color: clarityColor }} />
            <span className="text-[10px] font-semibold" style={{ color: clarityColor }}>
              {audioQuality ? audioQuality.clarityLabel + " Voice" : "Voice Clarity"}
            </span>
          </div>
          <span className="text-[10px] font-mono" style={{ color: clarityColor }}>
            {audioQuality ? `${audioQuality.clarityScore.toFixed(1)}%` : "—"}
          </span>
        </div>

        {/* Speakers */}
        <div className="flex items-center justify-between px-3 py-2 rounded" style={{
          background: audioQuality && audioQuality.speakerCount > 1
            ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.06)",
        }}>
          <div className="flex items-center gap-1.5">
            <Mic2 className="w-3 h-3" style={{ color: audioQuality && audioQuality.speakerCount > 1 ? "#fbbf24" : "#6b7280" }} />
            <span className="text-[10px] font-semibold" style={{ color: audioQuality && audioQuality.speakerCount > 1 ? "#fbbf24" : "#9ca3af" }}>
              {audioQuality && audioQuality.speakerCount > 1 ? `Multi-Speaker Detected` : "Speakers"}
            </span>
          </div>
          <span className="text-[10px] font-mono" style={{ color: audioQuality && audioQuality.speakerCount > 1 ? "#fbbf24" : "#6b7280" }}>
            {audioQuality ? `${audioQuality.speakerCount} voice${audioQuality.speakerCount !== 1 ? "s" : ""}` : "—"}
          </span>
        </div>

        {/* Clarity bar */}
        {audioQuality && (
          <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${audioQuality.clarityScore}%`,
                background: audioQuality.clarityScore >= 70
                  ? "linear-gradient(90deg,#10b981,#34d399)"
                  : audioQuality.clarityScore >= 40
                  ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
                  : "linear-gradient(90deg,#ef4444,#f87171)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

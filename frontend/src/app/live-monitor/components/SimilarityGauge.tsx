interface SimilarityGaugeProps {
  score: number;
}

export default function SimilarityGauge({ score }: SimilarityGaugeProps) {
  const r   = 70;
  const stroke = 14;
  const cx  = 90;
  const cy  = 90;
  const circumference = Math.PI * r; // half circle

  const filled = (score / 100) * circumference;
  const gap    = circumference - filled;

  const colour = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

  return (
    <svg viewBox="0 0 180 100" className="w-full max-w-[220px] mx-auto overflow-visible">
      {/* Background arc */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none"
        stroke="#2a2a2a"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      {/* Coloured arc */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none"
        stroke={colour}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${gap}`}
        style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.4s ease" }}
      />
      {/* LOW / HIGH labels */}
      <text x={cx - r - 2} y={cy + 18} fill="#9ca3af" fontSize="9" textAnchor="middle">LOW</text>
      <text x={cx + r + 2} y={cy + 18} fill="#9ca3af" fontSize="9" textAnchor="middle">HIGH</text>
      {/* Score */}
      <text x={cx} y={cy - 14} fill={colour} fontSize="28" fontWeight="bold" textAnchor="middle">
        {score}%
      </text>
    </svg>
  );
}

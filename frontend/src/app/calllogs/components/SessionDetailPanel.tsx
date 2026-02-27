import { X, Download, FileText, BarChart3 } from "lucide-react";
import { CallLog } from "../types";
import VerificationBadge from "./VerificationBadge";
import WaveformPlayer from "./WaveformPlayer";

interface SessionDetailPanelProps {
  selected: CallLog;
  onClose: () => void;
  formatDate: (iso: string) => string;
}

const META_EXPORT_BUTTONS = [
  { icon: Download, label: "Export Audio" },
  { icon: FileText, label: "Export Transcript" },
  { icon: BarChart3, label: "Export Report" },
];

export default function SessionDetailPanel({
  selected, onClose, formatDate,
}: SessionDetailPanelProps) {
  const metaRows = [
    { label: "Agent",    value: selected.agent?.name ?? "—" },
    { label: "Contact",  value: selected.contact?.contactName ?? "—" },
    { label: "Prisoner", value: selected.prisoner?.fullName ?? "—" },
    { label: "Date",     value: formatDate(selected.date) },
    { label: "Duration", value: selected.duration },
  ];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #CBD0D8",
        borderTop: "3px solid #C9A227",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ background: "#0B1F4B", borderBottom: "1px solid rgba(201,162,39,0.4)" }}
      >
        <h3 className="font-black text-xs uppercase tracking-widest text-white">
          Session Detail –{" "}
          <span className="font-mono text-yellow-400">{selected.sessionId}</span>
        </h3>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white cursor-pointer transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {/* Left – metadata */}
        <div className="flex-1 px-6 py-5 space-y-3 min-w-0">
          {metaRows.map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-36 shrink-0">{label}:</span>
              <span className="text-sm font-medium text-gray-800 truncate">{value}</span>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 w-36 shrink-0">Verification Result:</span>
            <VerificationBadge result={selected.verificationResult} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 w-36 shrink-0">Similarity Score:</span>
            <span className="text-sm font-bold text-blue-700">{selected.similarityScore}%</span>
          </div>

          {selected.notes && (
            <div className="flex items-start gap-2">
              <span className="text-sm text-gray-500 w-36 shrink-0 mt-0.5">Notes:</span>
              <span className="text-sm text-gray-700">{selected.notes}</span>
            </div>
          )}
        </div>

        {/* Right – player + exports */}
        <div className="flex-1 px-6 py-5 flex flex-col gap-4 min-w-0">
          <WaveformPlayer
            duration={selected.duration}
            durationSeconds={selected.durationSeconds}
          />

          <div className="flex flex-wrap gap-2 pt-2" style={{ borderTop: "1px solid #E5E8EC" }}>
            {META_EXPORT_BUTTONS.map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition cursor-pointer"
                style={{ border: "1px solid #CBD0D8", borderRadius: 3, color: "#0B1F4B" }}
              >
                <Icon className="w-4 h-4" style={{ color: "#0B1F4B" }} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  Play,
  Pause,
  Eye,
  Download,
  SkipBack,
  SkipForward,
  RefreshCw,
  ChevronDown,
  X,
  Filter,
  FileText,
  Mic,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────
interface PopulatedAgent { _id: string; name: string; email: string; role: string }
interface PopulatedPrisoner { _id: string; fullName: string; prisonerId: number; prisonName: string }
interface PopulatedContact { _id: string; contactName: string; relation: string; phoneNumber: string }

interface CallLog {
  _id: string;
  sessionId: string;
  agent: PopulatedAgent;
  prisoner: PopulatedPrisoner;
  contact: PopulatedContact;
  channel: "Phone" | "Video Call" | "Chat";
  date: string;
  duration: string;          // "mm:ss" formatted by server
  durationSeconds: number;
  verificationResult: "Verified" | "Failed" | "Pending";
  similarityScore: number;
  audioUrl?: string;
  notes?: string;
}

// ──────────────────────────────────────
// Waveform visualiser (pure CSS bars)
// ──────────────────────────────────────
const BAR_HEIGHTS = [
  30, 55, 42, 70, 48, 80, 62, 45, 75, 55, 38, 65, 50, 72, 40,
  60, 80, 52, 45, 68, 35, 75, 58, 42, 65, 50, 78, 43, 55, 70,
  48, 60, 35, 72, 55, 42, 78, 50, 65, 40, 70, 55, 45, 68, 52,
  38, 75, 60, 48, 80,
];

function WaveformPlayer({
  duration,
  durationSeconds,
}: {
  duration: string;
  durationSeconds: number;
}) {
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

  function handleSkipBack() {
    setCurrentSeconds((s) => Math.max(0, s - 15));
  }

  function handleSkipForward() {
    setCurrentSeconds((s) => Math.min(durationSeconds, s + 15));
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
              i < activeBars ? "bg-blue-500" : "bg-blue-200"
            }`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      {/* Progress track */}
      <div className="mt-1 mx-1 h-0.5 bg-gray-200 rounded-full relative">
        <div
          className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <button
          onClick={handleSkipBack}
          className="text-gray-500 hover:text-gray-800 transition cursor-pointer"
          title="−15s"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition cursor-pointer"
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <button
          onClick={handleSkipForward}
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

// ──────────────────────────────────────
// Verification badge
// ──────────────────────────────────────
function VerificationBadge({ result }: { result: string }) {
  if (result === "Verified")
    return (
      <span className="inline-flex items-center gap-1 text-green-600 font-medium text-sm">
        <CheckCircle2 className="w-4 h-4" /> Verified
      </span>
    );
  if (result === "Failed")
    return (
      <span className="inline-flex items-center gap-1 text-red-500 font-medium text-sm">
        <XCircle className="w-4 h-4" /> Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-yellow-600 font-medium text-sm">
      <Clock className="w-4 h-4" /> Pending
    </span>
  );
}

// ──────────────────────────────────────
// Filter Select
// ──────────────────────────────────────
function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  );
}

// ──────────────────────────────────────
// Main Page
// ──────────────────────────────────────
export default function CallLogsPage() {
  const router = useRouter();

  // Data
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters (staged + applied)
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [similarityMin, setSimilarityMin] = useState("");
  const [similarityMax, setSimilarityMax] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [page, setPage] = useState(1);

  // Applied filter state (only sent on Apply)
  const [applied, setApplied] = useState({
    channel: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    similarityMin: "",
    similarityMax: "",
  });

  // Selected row
  const [selected, setSelected] = useState<CallLog | null>(null);

  // ── Fetch logs ─────────────────────────
  const fetchLogs = useCallback(
    async (pg: number, s: string) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (applied.channel) params.set("channel", applied.channel);
        if (applied.status) params.set("verificationResult", applied.status);
        if (applied.dateFrom) params.set("dateFrom", applied.dateFrom);
        if (applied.dateTo) params.set("dateTo", applied.dateTo);
        if (applied.similarityMin) params.set("minSimilarity", applied.similarityMin);
        if (applied.similarityMax) params.set("maxSimilarity", applied.similarityMax);
        if (s) params.set("search", s);
        params.set("page", String(pg));
        params.set("limit", "10");

        const res = await fetch(`${API_URL}/api/call-logs?${params}`, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401) { router.replace("/login"); return; }
          const data = await res.json().catch(() => ({}));
          setError(data.message || "Failed to fetch call logs");
          return;
        }

        const data = await res.json();
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch {
        setError("Network error. Could not fetch call logs.");
      } finally {
        setLoading(false);
      }
    },
    [applied, router]
  );

  useEffect(() => {
    fetchLogs(page, activeSearch);
  }, [fetchLogs, page, activeSearch]);

  function handleApplyFilters() {
    setApplied({
      channel: channelFilter,
      status: statusFilter,
      dateFrom,
      dateTo,
      similarityMin,
      similarityMax,
    });
    setPage(1);
  }

  function handleClearFilters() {
    setChannelFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setSimilarityMin("");
    setSimilarityMax("");
    setApplied({ channel: "", status: "", dateFrom: "", dateTo: "", similarityMin: "", similarityMax: "" });
    setSearchInput("");
    setActiveSearch("");
    setPage(1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveSearch(searchInput);
    setPage(1);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  const hasActiveFilters =
    applied.channel ||
    applied.status ||
    applied.dateFrom ||
    applied.dateTo ||
    applied.similarityMin ||
    applied.similarityMax ||
    activeSearch;

  // ── Render ────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">

        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Communication Records</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Full history of monitored call sessions with AI voice verification
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition cursor-pointer"
            >
              <X className="w-4 h-4" /> Clear Filters
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search session, agent, contact…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </form>

            <FilterSelect
              label="Date Range"
              options={["Today", "Last 7 Days", "Last 30 Days", "Last 60 Days"]}
              value={""}
              onChange={(v) => {
                const now = new Date();
                if (v === "Today") {
                  setDateFrom(now.toISOString().slice(0, 10));
                  setDateTo(now.toISOString().slice(0, 10));
                } else if (v === "Last 7 Days") {
                  const d = new Date(now); d.setDate(d.getDate() - 7);
                  setDateFrom(d.toISOString().slice(0, 10));
                  setDateTo(now.toISOString().slice(0, 10));
                } else if (v === "Last 30 Days") {
                  const d = new Date(now); d.setDate(d.getDate() - 30);
                  setDateFrom(d.toISOString().slice(0, 10));
                  setDateTo(now.toISOString().slice(0, 10));
                } else if (v === "Last 60 Days") {
                  const d = new Date(now); d.setDate(d.getDate() - 60);
                  setDateFrom(d.toISOString().slice(0, 10));
                  setDateTo(now.toISOString().slice(0, 10));
                }
              }}
            />

            <FilterSelect
              label="Channel"
              options={["Phone", "Video Call", "Chat"]}
              value={channelFilter}
              onChange={setChannelFilter}
            />

            <FilterSelect
              label="Verification Status"
              options={["Verified", "Failed", "Pending"]}
              value={statusFilter}
              onChange={setStatusFilter}
            />

            <FilterSelect
              label="Similarity Score"
              options={["≥ 90%", "≥ 80%", "≥ 70%", "< 70%"]}
              value={""}
              onChange={(v) => {
                if (v === "≥ 90%") { setSimilarityMin("90"); setSimilarityMax(""); }
                else if (v === "≥ 80%") { setSimilarityMin("80"); setSimilarityMax(""); }
                else if (v === "≥ 70%") { setSimilarityMin("70"); setSimilarityMax(""); }
                else if (v === "< 70%") { setSimilarityMin(""); setSimilarityMax("69"); }
              }}
            />

            {/* Advanced Filters toggle */}
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg transition cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              Advanced Filters
            </button>

            {/* Apply */}
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
            >
              Apply Filters
            </button>
          </div>

          {/* Advanced panel */}
          {showAdvanced && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                <label className="text-gray-600 whitespace-nowrap">Date From:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <label className="text-gray-600 whitespace-nowrap">Date To:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <label className="text-gray-600 whitespace-nowrap">Similarity Min (%):</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={similarityMin}
                  onChange={(e) => setSimilarityMin(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <label className="text-gray-600 whitespace-nowrap">Similarity Max (%):</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={similarityMax}
                  onChange={(e) => setSimilarityMax(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {error && (
            <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 border-b border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {[
                    "Date & Time",
                    "Agent",
                    "Contact",
                    "Channel",
                    "Session ID",
                    "Verification Result",
                    "Similarity",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                      <p className="text-sm text-gray-500 mt-2">Loading records…</p>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                      No records found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log._id}
                      onClick={() => setSelected((prev) => prev?._id === log._id ? null : log)}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${
                        selected?._id === log._id
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {formatDate(log.date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-800 font-medium">
                        {log.agent?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {log.contact?.contactName ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            log.channel === "Phone"
                              ? "bg-blue-100 text-blue-700"
                              : log.channel === "Video Call"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {log.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-600 text-xs">
                        {log.sessionId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <VerificationBadge result={log.verificationResult} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-800">
                        {log.similarityScore}%
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            title="Play"
                            onClick={(e) => { e.stopPropagation(); setSelected(log); }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="View Details"
                            onClick={(e) => { e.stopPropagation(); setSelected(log); }}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Export"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} &bull; {total} records
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pg = i + 1;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-8 h-8 rounded text-sm font-medium transition cursor-pointer ${
                        pg === page
                          ? "bg-blue-600 text-white"
                          : "border border-gray-200 text-gray-600 hover:bg-white"
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Session Detail Panel */}
        {selected && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-800 text-sm">
                Session Details – <span className="font-mono text-blue-700">{selected.sessionId}</span>
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* Left – metadata */}
              <div className="flex-1 px-6 py-5 space-y-3 min-w-0">
                {[
                  { label: "Agent", value: selected.agent?.name ?? "—" },
                  { label: "Contact", value: selected.contact?.contactName ?? "—" },
                  { label: "Prisoner", value: selected.prisoner?.fullName ?? "—" },
                  { label: "Channel", value: selected.channel },
                  { label: "Date", value: formatDate(selected.date) },
                  { label: "Duration", value: selected.duration },
                ].map(({ label, value }) => (
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

                {/* Export Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <button className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition cursor-pointer">
                    <Download className="w-4 h-4 text-blue-500" />
                    Export Audio
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition cursor-pointer">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Export Transcript
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition cursor-pointer">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    Export Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

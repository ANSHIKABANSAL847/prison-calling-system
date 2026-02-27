"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { CallLog, AppliedFilters } from "./types";
import FilterBar from "./components/FilterBar";
import CallLogsTable from "./components/CallLogsTable";
import SessionDetailPanel from "./components/SessionDetailPanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────
export default function CallLogsPage() {
  const router = useRouter();

  // Data
  const [logs, setLogs]             = useState<CallLog[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  // Filter staging state
  const [statusFilter, setStatusFilter]   = useState("");
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");
  const [similarityMin, setSimilarityMin] = useState("");
  const [similarityMax, setSimilarityMax] = useState("");
  const [searchInput, setSearchInput]     = useState("");
  const [activeSearch, setActiveSearch]   = useState("");
  const [showAdvanced, setShowAdvanced]   = useState(false);
  const [page, setPage]                   = useState(1);

  // Applied filters (sent to API only on "Apply")
  const [applied, setApplied] = useState<AppliedFilters>({
    status: "", dateFrom: "", dateTo: "", similarityMin: "", similarityMax: "",
  });

  // Selected row for detail panel
  const [selected, setSelected] = useState<CallLog | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (pg: number, search: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (applied.status)        params.set("verificationResult", applied.status);
      if (applied.dateFrom)      params.set("dateFrom", applied.dateFrom);
      if (applied.dateTo)        params.set("dateTo", applied.dateTo);
      if (applied.similarityMin) params.set("minSimilarity", applied.similarityMin);
      if (applied.similarityMax) params.set("maxSimilarity", applied.similarityMax);
      if (search)                params.set("search", search);
      params.set("page", String(pg));
      params.set("limit", "10");

      const res = await fetch(`${API_URL}/api/call-logs?${params}`, { credentials: "include" });

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
  }, [applied, router]);

  useEffect(() => { fetchLogs(page, activeSearch); }, [fetchLogs, page, activeSearch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleApplyFilters() {
    setApplied({ status: statusFilter, dateFrom, dateTo, similarityMin, similarityMax });
    setPage(1);
  }

  function handleClearFilters() {
    setStatusFilter(""); setDateFrom(""); setDateTo("");
    setSimilarityMin(""); setSimilarityMax("");
    setApplied({ status: "", dateFrom: "", dateTo: "", similarityMin: "", similarityMax: "" });
    setSearchInput(""); setActiveSearch(""); setPage(1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveSearch(searchInput);
    setPage(1);
  }

  function handleSelectLog(log: CallLog) {
    setSelected((prev) => (prev?._id === log._id ? null : log));
  }

  const hasActiveFilters =
    applied.status || applied.dateFrom || applied.dateTo ||
    applied.similarityMin || applied.similarityMax || activeSearch;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "#F2F4F7" }}>
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-5">

        {/* Page header */}
        <div
          className="px-7 py-4 flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, #0B1F4B 0%, #162d6b 100%)",
            borderLeft: "5px solid #C9A227",
            borderRadius: 4,
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-0.5" style={{ color: "rgba(201,162,39,0.7)" }}>
              Department of Prisons · Haryana
            </p>
            <h1 className="text-xl font-black uppercase tracking-wide text-white">
              Communication Records Register
            </h1>
            <p className="text-white/40 text-xs mt-0.5">
              Full history of monitored sessions with AI voice verification
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-4 py-2 transition cursor-pointer"
              style={{ background: "#7A0000", color: "#fff", borderRadius: 3 }}
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>

        {/* Filter bar */}
        <FilterBar
          searchInput={searchInput}       setSearchInput={setSearchInput}
          statusFilter={statusFilter}     setStatusFilter={setStatusFilter}
          dateFrom={dateFrom}             setDateFrom={setDateFrom}
          dateTo={dateTo}                 setDateTo={setDateTo}
          similarityMin={similarityMin}   setSimilarityMin={setSimilarityMin}
          similarityMax={similarityMax}   setSimilarityMax={setSimilarityMax}
          showAdvanced={showAdvanced}     setShowAdvanced={setShowAdvanced}
          onSearch={handleSearch}
          onApply={handleApplyFilters}
        />

        {/* Table */}
        <CallLogsTable
          logs={logs}
          loading={loading}
          error={error}
          selected={selected}
          page={page}
          totalPages={totalPages}
          total={total}
          onSelectLog={handleSelectLog}
          onPageChange={setPage}
          formatDate={formatDate}
        />

        {/* Session detail panel */}
        {selected && (
          <SessionDetailPanel
            selected={selected}
            onClose={() => setSelected(null)}
            formatDate={formatDate}
          />
        )}

      </div>
    </div>
  );
}

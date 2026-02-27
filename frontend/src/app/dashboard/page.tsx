"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Contact,
  PhoneCall,
  ShieldAlert,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Mic2,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const REFRESH_MS = 30_000; // 30-second auto-refresh

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  prisoners: { total: number; active: number; inactive: number };
  contacts: { total: number; verified: number; unverified: number };
  activeCalls: number;
  alerts: number;
}

interface CallLogEntry {
  _id: string;
  sessionId: string;
  date: string;
  durationSeconds: number;
  verificationResult: "Verified" | "Failed" | "Pending";
  similarityScore: number;
  notes?: string;
  noiseLevel?: number;
  clarityScore?: number;
  speakerCount?: number;
  prisoner?: { fullName: string; prisonerId: string };
  contact?: { contactName: string; relation: string; phoneNumber: string };
  agent?: { name: string };
}

interface LiveData {
  recentCalls: CallLogEntry[];
  recentAlerts: CallLogEntry[];
  callsTotal: number;
  alertsTotal: number;
  pageSize: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function verificationBadge(result: string) {
  if (result === "Verified")
    return { label: "Verified", color: "#065f46", bg: "#d1fae5" };
  if (result === "Failed")
    return { label: "Unauthorized", color: "#991b1b", bg: "#fee2e2" };
  return { label: "Pending", color: "#1e40af", bg: "#dbeafe" };
}

function alertLevel(score: number) {
  if (score < 15) return { label: "Critical", color: "#991b1b", bg: "#fee2e2" };
  if (score < 35) return { label: "High", color: "#92400e", bg: "#fef3c7" };
  return { label: "Medium", color: "#1e40af", bg: "#dbeafe" };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
}

function StatCard({ label, value, sub, icon, color, loading }: StatCardProps) {
  return (
    <div
      style={{
        background: color,
        borderTop: "4px solid rgba(201,162,39,0.7)",
        borderRadius: 4,
        boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
        position: "relative",
        overflow: "hidden",
      }}
      className="text-white p-5"
    >
      <div style={{ position: "absolute", right: 12, top: 12, opacity: 0.12 }} className="scale-150">
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ opacity: 0.85 }}>
        {label}
      </p>
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin mt-4 opacity-70" />
      ) : (
        <>
          <p className="text-4xl font-black mt-3 tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {sub && (
            <p className="text-[11px] mt-1.5 font-medium" style={{ opacity: 0.75 }}>
              {sub}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="px-6 py-8 text-center text-xs text-gray-400 italic">{message}</div>
  );
}

// ─── Pagination Bar ───────────────────────────────────────────────────────────

function PaginationBar({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  return (
    <div
      className="flex items-center justify-between px-5 py-2"
      style={{ borderTop: "1px solid #E5E8EC", background: "#F9FAFB" }}
    >
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border rounded disabled:opacity-30 hover:bg-gray-100 transition"
        style={{ borderColor: "#CBD0D8", color: "#0B1F4B" }}
      >
        ← Prev
      </button>
      <span className="text-[10px] font-mono text-gray-500">
        Page {page} / {totalPages} &nbsp;·&nbsp; {total} record{total !== 1 ? "s" : ""} today
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border rounded disabled:opacity-30 hover:bg-gray-100 transition"
        style={{ borderColor: "#CBD0D8", color: "#0B1F4B" }}
      >
        Next →
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [live, setLive] = useState<LiveData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLive, setLoadingLive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [callPage, setCallPage] = useState(1);
  const [alertPage, setAlertPage] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoadingStats(true);
    try {
      const res = await fetch(`${API_URL}/api/stats`, { credentials: "include" });
      if (res.status === 401) { router.replace("/login"); return; }
      if (res.ok) setStats(await res.json());
    } catch { /* keep stale */ } finally { setLoadingStats(false); }
  }, [router]);

  const fetchLive = useCallback(async (cp: number, ap: number, silent = false) => {
    if (!silent) setLoadingLive(true);
    else setRefreshing(true);
    try {
      const res = await fetch(
        `${API_URL}/api/stats/live?callPage=${cp}&alertPage=${ap}`,
        { credentials: "include" }
      );
      if (res.status === 401) { router.replace("/login"); return; }
      if (res.ok) setLive(await res.json());
      setLastUpdated(new Date());
    } catch { /* keep stale */ } finally {
      setLoadingLive(false);
      setRefreshing(false);
    }
  }, [router]);

  // Initial load
  useEffect(() => {
    fetchStats(false);
    fetchLive(1, 1, false);
    timerRef.current = setInterval(() => {
      fetchStats(true);
      fetchLive(callPage, alertPage, true);
    }, REFRESH_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch live when pages change
  useEffect(() => { fetchLive(callPage, alertPage, false); }, [callPage, alertPage, fetchLive]);

  const handleManualRefresh = () => {
    fetchStats(true);
    fetchLive(callPage, alertPage, true);
  };

  const calls = live?.recentCalls ?? [];
  const alerts = live?.recentAlerts ?? [];
  const callsTotal = live?.callsTotal ?? 0;
  const alertsTotal = live?.alertsTotal ?? 0;
  const pageSize = live?.pageSize ?? 6;

  return (
    <div className="min-h-screen p-8" style={{ background: "#F2F4F7" }}>

      {/* ── HEADER ── */}
      <div
        className="mb-8 px-7 py-5 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, #0B1F4B 0%, #162d6b 100%)",
          borderLeft: "5px solid #C9A227",
          borderRadius: 4,
          boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: "rgba(201,162,39,0.7)" }}>
            Government of Haryana · Department of Prisons
          </p>
          <h1 className="text-2xl font-black uppercase tracking-wide text-white">
            Central Jail Monitoring Dashboard
          </h1>
          <p className="text-white/50 text-xs mt-1 tracking-wide">
            Real-time operational overview and security analytics
          </p>
        </div>
        <div className="hidden md:flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh now"
              className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:text-white border border-white/20 rounded transition disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Updating…" : "Refresh"}
            </button>
          </div>
          {lastUpdated && (
            <p className="text-[9px] text-white/40 font-mono">
              Last updated {lastUpdated.toLocaleTimeString()} · Auto-refresh 30s
            </p>
          )}
          <div className="flex gap-2">
            <span className="text-[10px] font-bold px-3 py-1 uppercase tracking-widest" style={{ background: "#C9A227", color: "#0B1F4B", borderRadius: 2 }}>
              System Status: Active
            </span>
            <span className="text-[10px] font-bold px-3 py-1 uppercase tracking-widest" style={{ background: "#7A0000", color: "#fff", borderRadius: 2 }}>
              Security Level: High
            </span>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <StatCard
          label="Total Prisoners"
          value={stats?.prisoners.total ?? 0}
          sub={`${stats?.prisoners.active ?? 0} Active · ${stats?.prisoners.inactive ?? 0} Inactive`}
          icon={<Users className="w-16 h-16" />}
          color="#0B1F4B"
          loading={loadingStats}
        />
        <StatCard
          label="Authorised Contacts"
          value={stats?.contacts.total ?? 0}
          sub={`${stats?.contacts.verified ?? 0} Verified`}
          icon={<Contact className="w-16 h-16" />}
          color="#1a5c2e"
          loading={loadingStats}
        />
        <StatCard
          label="Active Calls (30 min)"
          value={stats?.activeCalls ?? 0}
          icon={<PhoneCall className="w-16 h-16" />}
          color="#7a4800"
          loading={loadingStats}
        />
        <StatCard
          label="Security Alerts"
          value={stats?.alerts ?? 0}
          sub="Unauthorized voice verifications"
          icon={<ShieldAlert className="w-16 h-16" />}
          color="#7A0000"
          loading={loadingStats}
        />
      </div>

      {/* ── LIVE SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Live Call Feed ── */}
        <div
          className="lg:col-span-2"
          style={{ background: "#fff", border: "1px solid #CBD0D8", borderTop: "3px solid #0B1F4B", borderRadius: 4 }}
        >
          <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #CBD0D8", background: "#F9FAFB" }}>
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#0B1F4B" }}>
              Recent Call Monitoring <span className="font-normal text-gray-400 normal-case tracking-normal">(today)</span>
            </h2>
            {loadingLive ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5" style={{ background: "#d1fae5", color: "#065f46", borderRadius: 2 }}>
                Live
              </span>
            )}
          </div>

          {loadingLive ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : calls.length === 0 ? (
            <EmptyRow message="No call logs yet. Calls will appear here after voice verification." />
          ) : (
            <div className="divide-y" style={{ borderColor: "#E5E8EC" }}>
              {calls.map((call) => {
                const badge = verificationBadge(call.verificationResult);
                const BadgeIcon =
                  call.verificationResult === "Verified"
                    ? CheckCircle2
                    : call.verificationResult === "Failed"
                    ? XCircle
                    : Clock;
                return (
                  <div key={call._id} className="flex justify-between items-start px-6 py-3 hover:bg-gray-50 transition">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#0B1F4B" }}>
                        {call.prisoner?.fullName ?? "Unknown Prisoner"}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "#5A6073" }}>
                        Contact: {call.contact?.contactName ?? "—"} ({call.contact?.relation ?? "—"})
                        {call.agent?.name ? ` · Agent: ${call.agent.name}` : ""}
                      </p>
                      <p className="text-[10px] mt-0.5 font-mono" style={{ color: "#9CA3AF" }}>
                        {timeLabel(call.date)} · {fmt(call.durationSeconds)} · Score: {call.similarityScore}%
                      </p>
                      {/* Audio quality row */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {(call.speakerCount ?? 1) > 1 && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#fef3c7", color: "#92400e" }}>
                            <Mic2 className="w-2.5 h-2.5" />{call.speakerCount} speakers
                          </span>
                        )}
                        {call.noiseLevel != null && (
                          <span className="flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: call.noiseLevel >= 20 ? "#d1fae5" : call.noiseLevel >= 10 ? "#fef3c7" : "#fee2e2", color: call.noiseLevel >= 20 ? "#065f46" : call.noiseLevel >= 10 ? "#92400e" : "#991b1b" }}>
                            {call.noiseLevel >= 20 ? <Volume2 className="w-2.5 h-2.5" /> : <VolumeX className="w-2.5 h-2.5" />}
                            {call.noiseLevel.toFixed(1)} dB SNR
                          </span>
                        )}
                        {call.clarityScore != null && (
                          <span className="flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "#ede9fe", color: "#5b21b6" }}>
                            <Sparkles className="w-2.5 h-2.5" />{call.clarityScore.toFixed(1)}% clarity
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 ml-3 flex-shrink-0">
                      <BadgeIcon className="w-3.5 h-3.5" style={{ color: badge.color }} />
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5" style={{ background: badge.bg, color: badge.color, borderRadius: 2 }}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <PaginationBar
            page={callPage}
            total={callsTotal}
            pageSize={pageSize}
            onChange={(p) => setCallPage(p)}
          />
        </div>

        {/* ── Security Alerts ── */}
        <div
          style={{ background: "#fff", border: "1px solid #CBD0D8", borderTop: "3px solid #7A0000", borderRadius: 4 }}
        >
          <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #CBD0D8", background: "#FFF5F5" }}>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#7A0000" }}>
              Security Alerts <span className="font-normal text-gray-400 normal-case tracking-normal">(today)</span>
            </h2>
              {alerts.length > 0 && (
                <span className="text-[9px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded-full">
                  {alerts.length}
                </span>
              )}
            </div>
            {loadingLive ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5" style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 2 }}>
                Real-Time
              </span>
            )}
          </div>

          {loadingLive ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-xs text-gray-400 italic">No security alerts. All verifications passed.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#E5E8EC" }}>
              {alerts.map((alert) => {
                const level = alertLevel(alert.similarityScore);
                return (
                  <div key={alert._id} className="px-4 py-3 flex gap-3 items-start hover:bg-red-50/40 transition">
                    <div className="flex-shrink-0 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5" style={{ background: level.bg, color: level.color, borderRadius: 2 }}>
                          {level.label}
                        </span>
                        <span className="text-[9px] font-mono text-gray-400">{timeLabel(alert.date)}</span>
                      </div>
                      <p className="text-xs font-semibold mt-1 truncate" style={{ color: "#1A1A1A" }}>
                        {alert.prisoner?.fullName ?? "Unknown"} — {alert.contact?.contactName ?? "Unknown"}
                      </p>
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: "#6B7280" }}>
                        {alert.contact?.relation ?? ""} · Score: {alert.similarityScore}%
                      </p>
                      {alert.notes && (
                        <p className="text-[10px] mt-0.5 truncate italic" style={{ color: "#9CA3AF" }}>
                          {alert.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <PaginationBar
            page={alertPage}
            total={alertsTotal}
            pageSize={pageSize}
            onChange={(p) => setAlertPage(p)}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Flag, PhoneOff, Bell, ChevronDown, CheckCircle, XCircle, User } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrisonerOption {
  _id: string;
  fullName: string;
  prisonerId: number;
  gender?: string;
  prisonName?: string;
  photo?: string;
  riskTags?: string[];
}

interface ContactOption {
  _id: string;
  contactName: string;
  relation: string;
  phoneNumber: string;
  isVerified: boolean;
}

// ─── Semicircle Gauge ─────────────────────────────────────────────────────────

function SimilarityGauge({ score }: { score: number }) {
  const r = 70;
  const stroke = 14;
  const cx = 90;
  const cy = 90;
  const circumference = Math.PI * r; // half circle

  // 0% → start of arc, 100% → end of arc
  const filled = (score / 100) * circumference;
  const gap = circumference - filled;

  // Colour: green ≥80, yellow 50-79, red <50
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

// ─── Waveform ─────────────────────────────────────────────────────────────────

function LiveWaveform({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const barsRef   = useRef<number[]>(Array.from({ length: 80 }, () => Math.random()));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      const W = canvas!.width;
      const H = canvas!.height;
      ctx.clearRect(0, 0, W, H);

      // Evolve bars
      barsRef.current = barsRef.current.map((v) => {
        if (!active) return v * 0.97 + 0.01 * Math.random(); // decay when paused
        const delta = (Math.random() - 0.5) * 0.18;
        return Math.max(0.05, Math.min(1, v + delta));
      });

      const barW = W / barsRef.current.length;

      barsRef.current.forEach((v, i) => {
        const h = v * (H * 0.85);
        const x = i * barW;
        const y = (H - h) / 2;

        // Colour gradient: green→yellow→red based on amplitude
        const r = Math.round(255 * Math.min(1, v * 2));
        const g = Math.round(255 * Math.min(1, (1 - v) * 2));
        ctx.fillStyle = `rgb(${r},${g},30)`;
        ctx.fillRect(x + 1, y, Math.max(1, barW - 2), h);
      });

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={120}
      className="w-full h-full"
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CALL_ID = Math.floor(Math.random() * 9_000_000 + 1_000_000).toString();

export default function LiveMonitorPage() {
  const router = useRouter();

  // Prisoner list
  const [prisoners, setPrisoners]   = useState<PrisonerOption[]>([]);
  const [selected, setSelected]     = useState<PrisonerOption | null>(null);
  const [contacts, setContacts]     = useState<ContactOption[]>([]);
  const [dropOpen, setDropOpen]     = useState(false);
  const dropRef                     = useRef<HTMLDivElement>(null);

  // Call state
  const [callActive, setCallActive]       = useState(false);
  const [elapsed, setElapsed]             = useState(0);
  const timerRef                          = useRef<NodeJS.Timeout | null>(null);
  const [similarity, setSimilarity]       = useState(0);
  const [verified, setVerified]           = useState(false);
  const [identityConfirmed, setIdConf]    = useState(false);
  const [flagged, setFlagged]             = useState(false);
  const [terminated, setTerminated]       = useState(false);
  const [alertSent, setAlertSent]         = useState(false);
  const [toast, setToast]                 = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    fetch(`${API_URL}/api/prisoners/list`, { credentials: "include" })
      .then((r) => {
        if (r.status === 401) { router.replace("/login"); return null; }
        return r.json();
      })
      .then((d) => d && setPrisoners(d.prisoners || []))
      .catch(() => {});
  }, [router]);

  // Close dropdown on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Fetch contacts when prisoner selected
  useEffect(() => {
    if (!selected) { setContacts([]); return; }
    fetch(`${API_URL}/api/contacts/${selected._id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts || []))
      .catch(() => setContacts([]));
  }, [selected]);

  // Simulate similarity score rising when call is active
  useEffect(() => {
    if (!callActive) return;
    const id = setInterval(() => {
      setSimilarity((s) => {
        const target = selected?.riskTags?.includes("High Risk") ? 65 : 91;
        const diff = target - s;
        return Math.min(100, s + (diff * 0.08) + (Math.random() - 0.3) * 2);
      });
    }, 400);
    return () => clearInterval(id);
  }, [callActive, selected]);

  // Auto-set verified/identity after score rises
  useEffect(() => {
    if (similarity >= 80 && !verified) setVerified(true);
    if (similarity >= 88 && !identityConfirmed) setIdConf(true);
  }, [similarity, verified, identityConfirmed]);

  // Elapsed timer
  useEffect(() => {
    if (callActive) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callActive]);

  function fmt(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function startCall() {
    if (!selected) { showToast("Select a user profile first."); return; }
    setCallActive(true);
    setElapsed(0);
    setSimilarity(0);
    setVerified(false);
    setIdConf(false);
    setFlagged(false);
    setTerminated(false);
    setAlertSent(false);
  }

  function handleFlag() {
    setFlagged(true);
    showToast(`Call ${CALL_ID} has been flagged for review.`);
  }

  function handleTerminate() {
    setCallActive(false);
    setTerminated(true);
    showToast(`Call ${CALL_ID} terminated.`);
  }

  function handleAlert() {
    setAlertSent(true);
    showToast("Alert sent to supervisors.");
  }

  const verifiedContact = contacts.find((c) => c.isVerified) ?? contacts[0] ?? null;

  return (
    <div className="space-y-4">
      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between bg-gray-900 text-white px-5 py-3 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">Live Audio Monitor</span>
          <span className="w-px h-4 bg-gray-600" />
          <span className="text-sm font-mono text-white">CALL ID: {CALL_ID}</span>
          {callActive && (
            <span className="flex items-center gap-1.5 ml-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400 font-semibold tracking-wide">LIVE</span>
            </span>
          )}
        </div>

        {/* Profile selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Upload For User:</span>
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setDropOpen((v) => !v)}
              className="cursor-pointer flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 px-3 py-1.5 rounded-lg text-sm transition"
            >
              {selected ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {selected.fullName[0]}
                  </span>
                  {selected.fullName}
                  <span className="text-gray-400 font-mono text-xs">#{selected.prisonerId}</span>
                </span>
              ) : (
                <span className="text-gray-400">Select User Profile</span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropOpen ? "rotate-180" : ""}`} />
            </button>

            {dropOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden z-50">
                <ul className="max-h-56 overflow-y-auto">
                  {prisoners.length === 0 ? (
                    <li className="px-4 py-3 text-xs text-gray-400 text-center">No prisoners found</li>
                  ) : (
                    prisoners.map((p) => (
                      <li key={p._id}>
                        <button
                          onClick={() => { setSelected(p); setDropOpen(false); setCallActive(false); setSimilarity(0); setVerified(false); setIdConf(false); }}
                          className="cursor-pointer w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700 flex items-center justify-between transition"
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-gray-600 text-xs flex items-center justify-center font-bold shrink-0">
                              {p.fullName[0]}
                            </span>
                            <span className="text-white font-medium">{p.fullName}</span>
                          </span>
                          <span className="text-gray-400 font-mono text-xs">#{p.prisonerId}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Start call button */}
          {!callActive && !terminated && (
            <button
              onClick={startCall}
              className="cursor-pointer px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition"
            >
              Start Monitor
            </button>
          )}
        </div>
      </div>

      {/* ── Waveform ── */}
      <div className="bg-gray-950 rounded-xl overflow-hidden border border-gray-800">
        <div className="relative h-32 px-2 py-2">
          <LiveWaveform active={callActive} />
          <div className="absolute bottom-3 left-4 text-xs font-mono text-gray-400">
            {fmt(elapsed)} / {callActive ? <span className="text-red-400 font-semibold">LIVE</span> : "IDLE"}
          </div>
        </div>
        {/* gradient progress bar */}
        <div className="h-1 bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 transition-all duration-1000"
            style={{ width: callActive ? `${Math.min(100, (elapsed / 600) * 100)}%` : "0%" }}
          />
        </div>
      </div>

      {/* ── Three panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* SPEAKER IDENTITY */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase mb-4">Speaker Identity</p>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
              {selected?.photo ? (
                <img src={selected.photo} alt={selected.fullName} className="w-full h-full object-cover" />
              ) : selected ? (
                <span className="text-2xl font-bold text-gray-400">{selected.fullName[0]}</span>
              ) : (
                <User className="w-8 h-8 text-gray-300" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">
                {selected ? "Identified:" : "No profile selected"}
              </p>
              <p className="text-sm font-bold text-gray-900 truncate">
                {selected?.fullName ?? "—"}
              </p>

              {/* Match badge */}
              {selected && (
                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                  identityConfirmed
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : callActive
                    ? "bg-yellow-100 text-yellow-700 border border-yellow-300 animate-pulse"
                    : "bg-gray-100 text-gray-500 border border-gray-200"
                }`}>
                  {identityConfirmed ? "Confirmed Match" : callActive ? "Analysing…" : "Idle"}
                </span>
              )}

              {/* Meta */}
              {selected && (
                <div className="mt-3 space-y-0.5 text-xs text-gray-600">
                  <p><span className="text-gray-400">Gender:</span> <span className="font-medium">{selected.gender ?? "—"}</span></p>
                  <p><span className="text-gray-400">Prison:</span> <span className="font-medium truncate">{selected.prisonName ?? "—"}</span></p>
                  {verifiedContact && (
                    <p><span className="text-gray-400">Contact:</span> <span className="font-medium">{verifiedContact.contactName}</span></p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Risk tags */}
          {selected?.riskTags && selected.riskTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {selected.riskTags.map((t) => (
                <span key={t} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  t === "High Risk" || t === "Violent Offender" || t === "Escape Risk"
                    ? "bg-red-100 text-red-700"
                    : t === "Gang Affiliated"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-green-100 text-green-700"
                }`}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* SIMILARITY SCORE */}
        <div className="bg-gray-950 rounded-xl border border-gray-800 shadow-sm p-5 flex flex-col items-center">
          <p className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-4 self-start">Similarity Score</p>
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <SimilarityGauge score={Math.round(similarity)} />
            <p className="text-xs text-gray-500 mt-2">
              {similarity === 0
                ? "Waiting for audio…"
                : similarity >= 80
                ? "Strong voice match"
                : similarity >= 50
                ? "Partial match — monitoring"
                : "Low confidence"}
            </p>
          </div>
        </div>

        {/* VERIFICATION STATUS */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase mb-4">Verification Status</p>
          <div className="flex flex-col gap-3">
            {/* Voice match */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition ${
              verified
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-400"
            }`}>
              {verified
                ? <CheckCircle className="w-4 h-4 shrink-0" />
                : <XCircle className="w-4 h-4 shrink-0" />
              }
              VOICE MATCH {verified ? "VERIFIED" : "PENDING"}
            </div>

            {/* Identity */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition ${
              identityConfirmed
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-400"
            }`}>
              {identityConfirmed
                ? <CheckCircle className="w-4 h-4 shrink-0" />
                : <XCircle className="w-4 h-4 shrink-0" />
              }
              IDENTITY {identityConfirmed ? "CONFIRMED" : "NOT CONFIRMED"}
            </div>

            {/* Flagged */}
            {flagged && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-500 text-white font-bold text-sm">
                <Flag className="w-4 h-4 shrink-0" />
                CALL FLAGGED
              </div>
            )}

            {/* Alert sent */}
            {alertSent && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-600 text-white font-bold text-sm">
                <Bell className="w-4 h-4 shrink-0" />
                ALERT DISPATCHED
              </div>
            )}

            {/* Terminated */}
            {terminated && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-700 text-white font-bold text-sm">
                <PhoneOff className="w-4 h-4 shrink-0" />
                CALL TERMINATED
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={handleFlag}
          disabled={!callActive || flagged}
          className="cursor-pointer flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition disabled:opacity-40 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700 active:scale-95"
        >
          <Flag className="w-4 h-4 shrink-0" />
          FLAG
        </button>

        <button
          onClick={handleTerminate}
          disabled={!callActive || terminated}
          className="cursor-pointer flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition disabled:opacity-40 disabled:cursor-not-allowed bg-gray-900 hover:bg-black active:scale-95"
        >
          <PhoneOff className="w-4 h-4 shrink-0" />
          TERMINATE
        </button>

        <button
          onClick={handleAlert}
          disabled={!callActive || alertSent}
          className="cursor-pointer flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition disabled:opacity-40 disabled:cursor-not-allowed bg-orange-500 hover:bg-orange-600 active:scale-95"
        >
          <Bell className="w-4 h-4 shrink-0" />
          SEND ALERT
        </button>
      </div>
    </div>
  );
}

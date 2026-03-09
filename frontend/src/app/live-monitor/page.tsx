"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Phone, PhoneOff, Clock, Shield, Radio,
} from "lucide-react";
import PrisonerDropdown, { PrisonerOption } from "./components/PrisonerDropdown";
import SpeakerIdentityPanel from "./components/SpeakerIdentityPanel";
import SimilarityScorePanel from "./components/SimilarityScorePanel";
import VerificationStatusPanel from "./components/VerificationStatusPanel";
import CallActionButtons from "./components/CallActionButtons";
import VoiceRecorder from "@/app/prisoner/components/VoiceRecorder";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const CALL_ID = Math.floor(Math.random() * 9000000 + 1000000).toString();

interface Segment {
  start: number;
  end: number;
  similarity: number;
  authorized: boolean;
  speaker_status: string;
}

export default function LiveMonitorPage() {
  const router = useRouter();

  const lastClipRef = useRef<File | null>(null);
  const lastVerifiedRef = useRef<File | null>(null);

  const [prisoners, setPrisoners] = useState<PrisonerOption[]>([]);
  const [selected, setSelected] = useState<PrisonerOption | null>(null);

  const [callActive, setCallActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const [similarity, setSimilarity] = useState(0);
  const [verified, setVerified] = useState(false);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [transcript, setTranscript] = useState("");

  const [flagged, setFlagged] = useState(false);
  const [terminated, setTerminated] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [speakerCount, setSpeakerCount] = useState(1);
  const [unknownSpeakers, setUnknownSpeakers] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  // ─────────────────────────────────
  // Load prisoners
  // ─────────────────────────────────

  useEffect(() => {
    fetch(`${API_URL}/api/prisoners/list`, { credentials: "include" })
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => d && setPrisoners(d.prisoners || []));
  }, []);

  // ── Call timer ──
  useEffect(() => {
    if (callActive) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callActive]);

  // ─────────────────────────────────
  // VERIFY VOICE
  // ─────────────────────────────────

  async function verifyVoiceFromUI(file: File) {

    try {

      if (!selected?._id) {
        showToast("No prisoner selected");
        return;
      }

      const fd = new FormData();
      fd.append("prisonerId", selected._id);
      fd.append("file", file);

      const res = await fetch(`${API_URL}/api/voice/verify-advanced`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data?.message || "Verification failed");
        return;
      }

      const segs: Segment[] = data.segments || [];

      setSegments(segs);

      setTranscript(data.transcript || "");

      // similarity
      setSimilarity(data.similarityScore || 0);

      // speakers
      setSpeakerCount(segs.length);

      const unknown = segs.filter((s) => !s.authorized).length;
      setUnknownSpeakers(unknown);

      const hasUnknown = unknown > 0;

      setVerified(!hasUnknown);
      setIdentityConfirmed(!hasUnknown);

      if (data.riskLevel === "high") {
        setFlagged(true);
        showToast("⚠️ High risk detected!");
      }

    } catch (e) {

      showToast("Verification error");

    }

  }

  // ─────────────────────────────────
  // Receive new audio clip
  // ─────────────────────────────────

  function handleNewClip(file: File) {

    lastClipRef.current = file;

    verifyVoiceFromUI(file);

    lastVerifiedRef.current = file;

  }

  // ─────────────────────────────────
  // Re-verify every 3s
  // ─────────────────────────────────

  useEffect(() => {

    if (!callActive) return;

    const interval = setInterval(() => {

      if (
        lastClipRef.current &&
        lastClipRef.current !== lastVerifiedRef.current
      ) {
        verifyVoiceFromUI(lastClipRef.current);
        lastVerifiedRef.current = lastClipRef.current;
      }

    }, 3000);

    return () => clearInterval(interval);

  }, [callActive]);

  // ─────────────────────────────────
  // Call actions
  // ─────────────────────────────────

  function handleFlag() {
    setFlagged(true);
    showToast(`Call ${CALL_ID} flagged`);
  }

  function handleTerminate() {
    setCallActive(false);
    setTerminated(true);
    showToast(`Call ${CALL_ID} terminated`);
  }

  function handleAlert() {
    setAlertSent(true);
    showToast("Alert sent to supervisors");
  }

  function handleSelectPrisoner(p: PrisonerOption) {

    setSelected(p);

    setCallActive(true);
    setElapsed(0);

    setSimilarity(0);
    setVerified(false);
    setIdentityConfirmed(false);

    setSpeakerCount(0);
    setUnknownSpeakers(0);

    setSegments([]);
    setTranscript("");

    setFlagged(false);
    setAlertSent(false);
    setTerminated(false);

  }

  const statusColor =
    terminated
      ? "#7A0000"
      : flagged
      ? "#b45309"
      : callActive
      ? "#16a34a"
      : "#5A6073";

  const statusLabel = terminated
      ? "TERMINATED"
      : flagged
      ? "FLAGGED"
      : callActive
      ? "ACTIVE"
      : "IDLE";

  return (
    <div className="p-6 md:p-8" style={{ minHeight: "100vh", background: "#F2F4F7" }}>

      {/* ── Toast ── */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 flex items-center gap-2.5 text-white px-5 py-3.5 shadow-2xl text-xs font-bold uppercase tracking-widest animate-in"
          style={{
            background: "linear-gradient(135deg, #0B1F4B 0%, #162d6b 100%)",
            border: "2px solid #C9A227",
            borderRadius: 6,
          }}
        >
          {toast}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          HEADER BAR
         ═══════════════════════════════════════════ */}
      <div
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-4 mb-6"
        style={{
          background: "linear-gradient(135deg, #0B1F4B 0%, #162d6b 100%)",
          borderLeft: "5px solid #C9A227",
          borderRadius: 6,
        }}
      >
        {/* Left: Call info */}
        <div className="flex items-center gap-5">
          {/* Status dot */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            {callActive && !terminated ? (
              <Radio className="w-5 h-5 text-green-400 animate-pulse" />
            ) : terminated ? (
              <PhoneOff className="w-5 h-5 text-red-400" />
            ) : (
              <Phone className="w-5 h-5 text-gray-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-white/70">CALL&nbsp;ID</span>
              <span className="text-sm font-mono font-bold text-white">{CALL_ID}</span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
                style={{ background: statusColor, color: "#fff" }}
              >
                {statusLabel}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1.5">
              <span className="flex items-center gap-1.5 text-xs text-white/50">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono font-semibold text-white/80">{fmt(elapsed)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-white/50">
                <Shield className="w-3.5 h-3.5" />
                <span className="font-semibold text-white/80">
                  {similarity > 0 ? `${Math.round(similarity)}% match` : "Awaiting…"}
                </span>
              </span>
            </div>
          </div>
          </div>

        {/* Right: Prisoner select */}
          <PrisonerDropdown
            prisoners={prisoners}
            selected={selected}
            onSelect={handleSelectPrisoner}
          />
        </div>

      {/* ═══════════════════════════════════════════
          VOICE RECORDER (hidden visually, still functional)
         ═══════════════════════════════════════════ */}
      <div className="mb-6">
        <VoiceRecorder onAudioReady={(file) => file && handleNewClip(file)} />
      </div>

      {/* ═══════════════════════════════════════════
          ANALYSIS PANELS
         ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <SpeakerIdentityPanel
          selected={selected}
          identityConfirmed={identityConfirmed}
          callActive={callActive}
        />

        <SimilarityScorePanel
          similarity={similarity}
          speakerCount={speakerCount}
          unknownSpeakers={unknownSpeakers}
        />

        <VerificationStatusPanel
          verified={verified}
          identityConfirmed={identityConfirmed}
          flagged={flagged}
          alertSent={alertSent}
          terminated={terminated}
        />

      </div>

      {/* SPEAKER TIMELINE */}

      <div className="bg-white p-5 border rounded mb-6">

        <h3 className="font-bold mb-3">Speaker Timeline</h3>

        {segments.map((s, i) => (

          <div
            key={i}
            className="flex justify-between border-b py-2 text-sm"
          >

            <span>
              {s.start.toFixed(2)}s — {s.end.toFixed(2)}s
            </span>

            <span
              className={
                s.authorized
                  ? "text-green-600 font-semibold"
                  : "text-red-600 font-semibold"
              }
            >
              {s.speaker_status}
            </span>

          </div>

        ))}

      </div>

      {/* Transcript */}

      {transcript && (
        <div className="bg-white p-5 border rounded mb-6">
          <h3 className="font-bold mb-2">Transcript</h3>
          <p className="text-sm">{transcript}</p>
        </div>
      )}

      {/* Buttons */}

      <CallActionButtons
        callActive={callActive}
        flagged={flagged}
        terminated={terminated}
        alertSent={alertSent}
        onFlag={handleFlag}
        onTerminate={handleTerminate}
        onAlert={handleAlert}
      />

    </div>
  );

}
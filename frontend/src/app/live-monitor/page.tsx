"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import VoiceRecorder from "@/app/prisoner/components/VoiceRecorder";
import PrisonerDropdown, { PrisonerOption } from "./components/PrisonerDropdown";
import LiveWaveform from "./components/LiveWaveform";
import SpeakerIdentityPanel from "./components/SpeakerIdentityPanel";
import SimilarityScorePanel from "./components/SimilarityScorePanel";
import VerificationStatusPanel from "./components/VerificationStatusPanel";
import CallActionButtons from "./components/CallActionButtons";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ContactOption {
  _id: string;
  contactName: string;
  relation: string;
  phoneNumber: string;
  isVerified: boolean;
}

const CALL_ID = Math.floor(Math.random() * 9_000_000 + 1_000_000).toString();

export default function LiveMonitorPage() {
  const router = useRouter();
  const lastClipRef = useRef<File | null>(null);

  // Prisoner list
  const [prisoners, setPrisoners] = useState<PrisonerOption[]>([]);
  const [selected, setSelected]   = useState<PrisonerOption | null>(null);
  const [contacts, setContacts]   = useState<ContactOption[]>([]);

  // Call state
  const [callActive, setCallActive]     = useState(false);
  const [elapsed, setElapsed]           = useState(0);
  const timerRef                        = useRef<NodeJS.Timeout | null>(null);
  const [similarity, setSimilarity]     = useState(0);
  const [verified, setVerified]         = useState(false);
  const [identityConfirmed, setIdConf]  = useState(false);
  const [flagged, setFlagged]           = useState(false);
  const [terminated, setTerminated]     = useState(false);
  const [alertSent, setAlertSent]       = useState(false);
  const [toast, setToast]               = useState<string | null>(null);

  // Audio quality from last verification
  interface AudioQuality {
    snrDb: number;
    clarityScore: number;
    speakerCount: number;
    noiseLabel: string;
    clarityLabel: string;
  }
  const [audioQuality, setAudioQuality] = useState<AudioQuality | null>(null);
  

  // Auth guard + load prisoners
  useEffect(() => {
    fetch(`${API_URL}/api/prisoners/list`, { credentials: "include" })
      .then((r) => {
        if (r.status === 401) { router.replace("/login"); return null; }
        return r.json();
      })
      .then((d) => d && setPrisoners(d.prisoners || []))
      .catch(() => {});
  }, [router]);

  // Fetch contacts when prisoner changes
  useEffect(() => {
    if (!selected) { setContacts([]); return; }
    fetch(`${API_URL}/api/contacts/${selected._id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts || []))
      .catch(() => setContacts([]));
  }, [selected]);

  // Simulate similarity score rising when call is active




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

  const verifiedContact = contacts.find((c) => c.isVerified) ?? contacts[0] ?? null;

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
  setAudioQuality(null);
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
async function verifyVoiceFromUI(file: File) {
  try {
    if (!verifiedContact?._id) {
      showToast("No verified contact selected");
      return;
    }

    const fd = new FormData();
    fd.append("contactId", verifiedContact._id); //  correct id
    fd.append("audio", file);                   // correct field name

    const res = await fetch(`${API_URL}/api/voice/verify`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Verify error:", data);
      showToast(data?.message || "Voice verification failed");
      return;
    }

    const result = data.result;

    if (typeof result?.score === "number") {
      const percent = Math.round(result.score * 100);
      setSimilarity(percent);

      // Store audio quality metrics
      if (result.audioQuality) {
        setAudioQuality(result.audioQuality);
      }

      if (result.authorized) {
        setVerified(true);
        setIdConf(true);
      } else {
        setVerified(false);
        setIdConf(false);

        if (!alertSent) {
          setAlertSent(true);
          showToast("Unauthorized voice detected! Alert sent.");
        }
      }
    }

  } catch (err) {
    console.error("Verify exception:", err);
    showToast("Verification error");
  }
}


// When we get a new clip from VoiceRecorder, store it
function handleNewClip(file: File) {
  console.log("🎙 New clip received:", file);
  lastClipRef.current = file;
  showToast("Verifying voice...");
  verifyVoiceFromUI(file);
}
useEffect(() => {
  if (!callActive) return;

  const interval = setInterval(() => {
    if (lastClipRef.current) {
      console.log(" Re-verifying voice...");
      verifyVoiceFromUI(lastClipRef.current);
    }
  }, 10000); // every 10 seconds

  return () => clearInterval(interval);
}, [callActive]);
  

  return (
    <div className="p-8 space-y-4" style={{ minHeight: "100vh", background: "#F2F4F7" }}>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 text-white px-5 py-3 shadow-xl text-xs font-bold uppercase tracking-widest animate-fade-in"
          style={{ background: "#0B1F4B", border: "2px solid #C9A227", borderRadius: 4 }}
        >
          {toast}
        </div>
      )}

      {/* Header bar */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          background: "linear-gradient(135deg, #0B1F4B 0%, #162d6b 100%)",
          borderLeft: "5px solid #C9A227",
          borderRadius: 4,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: "rgba(201,162,39,0.7)" }}>
            Live Audio Monitor · PCMS
          </span>
          <span className="w-px h-4" style={{ background: "rgba(255,255,255,0.2)" }} />
          <span className="text-sm font-mono text-white">CALL ID: {CALL_ID}</span>
          {callActive && (
            <span className="flex items-center gap-1.5 ml-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400 font-bold tracking-wide">LIVE</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Upload For User:</span>
          <PrisonerDropdown
            prisoners={prisoners}
            selected={selected}
            onSelect={(p) => {
              setSelected(p);
              setCallActive(false);
              setSimilarity(0);
              setVerified(false);
              setIdConf(false);
            }}
          />
          {!callActive && !terminated && (
            <button
              onClick={startCall}
              className="cursor-pointer px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition"
              style={{ background: "#C9A227", color: "#0B1F4B", borderRadius: 3 }}
            >
              Start Monitor
            </button>
          )}
        </div>
      </div>

      {/* Voice recorder */}
      <VoiceRecorder
        onAudioReady={(file) => {
          if (file) handleNewClip(file);
        }}
      />

      {/* Waveform */}
      <div className="bg-gray-950 overflow-hidden" style={{ borderRadius: 4, border: "1px solid #1e3a7a" }}>
        <div className="relative h-32 px-2 py-2">
          <LiveWaveform active={callActive} />
          <div className="absolute bottom-3 left-4 text-xs font-mono text-gray-400">
            {fmt(elapsed)} /{" "}
            {callActive ? <span className="text-red-400 font-semibold">LIVE</span> : "IDLE"}
          </div>
        </div>
        <div className="h-1 bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 transition-all duration-1000"
            style={{ width: callActive ? `${Math.min(100, (elapsed / 600) * 100)}%` : "0%" }}
          />
        </div>
      </div>

      {/* Three status panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SpeakerIdentityPanel
          selected={selected}
          identityConfirmed={identityConfirmed}
          callActive={callActive}
          verifiedContact={verifiedContact}
        />
        <SimilarityScorePanel similarity={similarity} audioQuality={audioQuality} />
        <VerificationStatusPanel
          verified={verified}
          identityConfirmed={identityConfirmed}
          flagged={flagged}
          alertSent={alertSent}
          terminated={terminated}
        />
      </div>

      {/* Action buttons */}
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

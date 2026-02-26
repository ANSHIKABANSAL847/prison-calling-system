"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import PhotoUploader from "@/components/PhotoUploader";
import VoiceRecorder from "../components/VoiceRecorder";
import {
  ArrowLeft, Loader2, UserPlus,
  Mic, CheckCircle, Users, User,
  FileText, ShieldAlert, TriangleAlert, Camera,
} from "lucide-react";
import { addPrisonerSchema, validateField } from "@/lib/validators";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const RISK_TAG_OPTIONS = [
  "High Risk",
  "Escape Risk",
  "Violent Offender",
  "Gang Affiliated",
  "Good Conduct",
] as const;

const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;

const inputCls =
  "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 " +
  "placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-2 " +
  "focus:ring-gray-100 transition";

const labelCls = "block text-sm font-medium text-gray-600 mb-1.5";

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <span className="text-gray-500">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddPrisonerPage() {
  const router = useRouter();

  const [prisonerId,    setPrisonerId]    = useState("");
  const [fullName,      setFullName]      = useState("");
  const [dateOfBirth,   setDateOfBirth]   = useState("");
  const [gender,        setGender]        = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [photo,         setPhoto]         = useState("");
  const [caseNumber,    setCaseNumber]    = useState("");
  const [prisonName,    setPrisonName]    = useState("");
  const [sentenceYears, setSentenceYears] = useState("");
  const [riskTags,      setRiskTags]      = useState<string[]>([]);
  const [audioFile,     setAudioFile]     = useState<File | null>(null);

  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [createdId,     setCreatedId]     = useState<string | null>(null);
  const [voiceEnrolled, setVoiceEnrolled] = useState(false);

  function toggleTag(tag: string) {
    setRiskTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!audioFile) {
      setError("Voice enrollment is required — please record a voice sample.");
      return;
    }

    const payload = {
      prisonerId:    Number(prisonerId),
      fullName,
      dateOfBirth:   dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender,
      photo,
      aadhaarNumber: aadhaarNumber || undefined,
      caseNumber,
      prisonName,
      sentenceYears: Number(sentenceYears),
      riskTags,
    };

    const validationError = validateField(addPrisonerSchema, payload);
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const prisonerRes = await fetch(`${API_URL}/api/prisoners/add-prisoner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const prisonerData = await prisonerRes.json();
      if (!prisonerRes.ok) { setError(prisonerData.message || "Failed to add prisoner"); return; }

      const newId: string = prisonerData.prisoner._id;
      const fd = new FormData();
      fd.append("audio",      audioFile);
      fd.append("prisonerId", newId);
      const voiceRes = await fetch(`${API_URL}/api/voice/enroll`, {
        method: "POST", credentials: "include", body: fd,
      });

      setCreatedId(newId);
      setVoiceEnrolled(voiceRes.ok);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (createdId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 w-full max-w-md text-center space-y-5">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Prisoner Registered</h2>
            <p className="text-sm text-gray-500 mt-2">
              {voiceEnrolled
                ? "Details and voice sample saved successfully."
                : "Details saved. Voice enrollment failed — retry from the profile."}
            </p>
          </div>
          {!voiceEnrolled && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-semibold rounded-full">
              Voice enrollment pending
            </span>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => router.push("/prisoner")}
              className="cursor-pointer flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition">
              Back to List
            </button>
            <button onClick={() => router.push(`/prisoner/${createdId}`)}
              className="cursor-pointer flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition">
              <Users className="w-4 h-4" /> View Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-4">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 shrink-0">
        <button type="button" onClick={() => router.push("/prisoner")}
          className="cursor-pointer p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-700 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Inmate Registration</h1>
          <p className="text-xs text-gray-400 mt-0.5">Enter comprehensive data for the new prisoner</p>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="shrink-0 flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          <TriangleAlert className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Body: form + actions ── */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 min-h-0 flex flex-col gap-4"
      >
        {/* Two-column content */}
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-5 overflow-y-auto">

          {/* ═══ LEFT ═══ */}
          <div className="flex flex-col gap-5">

            {/* Personal Information */}
            <SectionCard
              icon={<User className="w-4 h-4" />}
              title="Personal Information"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Prisoner ID (UID) <span className="text-red-400">*</span></label>
                  <input type="number" value={prisonerId}
                    onChange={e => setPrisonerId(e.target.value)}
                    placeholder="e.g. 104592" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Full Name <span className="text-red-400">*</span></label>
                  <input type="text" value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Enter legal name" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Date of Birth <span className="text-red-400">*</span></label>
                  <input type="date" value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Gender <span className="text-red-400">*</span></label>
                  <select value={gender} onChange={e => setGender(e.target.value)} className={inputCls}>
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Aadhaar Number (12-digit)</label>
                  <input type="text" value={aadhaarNumber}
                    onChange={e => setAadhaarNumber(e.target.value)}
                    placeholder="XXXX XXXX XXXX (optional)" maxLength={12} className={inputCls} />
                </div>
              </div>
            </SectionCard>

            {/* Legal & Case Information */}
            <SectionCard
              icon={<FileText className="w-4 h-4" />}
              title="Legal & Case Information"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Case Reference Number <span className="text-red-400">*</span></label>
                  <input type="text" value={caseNumber}
                    onChange={e => setCaseNumber(e.target.value)}
                    placeholder="e.g. CR/2024/1001" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Assigned Facility <span className="text-red-400">*</span></label>
                  <input type="text" value={prisonName}
                    onChange={e => setPrisonName(e.target.value)}
                    placeholder="e.g. Tihar Jail, Delhi" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Sentence Duration (Years) <span className="text-red-400">*</span></label>
                  <input type="number" value={sentenceYears}
                    onChange={e => setSentenceYears(e.target.value)}
                    placeholder="e.g. 10" min={0} step={0.5} className={inputCls} />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ═══ RIGHT ═══ */}
          <div className="flex flex-col gap-5">

            {/* Photo upload */}
            <SectionCard
              icon={<Camera className="w-4 h-4" />}
              title="Official Identification"
            >
              <PhotoUploader value={photo} onChange={setPhoto} label="Prisoner Photo" required />
              <p className="text-xs text-gray-400 mt-2">JPG, PNG allowed · Max 5 MB</p>
            </SectionCard>

            {/* Voice enrollment */}
            <SectionCard
              icon={<Mic className="w-4 h-4" />}
              title="Voice Enrollment"
            >
              <div className="space-y-3">
                {/* Status bar */}
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-500">Voice Sample Status</span>
                    <span className={`text-xs font-bold ${audioFile ? "text-green-600" : "text-red-500"}`}>
                      {audioFile ? "Captured" : "Required"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${audioFile ? "bg-green-500 w-full" : "bg-blue-500 w-0"}`}
                    />
                  </div>
                </div>
                <VoiceRecorder onAudioReady={setAudioFile} />
              </div>
            </SectionCard>

            {/* Risk tags */}
            <SectionCard
              icon={<ShieldAlert className="w-4 h-4" />}
              title="Security Risk Tags"
            >
              <div className="space-y-1">
                {RISK_TAG_OPTIONS.map(tag => {
                  const on = riskTags.includes(tag);
                  return (
                    <label
                      key={tag}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleTag(tag)}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700">{tag}</span>
                    </label>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        </div>

        {/* ── Footer action bar ── */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-5 py-3.5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <button
            type="button"
            onClick={() => router.push("/prisoner")}
            className="cursor-pointer px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow shadow-blue-200 transition"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              : <><UserPlus className="w-4 h-4" /> Register Prisoner</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
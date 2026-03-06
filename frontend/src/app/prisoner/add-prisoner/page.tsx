"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PhotoUploader from "@/components/PhotoUploader";
import VoiceRecorder from "../components/VoiceRecorder";
import {
  ArrowLeft, Loader2, UserPlus, Pencil,
  Mic, CheckCircle, Users, User,
  FileText, ShieldAlert, TriangleAlert, Camera, Upload,
} from "lucide-react";
import { addPrisonerSchema, updatePrisonerSchema, validateField } from "@/lib/validators";

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

// ─── Inner page (needs useSearchParams) ───────────────────────────────────────

function AddEditPrisonerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;

  const [prisonerId, setPrisonerId] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [photo, setPhoto] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [prisonName, setPrisonName] = useState("");
  const [sentenceYears, setSentenceYears] = useState("");
  const [riskTags, setRiskTags] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);

  // Voice enrollment data (read-only in edit mode)
  const [voicePaths, setVoicePaths] = useState<string[]>([]);
  const [voiceSamples, setVoiceSamples] = useState(0);
  const [isVoiceEnrolled, setIsVoiceEnrolled] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [voiceEnrolled, setVoiceEnrolled] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  /* ── Fetch existing prisoner in edit mode ── */
  useEffect(() => {
    if (!editId) return;
    setFetching(true);
    fetch(`${API_URL}/api/prisoners/${editId}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) { setError("Failed to load prisoner data."); return; }
        const data = await res.json();
        const p = data.prisoner;
        setPrisonerId(String(p.prisonerId));
        setFullName(p.fullName);
        setDateOfBirth(p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split("T")[0] : "");
        setGender(p.gender);
        setPhoto(p.photo || "");
        setAadhaarNumber(p.aadhaarNumber || "");
        setCaseNumber(p.caseNumber);
        setPrisonName(p.prisonName);
        setSentenceYears(String(p.sentenceYears));
        setRiskTags(p.riskTags || []);
        setIsActive(p.isActive !== false);
        setVoicePaths(p.voicePaths || []);
        setVoiceSamples(p.voiceSamples || 0);
        setIsVoiceEnrolled(p.isVoiceEnrolled || false);
      })
      .catch(() => setError("Network error loading prisoner."))
      .finally(() => setFetching(false));
  }, [editId]);

  function toggleTag(tag: string) {
    setRiskTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);
  }

  /* ── Submit: CREATE or UPDATE ── */
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!isEditMode && audioFiles.length < 1) {
      setError("Minimum 1 voice sample required.");
      return;
    }

    if (isEditMode) {
      /* ── EDIT flow ── */
      const payload: Record<string, unknown> = {
        fullName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        photo,
        aadhaarNumber: aadhaarNumber || undefined,
        caseNumber,
        prisonName,
        sentenceYears: Number(sentenceYears),
        riskTags,
        isActive,
      };
      Object.keys(payload).forEach((k) => { if (payload[k] === undefined) delete payload[k]; });

      const validationError = validateField(updatePrisonerSchema, payload);
      if (validationError) { setError(validationError); return; }

      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/prisoners/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.message || "Failed to update prisoner"); return; }
        setEditSuccess(true);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      /* ── CREATE flow (original) ── */
      const payload = {
        prisonerId: Number(prisonerId),
        fullName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
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
        fd.append("prisonerId", newId);
        audioFiles.forEach((file) => fd.append("samples", file));

const voiceRes = await fetch(`${API_URL}/api/voice/extract_speakers`, {
  method: "POST",
  credentials: "include",
  body: fd,
});

if (!voiceRes.ok) {
  const data = await voiceRes.json();
  setError(data.message || "Voice enrollment failed");
  return;
}
        setCreatedId(newId);
        setVoiceEnrolled(true);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  }

  /* ── Edit success screen ── */
  if (editSuccess) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 w-full max-w-md text-center space-y-5">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Prisoner Updated</h2>
            <p className="text-sm text-gray-500 mt-2">All changes have been saved successfully.</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => router.push("/prisoner")}
              className="cursor-pointer flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition">
              Back to List
            </button>
            <button onClick={() => router.push(`/prisoner/${editId}`)}
              className="cursor-pointer flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition">
              <Users className="w-4 h-4" /> View Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Create success ───────────────────────────────────────────────────────
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
function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
  if (!e.target.files) return;

const selectedFiles = Array.from(e.target.files).filter((file) =>
    file.type.startsWith("audio/")
  );

  if (selectedFiles.length === 0) {
    setError("Please upload valid audio files only.");
    return;
  }

  setAudioFiles((prev) => [...prev, ...selectedFiles]);
}
  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-4">

      {/* ── Loading state for edit mode ── */}
      {fetching && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 shrink-0">
        <button type="button" onClick={() => router.push("/prisoner")}
          className="cursor-pointer p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-700 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEditMode ? "Edit Inmate Record" : "New Inmate Registration"}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {isEditMode ? "Update prisoner details below" : "Enter comprehensive data for the new prisoner"}
          </p>
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
                    disabled={isEditMode}
                    placeholder="e.g. 104592" className={`${inputCls} ${isEditMode ? "bg-gray-100 cursor-not-allowed" : ""}`} />
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

            {/* Voice enrollment — only shown in create mode */}
            {!isEditMode && (
              <SectionCard
                icon={<Mic className="w-4 h-4" />}
                title="Voice Enrollment (Multiple Samples Allowed)"
              >
                <div className="space-y-6">

                  {/* Status bar */}
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500">Voice Sample Status</span>
                      <span className={`text-xs font-medium ${audioFiles.length >= 1 ? "text-green-600" : "text-red-500"}`}>
                        {audioFiles.length >= 1 ? `${audioFiles.length} ready` : `Minimum 1 Required (${audioFiles.length}/1)`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-blue-500 transition-all duration-500"
                        style={{ width: `${Math.min((audioFiles.length / 1) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Record new sample */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Record a new voice sample</p>
                    <VoiceRecorder
                      onAudioReady={(file) => {
                        if (file) setAudioFiles((prev) => [...prev, file]);
                      }}
                      manualSave={true}
                      autoResetAfterSave={true}
                      hideUploadButton={true}
                    />
                  </div>

                  {/* ONE upload button for multiple files */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Or upload multiple existing audio files</p>
                    <label className="cursor-pointer block w-full border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-8 text-center transition hover:bg-blue-50">
                      <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Upload className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className="block text-sm font-medium text-gray-700">Select Audio Files</span>
                      <p className="text-xs text-gray-500 mt-1">MP3, WAV, M4A, WebM • Any number of files</p>
                      <input
                        type="file"
                        accept=".wav,.mp3,.m4a,.webm"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Selected files list */}
                  {audioFiles.length > 0 && (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-gray-600">Selected Samples ({audioFiles.length})</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {audioFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded border">
                            <span className="truncate max-w-[220px]">{file.name || `Recorded Sample ${index + 1}`}</span>
                            <button
                              type="button"
                              onClick={() => setAudioFiles((prev) => prev.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Status toggle — only in edit mode */}
            {isEditMode && (
              <SectionCard icon={<User className="w-4 h-4" />} title="Communication Status">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Status:</label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`cursor-pointer px-3 py-1.5 text-xs rounded-full border font-medium transition ${isActive
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-red-100 text-red-700 border-red-300"
                      }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </button>
                </div>
              </SectionCard>
            )}

            {/* Enrolled Voice Samples — read-only in edit mode */}
            {isEditMode && (
              <SectionCard icon={<Mic className="w-4 h-4" />} title="Enrolled Voice Samples">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Enrollment Status:</span>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${isVoiceEnrolled
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-yellow-100 text-yellow-700 border border-yellow-300"
                      }`}>
                      {isVoiceEnrolled ? "Enrolled" : "Not Enrolled"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Samples: <span className="font-semibold text-gray-800">{voiceSamples}</span>
                  </div>
                  {voicePaths.length > 0 && (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-1.5">
                      <p className="text-xs font-medium text-gray-500 mb-2">Voice Files</p>
                      {voicePaths.map((vPath, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded border border-gray-200">
                          <Mic className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate text-gray-700">
                            {vPath.split('/').pop() || vPath.split('\\').pop() || `Sample ${i + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {voicePaths.length === 0 && !isVoiceEnrolled && (
                    <p className="text-xs text-gray-400 italic">No voice samples enrolled yet.</p>
                  )}
                </div>
              </SectionCard>
            )}

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
              : isEditMode
                ? <><Pencil className="w-4 h-4" /> Save Changes</>
                : <><UserPlus className="w-4 h-4" /> Register Prisoner</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Exported page with Suspense boundary ─────────────────────────────────────

export default function AddPrisonerPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    }>
      <AddEditPrisonerInner />
    </Suspense>
  );
}
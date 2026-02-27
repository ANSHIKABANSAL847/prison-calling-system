"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PhotoUploader from "@/components/PhotoUploader";
import { Loader2, UserPlus, ArrowLeft, User, Phone, Shield, Mic, CheckCircle2, XCircle, PlusCircle } from "lucide-react";
import { addContactSchema, validateField } from "@/lib/validators";
import VoiceRecorder from "../../prisoner/components/VoiceRecorder";
import InmateSelector, { PrisonerOption } from "../components/InmateSelector";
import SectionHeader from "../components/SectionHeader";
import { RELATION_OPTIONS, SINGLETON_RELATIONS } from "../components/constants";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AddContactPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPrisonerId = searchParams.get("prisonerId");

  const [selectedPrisoner, setSelectedPrisoner] = useState<PrisonerOption | null>(null);
  const [takenRelations, setTakenRelations] = useState<string[]>([]);

  useEffect(() => {
    if (!urlPrisonerId) return;
    fetch(`${API_URL}/api/prisoners/${urlPrisonerId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const p = d.prisoner || d;
        if (p?._id) setSelectedPrisoner({ _id: p._id, fullName: p.fullName, prisonerId: p.prisonerId, prisonName: p.prisonName });
      })
      .catch(() => {});
  }, [urlPrisonerId]);

  const effectivePrisonerId = urlPrisonerId || selectedPrisoner?._id || null;
  const prisonerLocked = Boolean(urlPrisonerId);

  useEffect(() => {
    if (!effectivePrisonerId) { setTakenRelations([]); return; }
    fetch(`${API_URL}/api/contacts/${effectivePrisonerId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const taken = (d.contacts as { relation: string }[] || [])
          .map((c) => c.relation)
          .filter((r) => SINGLETON_RELATIONS.includes(r as typeof SINGLETON_RELATIONS[number]));
        setTakenRelations(taken);
      })
      .catch(() => setTakenRelations([]));
  }, [effectivePrisonerId]);

  const [contactName, setContactName] = useState("");
  const [relation, setRelation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [photo, setPhoto] = useState("");
  const [voiceFiles, setVoiceFiles] = useState<File[]>([]);
  const [showRecorder, setShowRecorder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const singletonConflict =
    relation !== "" &&
    SINGLETON_RELATIONS.includes(relation as typeof SINGLETON_RELATIONS[number]) &&
    takenRelations.includes(relation);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!effectivePrisonerId) { setError("Please select an inmate first."); return; }
    if (singletonConflict) {
      setError(`This prisoner already has a ${relation} registered. Only one ${relation} is allowed.`);
      return;
    }
    if (voiceFiles.length === 0) { setError("At least one voice sample is required."); return; }
    const payload = { contactName, relation, phoneNumber, photo: photo || undefined };
    const validationError = validateField(addContactSchema, payload);
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      // 1. Create contact
      const res = await fetch(`${API_URL}/api/contacts/${effectivePrisonerId}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.message || "Failed to add contact."); return; }
      const contactId = data.contact?._id || data._id;
      if (!contactId) throw new Error("Server did not return a contact ID.");

      // 2. Enroll every voice sample (one request per file)
      for (const file of voiceFiles) {
        const voiceData = new FormData();
        voiceData.append("audio", file);
        voiceData.append("contactId", contactId);
        const voiceRes = await fetch(`${API_URL}/api/voice/enroll`, {
          method: "POST", credentials: "include", body: voiceData,
        });
        const voiceJson = await voiceRes.json().catch(() => ({}));
        if (!voiceRes.ok) throw new Error(voiceJson.message || "Voice enrollment failed.");
      }

      setSuccess(true);
      setTimeout(() => router.push(`/prisoner/${effectivePrisonerId}`), 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button type="button" onClick={() => router.back()}
              className="cursor-pointer flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-gray-800" />
            <h1 className="text-2xl font-bold text-gray-900">Add Authorized Contact</h1>
            {selectedPrisoner && (
              <span className="text-sm text-gray-400 font-normal mt-0.5">
                — linking to <span className="font-medium text-gray-700">{selectedPrisoner.fullName}</span>{" "}
                <span className="font-mono text-gray-400">#{selectedPrisoner.prisonerId}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm text-center font-medium">
          Contact added &amp; {voiceFiles.length} voice sample{voiceFiles.length !== 1 ? "s" : ""} enrolled successfully! Redirecting…
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm text-center">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            {/* Inmate section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <SectionHeader icon={<Shield className="w-4 h-4" />} title="Select Inmate"
                subtitle={prisonerLocked ? "Pre-filled from inmate profile" : "Choose the inmate this contact belongs to"} />
              {prisonerLocked ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-gray-900 text-white text-sm flex items-center justify-center font-bold shrink-0">
                    {selectedPrisoner?.fullName?.[0] ?? "…"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedPrisoner?.fullName ?? (
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                        </span>
                      )}
                    </p>
                    {selectedPrisoner && (
                      <p className="text-xs text-gray-400 font-mono">
                        #{selectedPrisoner.prisonerId}{selectedPrisoner.prisonName && ` · ${selectedPrisoner.prisonName}`}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <InmateSelector selected={selectedPrisoner} onSelect={setSelectedPrisoner} />
              )}
            </div>

            {/* Contact details section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5 flex-1">
              <SectionHeader icon={<User className="w-4 h-4" />} title="Contact Information"
                subtitle="Basic details of the authorized contact" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 text-sm transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Relation <span className="text-red-500">*</span>
                  </label>
                  <select value={relation} onChange={(e) => setRelation(e.target.value)}
                    className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none text-sm bg-white transition ${singletonConflict ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-gray-900"}`}>
                    <option value="">Select…</option>
                    {RELATION_OPTIONS.map((r) => {
                      const disabled = SINGLETON_RELATIONS.includes(r as typeof SINGLETON_RELATIONS[number]) && takenRelations.includes(r);
                      return <option key={r} value={r} disabled={disabled}>{r}{disabled ? " (already registered)" : ""}</option>;
                    })}
                  </select>
                  {singletonConflict && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">
                      This prisoner already has a <strong>{relation}</strong> registered. Remove the existing one first or choose a different relation.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91XXXXXXXXXX" maxLength={15}
                      className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 text-sm transition" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Photo <span className="text-gray-400 font-normal normal-case">(optional)</span>
                </label>
                <PhotoUploader value={photo} onChange={setPhoto} label="" />
              </div>
            </div>
          </div>

          {/* Voice enrollment */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
            <SectionHeader icon={<Mic className="w-4 h-4" />} title="Voice Samples"
              subtitle="Record multiple 3–10 second samples for better verification accuracy" />

            {/* Recorded samples list */}
            {voiceFiles.length > 0 && (
              <div className="space-y-2">
                {voiceFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      <span className="font-medium text-green-800">Sample {i + 1}</span>
                      <span className="text-green-600 text-xs">— {(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                    <button type="button"
                      onClick={() => setVoiceFiles(voiceFiles.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-600 transition">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Recorder */}
            {showRecorder ? (
              <VoiceRecorder manualSave onAudioReady={(file) => {
                if (file) setVoiceFiles((prev) => [...prev, file]);
                setShowRecorder(false);
              }} />
            ) : (
              <button type="button"
                onClick={() => setShowRecorder(true)}
                className="cursor-pointer flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-gray-500 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-800 transition">
                <PlusCircle className="w-4 h-4" />
                {voiceFiles.length === 0 ? "Record Voice Sample" : "Add Another Sample"}
              </button>
            )}

            {voiceFiles.length === 0 && !showRecorder && (
              <p className="text-xs text-red-500 text-center">At least one voice sample is required</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button type="submit" disabled={loading || voiceFiles.length === 0 || singletonConflict}
            className="cursor-pointer flex items-center justify-center gap-2 bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition duration-200">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><UserPlus className="w-4 h-4" /> Add Contact</>}
          </button>
          <button type="button" onClick={() => router.back()}
            className="cursor-pointer px-6 py-2.5 border-2 border-gray-200 hover:border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 transition">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PhotoUploader from "@/components/PhotoUploader";
import {
  Loader2, UserPlus, ArrowLeft, Search, ChevronDown,
  User, Phone, Shield, Mic,
} from "lucide-react";
import { addContactSchema, validateField } from "@/lib/validators";
import VoiceRecorder from "../../prisoner/components/VoiceRecorder";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─── Inmate Selector ──────────────────────────────────────────────────────────

interface PrisonerOption {
  _id: string;
  fullName: string;
  prisonerId: number;
  prisonName?: string;
}

function InmateSelector({
  selected,
  onSelect,
}: {
  selected: PrisonerOption | null;
  onSelect: (p: PrisonerOption) => void;
}) {
  const [prisoners, setPrisoners] = useState<PrisonerOption[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/prisoners/list`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPrisoners(d.prisoners || []))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = prisoners.filter((p) => {
    const q = query.toLowerCase();
    return p.fullName.toLowerCase().includes(q) || String(p.prisonerId).includes(q);
  });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-2.5 border-2 rounded-xl text-sm bg-white transition focus:outline-none ${
          open ? "border-gray-900" : "border-gray-200 hover:border-gray-300"
        } ${selected ? "text-gray-900 font-medium" : "text-gray-400"}`}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-bold shrink-0">
              {selected.fullName[0]}
            </span>
            {selected.fullName}
            <span className="text-gray-400 font-normal font-mono text-xs">#{selected.prisonerId}</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4" /> Search by name or inmate ID…
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-gray-50">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type name or ID…"
              className="w-full text-sm bg-transparent focus:outline-none"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {loadingList ? (
              <li className="flex items-center justify-center py-5">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              </li>
            ) : filtered.length === 0 ? (
              <li className="px-4 py-4 text-sm text-gray-400 text-center">No inmates found.</li>
            ) : (
              filtered.map((p) => (
                <li key={p._id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(p); setQuery(""); setOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition flex items-center justify-between group ${
                      selected?._id === p._id ? "bg-gray-50" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-gray-200 text-gray-700 text-xs flex items-center justify-center font-bold shrink-0 transition">
                        {p.fullName[0]}
                      </span>
                      <span className={`font-medium ${selected?._id === p._id ? "text-gray-900" : "text-gray-700"}`}>
                        {p.fullName}
                      </span>
                      {p.prisonName && (
                        <span className="text-xs text-gray-400">{p.prisonName}</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400 font-mono ml-2">#{p.prisonerId}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Section Card Header ──────────────────────────────────────────────────────

function SectionHeader({
  icon, title, subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
      <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

const RELATION_OPTIONS = [
  "Wife", "Husband", "Father", "Mother", "Brother",
  "Sister", "Son", "Daughter", "Lawyer", "Friend", "Other",
] as const;

// Relations where only ONE contact is allowed per prisoner
const SINGLETON_RELATIONS = ["Father", "Mother", "Wife", "Husband"] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddContactPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPrisonerId = searchParams.get("prisonerId");

  const [selectedPrisoner, setSelectedPrisoner] = useState<PrisonerOption | null>(null);
  // Singleton relations already registered for the selected prisoner
  const [takenRelations, setTakenRelations] = useState<string[]>([]);
  useEffect(() => {
    if (!urlPrisonerId) return;
    fetch(`${API_URL}/api/prisoners/${urlPrisonerId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const p = d.prisoner || d;
        if (p?._id) {
          setSelectedPrisoner({
            _id: p._id,
            fullName: p.fullName,
            prisonerId: p.prisonerId,
            prisonName: p.prisonName,
          });
        }
      })
      .catch(() => {});
  }, [urlPrisonerId]);

  const effectivePrisonerId = urlPrisonerId || selectedPrisoner?._id || null;
  const prisonerLocked = Boolean(urlPrisonerId);

  // Fetch existing contacts whenever the prisoner changes to know which singletons are taken
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

  // ─── Form state ──────────────────────────────────────────────────────────
  const [contactName, setContactName] = useState("");
  const [relation, setRelation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [photo, setPhoto] = useState("");
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Derived: is the currently chosen singleton relation already taken?
  const singletonConflict =
    relation !== "" &&
    SINGLETON_RELATIONS.includes(relation as typeof SINGLETON_RELATIONS[number]) &&
    takenRelations.includes(relation);

  // ─── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!effectivePrisonerId) {
      setError("Please select an inmate first.");
      return;
    }

    // Hard-block: singleton relation already taken
    if (singletonConflict) {
      setError(`This prisoner already has a ${relation} registered. Only one ${relation} is allowed.`);
      return;
    }

    // Validate voice before making any API call
    if (!voiceFile) {
      setError("Voice enrollment is required. Please record or upload audio.");
      return;
    }

    const payload = { contactName, relation, phoneNumber, photo: photo || undefined };
    const validationError = validateField(addContactSchema, payload);
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      // 1. Create contact
      const res = await fetch(`${API_URL}/api/contacts/${effectivePrisonerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.message || "Failed to add contact."); return; }

      const contactId = data.contact?._id || data._id;
      if (!contactId) throw new Error("Server did not return a contact ID.");

      // 2. Voice enrollment
      const voiceData = new FormData();
      voiceData.append("audio", voiceFile);
      voiceData.append("contactId", contactId);

      const voiceRes = await fetch(`${API_URL}/api/voice/enroll`, {
        method: "POST",
        credentials: "include",
        body: voiceData,
      });
      const voiceJson = await voiceRes.json().catch(() => ({}));
      if (!voiceRes.ok) throw new Error(voiceJson.message || "Voice enrollment failed.");

      setSuccess(true);
      setTimeout(() => router.push(`/prisoner/${effectivePrisonerId}`), 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => router.back()}
              className="cursor-pointer flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-gray-800" />
            <h1 className="text-2xl font-bold text-gray-900">Add Authorized Contact</h1>
            {selectedPrisoner && (
              <span className="text-sm text-gray-400 font-normal mt-0.5">
                — linking to{" "}
                <span className="font-medium text-gray-700">{selectedPrisoner.fullName}</span>
                {" "}
                <span className="font-mono text-gray-400">#{selectedPrisoner.prisonerId}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status banners */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm text-center font-medium">
          Contact added &amp; voice enrolled successfully! Redirecting…
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Two-column grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Section 1: Inmate */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <SectionHeader
                icon={<Shield className="w-4 h-4" />}
                title="Select Inmate"
                subtitle={
                  prisonerLocked
                    ? "Pre-filled from inmate profile"
                    : "Choose the inmate this contact belongs to"
                }
              />
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
                        #{selectedPrisoner.prisonerId}
                        {selectedPrisoner.prisonName && ` · ${selectedPrisoner.prisonName}`}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <InmateSelector selected={selectedPrisoner} onSelect={setSelectedPrisoner} />
              )}
            </div>

            {/* Section 2: Contact Details */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5 flex-1">
              <SectionHeader
                icon={<User className="w-4 h-4" />}
                title="Contact Information"
                subtitle="Basic details of the authorized contact"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Contact Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 text-sm transition"
                  />
                </div>

                {/* Relation */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Relation <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none text-sm bg-white transition ${
                      singletonConflict
                        ? "border-red-400 focus:border-red-500"
                        : "border-gray-200 focus:border-gray-900"
                    }`}
                  >
                    <option value="">Select…</option>
                    {RELATION_OPTIONS.map((r) => {
                      const disabled =
                        SINGLETON_RELATIONS.includes(r as typeof SINGLETON_RELATIONS[number]) &&
                        takenRelations.includes(r);
                      return (
                        <option key={r} value={r} disabled={disabled}>
                          {r}{disabled ? " (already registered)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  {singletonConflict && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">
                      This prisoner already has a <strong>{relation}</strong> registered. Remove the existing one first or choose a different relation.
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91XXXXXXXXXX"
                      maxLength={15}
                      className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 text-sm transition"
                    />
                  </div>
                </div>
              </div>

              {/* Photo */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Photo{" "}
                  <span className="text-gray-400 font-normal normal-case">(optional)</span>
                </label>
                <PhotoUploader value={photo} onChange={setPhoto} label="" />
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Voice Enrollment ──────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
            <SectionHeader
              icon={<Mic className="w-4 h-4" />}
              title="Voice Enrollment"
              subtitle="Record or upload 3–10 seconds of the contact's voice for AI verification"
            />
            <VoiceRecorder onAudioReady={(file) => setVoiceFile(file)} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="submit"
            disabled={loading || !voiceFile || singletonConflict}
            className="cursor-pointer flex items-center justify-center gap-2 bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition duration-200"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Add Contact</>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="cursor-pointer px-6 py-2.5 border-2 border-gray-200 hover:border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}


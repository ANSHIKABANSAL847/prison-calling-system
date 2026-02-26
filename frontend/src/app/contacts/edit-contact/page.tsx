"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PhotoUploader from "@/components/PhotoUploader";
import {
  Loader2, Pencil, ArrowLeft, User, Phone, Shield, Mic,
} from "lucide-react";
import VoiceRecorder from "../../prisoner/components/VoiceRecorder";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

interface PrisonerInfo {
  _id: string;
  fullName: string;
  prisonerId: number;
  prisonName?: string;
}

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function EditContactInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contactId  = searchParams.get("contactId");
  const prisonerId = searchParams.get("prisonerId");

  // Prefetch state
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError]     = useState("");

  // Prisoner info
  const [prisoner, setPrisoner] = useState<PrisonerInfo | null>(null);
  // Singleton relations already taken by OTHER contacts for this prisoner
  const [takenRelations, setTakenRelations] = useState<string[]>([]);
  const [originalRelation, setOriginalRelation] = useState("");

  // Form state
  const [contactName, setContactName]   = useState("");
  const [relation, setRelation]         = useState("");
  const [phoneNumber, setPhoneNumber]   = useState("");
  const [photo, setPhoto]               = useState("");
  const [isVerified, setIsVerified]     = useState(false);

  // Voice
  const [voiceFile, setVoiceFile]       = useState<File | null>(null);

  // Submit state
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState(false);

  // ─── Fetch contact data on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!contactId || !prisonerId) {
      setFetchError("Missing contact or prisoner ID.");
      setFetchLoading(false);
      return;
    }

    async function load() {
      try {
        // Fetch all contacts for this prisoner, then find the one we need
        const [contactsRes, prisonerRes] = await Promise.all([
          fetch(`${API_URL}/api/contacts/${prisonerId}`, { credentials: "include" }),
          fetch(`${API_URL}/api/prisoners/${prisonerId}`, { credentials: "include" }),
        ]);

        if (!contactsRes.ok || !prisonerRes.ok) {
          setFetchError("Failed to load contact data.");
          return;
        }

        const contactsData = await contactsRes.json();
        const prisonerData = await prisonerRes.json();

        const contact = (contactsData.contacts as any[]).find(
          (c: any) => c._id === contactId
        );

        if (!contact) {
          setFetchError("Contact not found.");
          return;
        }

        // Pre-fill form
        setContactName(contact.contactName || "");
        setRelation(contact.relation || "");
        setOriginalRelation(contact.relation || "");
        setPhoneNumber(contact.phoneNumber || "");
        setPhoto(contact.photo || "");
        setIsVerified(contact.isVerified || false);

        // Derive singleton relations taken by OTHER contacts (exclude self)
        const taken = (contactsData.contacts as { _id: string; relation: string }[])
          .filter((c) => c._id !== contactId)
          .map((c) => c.relation)
          .filter((r) => SINGLETON_RELATIONS.includes(r as typeof SINGLETON_RELATIONS[number]));
        setTakenRelations(taken);

        // Prisoner info
        const p = prisonerData.prisoner || prisonerData;
        if (p?._id) {
          setPrisoner({
            _id: p._id,
            fullName: p.fullName,
            prisonerId: p.prisonerId,
            prisonName: p.prisonName,
          });
        }
      } catch {
        setFetchError("Network error while loading contact.");
      } finally {
        setFetchLoading(false);
      }
    }

    load();
  }, [contactId, prisonerId]);

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!contactName.trim() || !relation || !phoneNumber.trim()) {
      setError("Name, relationship and phone number are required.");
      return;
    }

    // Hard-block: singleton conflict with another contact (changing to an already-taken singleton)
    if (
      relation !== originalRelation &&
      SINGLETON_RELATIONS.includes(relation as typeof SINGLETON_RELATIONS[number]) &&
      takenRelations.includes(relation)
    ) {
      setError(`This prisoner already has a ${relation} registered. Only one ${relation} is allowed.`);
      return;
    }

    setLoading(true);
    try {
      // 1. Update contact fields
      const res = await fetch(`${API_URL}/api/contacts/${contactId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName, relation, phoneNumber, photo: photo || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to update contact.");
        return;
      }

      // 2. Re-enroll voice only if a new file was provided
      if (voiceFile) {
        const voiceData = new FormData();
        voiceData.append("audio", voiceFile);
        voiceData.append("contactId", contactId!);

        const voiceRes = await fetch(`${API_URL}/api/voice/enroll`, {
          method: "POST",
          credentials: "include",
          body: voiceData,
        });
        const voiceJson = await voiceRes.json().catch(() => ({}));
        if (!voiceRes.ok) throw new Error(voiceJson.message || "Voice enrollment failed.");
      }

      setSuccess(true);
      setTimeout(() => router.push("/contacts"), 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Loading / error states ───────────────────────────────────────────────
  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-500">
        <p className="text-red-600 text-sm mb-3">{fetchError}</p>
        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
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
            <Pencil className="w-5 h-5 text-gray-800" />
            <h1 className="text-2xl font-bold text-gray-900">Edit Authorized Contact</h1>
            {prisoner && (
              <span className="text-sm text-gray-400 font-normal mt-0.5">
                — linked to{" "}
                <span className="font-medium text-gray-700">{prisoner.fullName}</span>
                {" "}
                <span className="font-mono text-gray-400">#{prisoner.prisonerId}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status banners */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm text-center font-medium">
          Contact updated successfully! Redirecting…
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
            {/* Section 1: Linked Inmate (always locked on edit) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <SectionHeader
                icon={<Shield className="w-4 h-4" />}
                title="Linked Inmate"
                subtitle="The inmate this contact is associated with"
              />
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-gray-900 text-white text-sm flex items-center justify-center font-bold shrink-0">
                  {prisoner?.fullName?.[0] ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {prisoner?.fullName ?? "Unknown"}
                  </p>
                  {prisoner && (
                    <p className="text-xs text-gray-400 font-mono">
                      #{prisoner.prisonerId}
                      {prisoner.prisonName && ` · ${prisoner.prisonName}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Contact Details */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5 flex-1">
              <SectionHeader
                icon={<User className="w-4 h-4" />}
                title="Contact Information"
                subtitle="Update the details of this authorized contact"
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
                  {(() => {
                    const conflict =
                      relation !== originalRelation &&
                      SINGLETON_RELATIONS.includes(relation as typeof SINGLETON_RELATIONS[number]) &&
                      takenRelations.includes(relation);
                    return (
                      <>
                        <select
                          value={relation}
                          onChange={(e) => setRelation(e.target.value)}
                          className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none text-sm bg-white transition ${
                            conflict
                              ? "border-red-400 focus:border-red-500"
                              : "border-gray-200 focus:border-gray-900"
                          }`}
                        >
                          <option value="">Select…</option>
                          {RELATION_OPTIONS.map((r) => {
                            const disabled =
                              r !== originalRelation &&
                              SINGLETON_RELATIONS.includes(r as typeof SINGLETON_RELATIONS[number]) &&
                              takenRelations.includes(r);
                            return (
                              <option key={r} value={r} disabled={disabled}>
                                {r}{disabled ? " (already registered)" : ""}
                              </option>
                            );
                          })}
                        </select>
                        {conflict && (
                          <p className="mt-1.5 text-xs text-red-600 font-medium">
                            This prisoner already has a <strong>{relation}</strong> registered. Remove the existing one first or choose a different relation.
                          </p>
                        )}
                      </>
                    );
                  })()}
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

          {/* ── RIGHT COLUMN: Voice Re-enrollment ──────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
            <SectionHeader
              icon={<Mic className="w-4 h-4" />}
              title="Voice Enrollment"
              subtitle={
                isVerified
                  ? "Already enrolled — record or upload a new sample to update"
                  : "Record or upload 3–10 seconds of the contact's voice for AI verification"
              }
            />
            {isVerified && !voiceFile && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                Voice already enrolled — leave empty to keep existing voice sample
              </div>
            )}
            <VoiceRecorder onAudioReady={(file) => setVoiceFile(file)} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer flex items-center justify-center gap-2 bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition duration-200"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><Pencil className="w-4 h-4" /> Save Changes</>
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

// ─── Page (Suspense wrapper required for useSearchParams) ─────────────────────

export default function EditContactPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    }>
      <EditContactInner />
    </Suspense>
  );
}

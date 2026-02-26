"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PhotoUploader from "@/components/PhotoUploader";
import { Loader2, UserPlus } from "lucide-react";
import { addContactSchema, validateField } from "@/lib/validators";
import VoiceRecorder from "../../prisoner/components/VoiceRecorder";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const RELATION_OPTIONS = [
  "Wife",
  "Husband",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Son",
  "Daughter",
  "Lawyer",
  "Friend",
  "Other",
] as const;

export default function AddContactPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prisonerId = searchParams.get("prisonerId");

  const [contactName, setContactName] = useState("");
  const [relation, setRelation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [photo, setPhoto] = useState("");
  const [voiceFile, setVoiceFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!prisonerId) {
      setError("Missing prisoner id in URL.");
      return;
    }

    const payload = {
      contactName,
      relation,
      phoneNumber,
      photo: photo || undefined,
    };

    const validationError = validateField(addContactSchema, payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Create contact
      const res = await fetch(`${API_URL}/api/contacts/${prisonerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to add contact");
        return;
      }

      const contactId = data.contact?._id || data._id;

      // 2️⃣ If voice recorded, upload it
      if (!voiceFile) {
  setError("Voice enrollment is required. Please record or upload audio.");
  setLoading(false);
  return;
}

// Upload voice
const voiceData = new FormData();
voiceData.append("audio", voiceFile);
voiceData.append("contactId", contactId);

const voiceRes = await fetch(`${API_URL}/api/voice/enroll`, {
  method: "POST",
  credentials: "include",
  body: voiceData,
});

let voiceJson: any = {};
try {
  voiceJson = await voiceRes.json();
} catch {}

if (!voiceRes.ok) {
  throw new Error(voiceJson.message || "Voice enrollment failed");
}

      setSuccess(true);

      setTimeout(() => {
        router.push(`/prisoner/${prisonerId}`);
      }, 800);
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="w-6 h-6 text-gray-800" />
        <h1 className="text-xl font-semibold">Add Authorized Contact</h1>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm text-center font-medium">
          Contact added successfully!
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Contact Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Full name of the contact"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Relation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Relation <span className="text-red-500">*</span>
          </label>
          <select
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          >
            <option value="">Select Relation</option>
            {RELATION_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+91XXXXXXXXXX"
            maxLength={15}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Photo */}
        <div>
          <PhotoUploader
            value={photo}
            onChange={setPhoto}
            label="Photo (optional)"
          />
        </div>

        {/* Voice Recorder */}
        <VoiceRecorder onAudioReady={(file) => setVoiceFile(file)} />

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
 <button
  type="submit"
  disabled={loading || !voiceFile}
  className="bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white py-2.5 px-6 rounded-lg font-medium transition duration-200 flex items-center justify-center gap-2"
>
  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
  Add Contact
</button>

          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border rounded-lg text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
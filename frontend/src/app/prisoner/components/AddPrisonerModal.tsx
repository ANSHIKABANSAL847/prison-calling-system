"use client";

import { useState, useEffect, FormEvent } from "react";
import PhotoUploader from "@/components/PhotoUploader";
import { useRouter } from "next/navigation";
import { X, Loader2, UserPlus, CheckCircle, Users } from "lucide-react";
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

interface AddPrisonerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddPrisonerModal({
  isOpen,
  onClose,
  onSuccess,
}: AddPrisonerModalProps) {
  const router = useRouter();
  const [prisonerId, setPrisonerId] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [photo, setPhoto] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [prisonName, setPrisonName] = useState("");
  const [sentenceYears, setSentenceYears] = useState("");
  const [riskTags, setRiskTags] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdPrisonerId, setCreatedPrisonerId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function resetState() {
    setPrisonerId("");
    setFullName("");
    setDateOfBirth("");
    setGender("");
    setPhoto("");
    setAadhaarNumber("");
    setCaseNumber("");
    setPrisonName("");
    setSentenceYears("");
    setRiskTags([]);
    setError("");
    setCreatedPrisonerId(null);
    setLoading(false);
  }

  function handleClose() {
    resetState();
    onClose();
    onSuccess?.();
  }

  function toggleRiskTag(tag: string) {
    setRiskTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

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
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/prisoners/add-prisoner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to add prisoner");
        return;
      }

      setCreatedPrisonerId(data.prisoner._id);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in max-h-[90vh] flex flex-col">
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Add Prisoner</h2>
          </div>
          <button
            onClick={handleClose}
            className="cursor-pointer text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1">
          {/* Success Screen */}
          {createdPrisonerId ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Prisoner Added Successfully!
              </h3>
              <p className="text-sm text-gray-500 max-w-xs">
                The prisoner has been registered. You can now configure their
                authorized contacts or close this dialog.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => {
                    const pid = createdPrisonerId;
                    handleClose();
                    router.push(`/prisoner/${pid}`);
                  }}
                  className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                >
                  <Users className="w-4 h-4" />
                  Configure Contacts
                </button>
                <button
                  onClick={handleClose}
                  className="cursor-pointer px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center">
                  {error}
                </div>
              )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prisoner ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={prisonerId}
                  onChange={(e) => setPrisonerId(e.target.value)}
                  placeholder="e.g. 12345"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">Select Gender</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <PhotoUploader
                  value={photo}
                  onChange={setPhoto}
                  label="Photo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aadhaar Number
                </label>
                <input
                  type="text"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  placeholder="12-digit Aadhaar (optional)"
                  maxLength={12}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="e.g. ALC12345"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prison Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={prisonName}
                  onChange={(e) => setPrisonName(e.target.value)}
                  placeholder="e.g. Tihar Jail"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="w-1/2 pr-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sentence (Years) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={sentenceYears}
                onChange={(e) => setSentenceYears(e.target.value)}
                placeholder="e.g. 12"
                min={0}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risk Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {RISK_TAG_OPTIONS.map((tag) => {
                  const selected = riskTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleRiskTag(tag)}
                      className={`px-3 py-1.5 text-xs rounded-full border font-medium transition ${
                        selected
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white py-2.5 rounded-lg font-medium transition duration-200 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Prisoner
            </button>
          </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

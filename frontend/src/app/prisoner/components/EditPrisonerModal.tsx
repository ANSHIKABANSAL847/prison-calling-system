"use client";

import { useState, useEffect, FormEvent } from "react";
import PhotoUploader from "@/components/PhotoUploader";
import { X, Loader2, Pencil } from "lucide-react";
import { updatePrisonerSchema, validateField } from "@/lib/validators";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const RISK_TAG_OPTIONS = [
  "High Risk",
  "Escape Risk",
  "Violent Offender",
  "Gang Affiliated",
  "Good Conduct",
] as const;

const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;

interface PrisonerForEdit {
  _id: string;
  prisonerId: number;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  photo: string;
  aadhaarNumber?: string;
  caseNumber: string;
  prisonName: string;
  sentenceYears: number;
  riskTags: string[];
  isActive?: boolean;
}

interface EditPrisonerModalProps {
  isOpen: boolean;
  prisoner: PrisonerForEdit | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditPrisonerModal({
  isOpen,
  prisoner,
  onClose,
  onSuccess,
}: EditPrisonerModalProps) {
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [photo, setPhoto] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [prisonName, setPrisonName] = useState("");
  const [sentenceYears, setSentenceYears] = useState("");
  const [riskTags, setRiskTags] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Populate fields when the modal opens with a prisoner
  useEffect(() => {
    if (prisoner && isOpen) {
      setFullName(prisoner.fullName);
      setDateOfBirth(
        prisoner.dateOfBirth
          ? new Date(prisoner.dateOfBirth).toISOString().split("T")[0]
          : ""
      );
      setGender(prisoner.gender);
      setPhoto(prisoner.photo);
      setAadhaarNumber(prisoner.aadhaarNumber || "");
      setCaseNumber(prisoner.caseNumber);
      setPrisonName(prisoner.prisonName);
      setSentenceYears(String(prisoner.sentenceYears));
      setRiskTags(prisoner.riskTags || []);
      setIsActive(prisoner.isActive !== false);
      setError("");
      setSuccess(false);
    }
  }, [prisoner, isOpen]);

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

  function handleClose() {
    setError("");
    setSuccess(false);
    setLoading(false);
    onClose();
  }

  function toggleRiskTag(tag: string) {
    setRiskTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prisoner) return;
    setError("");

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

    // Remove undefined values
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });

    const validationError = validateField(updatePrisonerSchema, payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/prisoners/${prisoner._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to update prisoner");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 800);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !prisoner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Pencil className="w-5 h-5" />
            <h2 className="text-lg font-semibold">
              Edit Prisoner — #{prisoner.prisonerId}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="cursor-pointer text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm text-center font-medium">
              Prisoner updated successfully!
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name + Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DOB + Photo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <PhotoUploader
                  value={photo}
                  onChange={setPhoto}
                  label="Photo"
                />
              </div>
            </div>

            {/* Aadhaar + Case Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aadhaar Number
                </label>
                <input
                  type="text"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  maxLength={12}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case Number
                </label>
                <input
                  type="text"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Prison Name + Sentence */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prison Name
                </label>
                <input
                  type="text"
                  value={prisonName}
                  onChange={(e) => setPrisonName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sentence (Years)
                </label>
                <input
                  type="number"
                  value={sentenceYears}
                  onChange={(e) => setSentenceYears(e.target.value)}
                  min={0}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                Status:
              </label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`cursor-pointer px-3 py-1.5 text-xs rounded-full border font-medium transition ${
                  isActive
                    ? "bg-green-100 text-green-700 border-green-300"
                    : "bg-red-100 text-red-700 border-red-300"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </button>
            </div>

            {/* Risk Tags */}
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
                      className={`cursor-pointer px-3 py-1.5 text-xs rounded-full border font-medium transition ${
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
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

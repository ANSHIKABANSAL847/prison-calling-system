"use client";

import { useState, useEffect, FormEvent } from "react";
import PhotoUploader from "@/components/PhotoUploader";
import { X, Loader2, UserPlus } from "lucide-react";
import { addContactSchema, validateField } from "@/lib/validators";

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

interface AddContactModalProps {
  isOpen: boolean;
  prisonerId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddContactModal({
  isOpen,
  prisonerId,
  onClose,
  onSuccess,
}: AddContactModalProps) {
  const [contactName, setContactName] = useState("");
  const [relation, setRelation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [photo, setPhoto] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
    setContactName("");
    setRelation("");
    setPhoneNumber("");
    setPhoto("");
    setError("");
    setSuccess(false);
    setLoading(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Add Authorized Contact</h2>
          </div>
          <button
            onClick={handleClose}
            className="cursor-pointer text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white py-2.5 rounded-lg font-medium transition duration-200 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Contact
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

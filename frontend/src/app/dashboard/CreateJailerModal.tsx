"use client";

import { useState, useEffect, FormEvent } from "react";
import { X, Loader2, UserPlus, Mail, User, KeyRound } from "lucide-react";
import { createJailerSchema, otpSchema, validateField } from "@/lib/validators";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Jailer {
  name: string;
  email: string;
  role: string;
}

interface CreateJailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (jailer: Jailer) => void;
}

export default function CreateJailerModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateJailerModalProps) {
  const [step, setStep] = useState(1); // 1 = form, 2 = otp
  const [jailerName, setJailerName] = useState("");
  const [jailerEmail, setJailerEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Lock body scroll when modal is open
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
    setStep(1);
    setJailerName("");
    setJailerEmail("");
    setOtp("");
    setError("");
    setSuccessMsg("");
    setLoading(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleSendOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const validationError = validateField(createJailerSchema, {
      jailerName,
      jailerEmail,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/create-jailer/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jailerName, jailerEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to send OTP");
        return;
      }

      setStep(2);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const validationError = validateField(otpSchema, { otp });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/api/auth/create-jailer/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ otp }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Verification failed");
        return;
      }

      setSuccessMsg(
        `Jailer "${data.jailer.name}" created! Credentials sent to their email.`
      );
      setTimeout(() => {
        handleClose();
        onSuccess?.(data.jailer);
      }, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Create Jailer</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Success message */}
          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm text-center font-medium">
              {successMsg}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              1
            </div>
            <div
              className={`w-12 h-0.5 ${
                step >= 2 ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= 2
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              2
            </div>
          </div>

          {/* Step 1: Name & Email form */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jailer Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={jailerName}
                    onChange={(e) => setJailerName(e.target.value)}
                    placeholder="Enter full name"
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jailer Gmail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={jailerEmail}
                    onChange={(e) => setJailerEmail(e.target.value)}
                    placeholder="jailer@gmail.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-800"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                An OTP will be sent to your admin email for verification.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          )}

          {/* Step 2: OTP verification */}
          {step === 2 && !successMsg && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-sm text-gray-600">
                  Enter the 6-digit OTP sent to your admin email
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OTP Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="Enter 6-digit OTP"
                    required
                    maxLength={6}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-center tracking-[0.3em] font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-800"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                <p>
                  <span className="font-medium text-gray-700">Name:</span>{" "}
                  {jailerName}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Email:</span>{" "}
                  {jailerEmail}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Create Jailer"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                  setError("");
                }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                ← Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

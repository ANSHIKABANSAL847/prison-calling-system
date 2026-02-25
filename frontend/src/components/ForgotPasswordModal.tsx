"use client";

import { useState, FormEvent } from "react";
import {
  X,
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** When provided the email field is pre-filled (the user still clicks Send OTP) */
  prefillEmail?: string;
}

export default function ForgotPasswordModal({ isOpen, onClose, prefillEmail }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=email, 2=OTP, 3=new password
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function reset() {
    setStep(1);
    setEmail(prefillEmail ?? "");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setShowNew(false);
    setShowConfirm(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // Step 1: Send OTP
  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to send OTP.");
        return;
      }

      setSuccess("OTP sent! Check your inbox.");
      setStep(2);
    } catch {
      setError("Server unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2 → Step 3: Validate OTP locally then proceed to password entry
  function handleOtpNext(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(otp)) {
      setError("OTP must be exactly 6 digits.");
      return;
    }
    setSuccess("");
    setStep(3);
  }

  // Step 3: Reset password
  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If OTP was wrong/expired, go back to OTP step
        if (res.status === 401 || res.status === 400) {
          setOtp("");
          setStep(2);
        }
        setError(data.message || "Failed to reset password.");
        return;
      }

      setSuccess("Password reset successfully! You can now log in.");
      setTimeout(() => handleClose(), 2500);
    } catch {
      setError("Server unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const stepLabels = ["Email", "Verify OTP", "New Password"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-800 text-base">
              Reset Password
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-0 px-6 pt-5 pb-3">
          {stepLabels.map((label, index) => {
            const stepNum = (index + 1) as 1 | 2 | 3;
            const isCompleted = step > stepNum;
            const isActive = step === stepNum;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                        ? "bg-blue-600 text-white ring-2 ring-blue-200"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isCompleted ? "✓" : stepNum}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {index < stepLabels.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${
                      isCompleted ? "bg-green-400" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-2">
          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg text-center">
              {success}
            </div>
          )}

          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <p className="text-sm text-gray-500 text-center">
                Enter your registered email address. We&apos;ll send a 6-digit
                OTP to verify your identity.
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="Registered email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Send OTP
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <form onSubmit={handleOtpNext} className="space-y-4">
              <p className="text-sm text-gray-500 text-center">
                Enter the 6-digit OTP sent to{" "}
                <span className="font-semibold text-gray-700">{email}</span>
              </p>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm tracking-widest text-center"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition text-sm cursor-pointer"
              >
                Verify OTP
              </button>
              <button
                type="button"
                onClick={async () => {
                  setError("");
                  setSuccess("");
                  setLoading(true);
                  try {
                    await fetch(`${API_URL}/api/auth/forgot-password/send-otp`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email }),
                    });
                    setSuccess("OTP resent!");
                  } catch {
                    setError("Failed to resend. Try again.");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full text-sm text-gray-500 hover:text-blue-600 transition disabled:opacity-50 cursor-pointer"
              >
                Resend OTP
              </button>
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(""); setError(""); setSuccess(""); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
                ← Change email
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-sm text-gray-500 text-center">
                Choose a strong new password (min. 8 characters).
              </p>

              {/* New Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-3 text-gray-400 cursor-pointer"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3 text-gray-400 cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength hint */}
              {newPassword && (
                <ul className="text-xs text-gray-500 space-y-0.5 pl-1">
                  <li className={newPassword.length >= 8 ? "text-green-600" : "text-red-400"}>
                    {newPassword.length >= 8 ? "✓" : "✗"} At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? "text-green-600" : "text-gray-400"}>
                    {/[A-Z]/.test(newPassword) ? "✓" : "·"} Uppercase letter
                  </li>
                  <li className={/\d/.test(newPassword) ? "text-green-600" : "text-gray-400"}>
                    {/\d/.test(newPassword) ? "✓" : "·"} Number
                  </li>
                </ul>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Reset Password
              </button>
              <button
                type="button"
                onClick={() => { setStep(2); setError(""); setSuccess(""); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
                ← Back to OTP
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, FormEvent, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  KeyRound,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { loginSchema, otpSchema, validateField } from "@/lib/validators";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  // UI state
  const [step, setStep] = useState(1); // 1 = credentials, 2 = OTP verify
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const roles = ["Admin", "Jailer"];
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: globalThis.MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setRoleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // STEP 1: Submit credentials → backend sends OTP email
  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateField(loginSchema, {
      email,
      password,
      role: selectedRole,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, role: selectedRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      setSuccess("OTP sent to your email!");
      setStep(2);
    } catch {
      setError("Server unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // STEP 2: Verify OTP → backend sets HTTP-only JWT cookies → redirect
  async function handleVerifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateField(otpSchema, { otp });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "OTP verification failed");
        return;
      }

      setSuccess("Login successful! Redirecting...");
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch {
      setError("Server unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo Section - Outside the card */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-3 rounded-lg">
            <Lock className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-blue-700 tracking-wide">
              CYBERSEC
            </h1>
            <div className="flex items-center justify-center gap-2 -mt-1">
              <div className="h-px w-6 bg-gray-400"></div>
              <p className="text-gray-500 text-sm tracking-widest">SYSTEMS</p>
              <div className="h-px w-6 bg-gray-400"></div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-white rounded-xl shadow-lg p-8">
          {/* Title */}
          <h2 className="text-center text-lg font-semibold text-gray-700 mb-6">
            Secure Authentication
          </h2>

          {/* Error / Success Messages */}
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

          {/* Form */}
          <form
            className="space-y-4"
            onSubmit={step === 1 ? handleLogin : handleVerifyOtp}
          >
            {step === 1 && (
              <>
                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Email or Username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Select Role - Custom Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setRoleOpen(!roleOpen)}
                    className={`w-full pl-4 pr-12 py-3 text-sm font-medium text-left bg-gray-50 border rounded-lg shadow-sm transition-all duration-200 appearance-none cursor-pointer hover:border-blue-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                      selectedRole ? "text-gray-700" : "text-gray-400"
                    } ${
                      roleOpen
                        ? "border-blue-500 ring-2 ring-blue-500/20 bg-white"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedRole || "Select Role"}
                  </button>

                  {/* Custom Arrow */}
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        roleOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {/* Dropdown Options */}
                  {roleOpen && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {roles.map((role) => (
                        <li key={role}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRole(role);
                              setRoleOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 ${
                              selectedRole === role
                                ? "bg-blue-50 text-blue-700 font-semibold"
                                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            }`}
                          >
                            {role}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                {/* OTP */}
                <p className="text-sm text-gray-500 text-center">
                  Enter the OTP sent to{" "}
                  <span className="font-semibold text-gray-700">{email}</span>
                </p>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm tracking-widest text-center"
                    autoFocus
                  />
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 rounded-lg font-medium transition duration-200 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === 1 ? "Send OTP" : "Verify & Login"}
            </button>

            {step === 2 && (
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                  setError("");
                  setSuccess("");
                }}
                className="w-full text-sm text-gray-500 hover:text-blue-600 transition"
              >
                ← Back to credentials
              </button>
            )}
          </form>

          {/* Forgot Password */}
          <div className="text-center mt-4">
            <a href="#" className="text-blue-600 text-sm hover:underline">
              Forgot Password?
            </a>
          </div>

          {/* Divider */}
          <div className="border-t my-6"></div>

          {/* Security Notice */}
          <div className="text-xs text-gray-500 text-center leading-relaxed italic">
            <p>Security Notice: Multi-factor authentication is required.</p>
            <p>Unauthorized access is strictly prohibited.</p>
            <p>Your account activity is monitored.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

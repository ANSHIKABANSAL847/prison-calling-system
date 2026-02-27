"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { loginSchema, otpSchema, validateField } from "@/lib/validators";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import GovernmentBanner from "./components/GovernmentBanner";
import LoginCardHeader from "./components/LoginCardHeader";
import AlertMessage from "./components/AlertMessage";
import CredentialsForm from "./components/CredentialsForm";
import OtpForm from "./components/OtpForm";
import LoginCardFooter from "./components/LoginCardFooter";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setSuccess("");
    const validationError = validateField(loginSchema, { email, password, role: selectedRole });
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, role: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Login failed"); return; }
      setSuccess("OTP sent to your email!");
      setStep(2);
    } catch {
      setError("Server unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setSuccess("");
    const validationError = validateField(otpSchema, { otp });
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "OTP verification failed"); return; }
      setSuccess("Login successful! Redirecting...");
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch {
      setError("Server unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0B1F4B" }}>
      <GovernmentBanner />

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div
            className="w-full"
            style={{
              background: "#fff",
              border: "1px solid #CBD0D8",
              borderTop: "4px solid #C9A227",
              borderRadius: 4,
              boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
            }}
          >
            <LoginCardHeader />

            <div className="px-8 py-7">
              <AlertMessage error={error} success={success} />

              <form className="space-y-4" onSubmit={step === 1 ? handleLogin : handleVerifyOtp}>
                {step === 1 && (
                  <CredentialsForm
                    email={email}
                    password={password}
                    selectedRole={selectedRole}
                    showPassword={showPassword}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                    onRoleChange={setSelectedRole}
                    onTogglePassword={() => setShowPassword((p) => !p)}
                  />
                )}

                {step === 2 && (
                  <OtpForm
                    otp={otp}
                    email={email}
                    onOtpChange={setOtp}
                    onBack={() => { setStep(1); setOtp(""); setError(""); setSuccess(""); }}
                  />
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: loading ? "#5A6073" : "#0B1F4B",
                    color: "#C9A227",
                    borderRadius: 3,
                    border: "1px solid #C9A227",
                  }}
                  onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#162d6b"; }}
                  onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#0B1F4B"; }}
                  suppressHydrationWarning
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {step === 1 ? "Send One-Time Password" : "Verify & Proceed"}
                </button>
              </form>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs transition"
                  style={{ color: "#0B1F4B" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#C9A227")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#0B1F4B")}
                  suppressHydrationWarning
                >
                  Forgot Password / Reset Access
                </button>
              </div>
            </div>

            <LoginCardFooter />
          </div>

          <p className="text-center mt-4 text-[10px] uppercase tracking-widest" style={{ color: "rgba(201,162,39,0.5)" }}>
            © Haryana Prison Authority · PCMS v2.0
          </p>
        </div>
      </div>

      <ForgotPasswordModal isOpen={showForgotPassword} onClose={() => setShowForgotPassword(false)} />
    </div>
  );
}

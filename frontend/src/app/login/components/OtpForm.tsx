"use client";

import { KeyRound } from "lucide-react";

interface OtpFormProps {
  otp: string;
  email: string;
  onOtpChange: (v: string) => void;
  onBack: () => void;
}

export default function OtpForm({ otp, email, onOtpChange, onBack }: OtpFormProps) {
  return (
    <>
      <div className="text-center py-2">
        <p className="text-sm text-gray-600">
          One-Time Password sent to{" "}
          <span className="font-bold text-gray-900">{email}</span>
        </p>
      </div>

      <div>
        <label
          className="block text-[11px] font-bold uppercase tracking-widest mb-1"
          style={{ color: "#0B1F4B" }}
        >
          Enter OTP
        </label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-3 w-4 h-4" style={{ color: "#5A6073" }} />
          <input
            type="text"
            placeholder="6-digit OTP"
            value={otp}
            onChange={(e) => onOtpChange(e.target.value)}
            maxLength={6}
            className="w-full pl-10 pr-4 py-2.5 text-sm tracking-[0.4em] text-center focus:outline-none"
            style={{ border: "1px solid #CBD0D8", borderRadius: 3, background: "#F9FAFB" }}
            autoFocus
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-center transition"
        style={{ color: "#5A6073" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#0B1F4B")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#5A6073")}
      >
        ← Back to credentials
      </button>
    </>
  );
}

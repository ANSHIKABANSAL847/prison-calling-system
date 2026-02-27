"use client";

import { Lock } from "lucide-react";

export default function LoginCardHeader() {
  return (
    <div
      className="px-8 py-5 text-center"
      style={{
        background: "linear-gradient(135deg, #0B1F4B 0%, #12306B 100%)",
        borderBottom: "1px solid #C9A227",
      }}
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-yellow-400" />
        <h2 className="text-white text-sm font-bold uppercase tracking-widest">
          Secure Official Login
        </h2>
      </div>
      <p className="text-white/50 text-[10px] uppercase tracking-widest">
        Authorised Personnel Only
      </p>
    </div>
  );
}

"use client";

import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import RoleDropdown from "./RoleDropdown";

interface CredentialsFormProps {
  email: string;
  password: string;
  selectedRole: string;
  showPassword: boolean;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onRoleChange: (v: string) => void;
  onTogglePassword: () => void;
}

export default function CredentialsForm({
  email, password, selectedRole, showPassword,
  onEmailChange, onPasswordChange, onRoleChange, onTogglePassword,
}: CredentialsFormProps) {
  return (
    <>
      {/* Email */}
      <div>
        <label
          className="block text-[11px] font-bold uppercase tracking-widest mb-1"
          style={{ color: "#0B1F4B" }}
        >
          Official Email / Username
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 w-4 h-4" style={{ color: "#5A6073" }} />
          <input
            type="text"
            placeholder="email@haryana.gov.in"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm focus:outline-none"
            style={{ border: "1px solid #CBD0D8", borderRadius: 3, background: "#F9FAFB" }}
            suppressHydrationWarning
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label
          className="block text-[11px] font-bold uppercase tracking-widest mb-1"
          style={{ color: "#0B1F4B" }}
        >
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 w-4 h-4" style={{ color: "#5A6073" }} />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-sm focus:outline-none"
            style={{ border: "1px solid #CBD0D8", borderRadius: 3, background: "#F9FAFB" }}
            suppressHydrationWarning
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-3"
            style={{ color: "#5A6073" }}
            suppressHydrationWarning
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Role */}
      <div>
        <label
          className="block text-[11px] font-bold uppercase tracking-widest mb-1"
          style={{ color: "#0B1F4B" }}
        >
          Official Role
        </label>
        <RoleDropdown value={selectedRole} onChange={onRoleChange} />
      </div>
    </>
  );
}

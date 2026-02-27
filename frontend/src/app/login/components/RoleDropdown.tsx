"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const ROLES = ["Admin", "Jailer"];

interface RoleDropdownProps {
  value: string;
  onChange: (role: string) => void;
}

export default function RoleDropdown({ value, onChange }: RoleDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full pl-4 pr-10 py-2.5 text-sm text-left focus:outline-none"
        style={{
          border: "1px solid #CBD0D8",
          borderRadius: 3,
          background: "#F9FAFB",
          color: value ? "#1A1A1A" : "#9CA3AF",
        }}
        suppressHydrationWarning
      >
        {value || "Select Role"}
      </button>
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "#5A6073" }}
        />
      </div>

      {open && (
        <ul
          className="absolute z-10 mt-1 w-full overflow-hidden"
          style={{
            background: "#fff",
            border: "1px solid #CBD0D8",
            borderRadius: 3,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}
        >
          {ROLES.map((role) => (
            <li key={role}>
              <button
                type="button"
                onClick={() => { onChange(role); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                style={
                  value === role
                    ? { background: "#0B1F4B", color: "#C9A227", fontWeight: 700 }
                    : { color: "#1A1A1A" }
                }
                onMouseEnter={(e) => {
                  if (value !== role)
                    (e.currentTarget as HTMLButtonElement).style.background = "#F2F4F7";
                }}
                onMouseLeave={(e) => {
                  if (value !== role)
                    (e.currentTarget as HTMLButtonElement).style.background = "";
                }}
              >
                {role}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


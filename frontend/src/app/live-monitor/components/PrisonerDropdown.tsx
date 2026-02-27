"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface PrisonerOption {
  _id: string;
  fullName: string;
  prisonerId: number;
  gender?: string;
  prisonName?: string;
  photo?: string;
  riskTags?: string[];
}

interface PrisonerDropdownProps {
  prisoners: PrisonerOption[];
  selected: PrisonerOption | null;
  onSelect: (p: PrisonerOption) => void;
}

export default function PrisonerDropdown({ prisoners, selected, onSelect }: PrisonerDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 px-3 py-1.5 rounded-lg text-sm transition"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
              {selected.fullName[0]}
            </span>
            {selected.fullName}
            <span className="text-gray-400 font-mono text-xs">#{selected.prisonerId}</span>
          </span>
        ) : (
          <span className="text-gray-400">Select User Profile</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-64 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden z-50">
          <ul className="max-h-56 overflow-y-auto">
            {prisoners.length === 0 ? (
              <li className="px-4 py-3 text-xs text-gray-400 text-center">No prisoners found</li>
            ) : (
              prisoners.map((p) => (
                <li key={p._id}>
                  <button
                    onClick={() => { onSelect(p); setOpen(false); }}
                    className="cursor-pointer w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700 flex items-center justify-between transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-gray-600 text-xs flex items-center justify-center font-bold shrink-0">
                        {p.fullName[0]}
                      </span>
                      <span className="text-white font-medium">{p.fullName}</span>
                    </span>
                    <span className="text-gray-400 font-mono text-xs">#{p.prisonerId}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

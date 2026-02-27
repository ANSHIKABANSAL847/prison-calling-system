"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, ChevronDown } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface PrisonerOption {
  _id: string;
  fullName: string;
  prisonerId: number;
  prisonName?: string;
}

interface InmateSelectorProps {
  selected: PrisonerOption | null;
  onSelect: (p: PrisonerOption) => void;
}

export default function InmateSelector({ selected, onSelect }: InmateSelectorProps) {
  const [prisoners, setPrisoners] = useState<PrisonerOption[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/prisoners/list`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPrisoners(d.prisoners || []))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = prisoners.filter((p) => {
    const q = query.toLowerCase();
    return p.fullName.toLowerCase().includes(q) || String(p.prisonerId).includes(q);
  });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-2.5 border-2 rounded-xl text-sm bg-white transition focus:outline-none ${
          open ? "border-gray-900" : "border-gray-200 hover:border-gray-300"
        } ${selected ? "text-gray-900 font-medium" : "text-gray-400"}`}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-bold shrink-0">
              {selected.fullName[0]}
            </span>
            {selected.fullName}
            <span className="text-gray-400 font-normal font-mono text-xs">#{selected.prisonerId}</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4" /> Search by name or inmate ID…
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-gray-50">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type name or ID…"
              className="w-full text-sm bg-transparent focus:outline-none"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {loadingList ? (
              <li className="flex items-center justify-center py-5">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              </li>
            ) : filtered.length === 0 ? (
              <li className="px-4 py-4 text-sm text-gray-400 text-center">No inmates found.</li>
            ) : (
              filtered.map((p) => (
                <li key={p._id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(p); setQuery(""); setOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition flex items-center justify-between group ${
                      selected?._id === p._id ? "bg-gray-50" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-gray-200 text-gray-700 text-xs flex items-center justify-center font-bold shrink-0 transition">
                        {p.fullName[0]}
                      </span>
                      <span className={`font-medium ${selected?._id === p._id ? "text-gray-900" : "text-gray-700"}`}>
                        {p.fullName}
                      </span>
                      {p.prisonName && (
                        <span className="text-xs text-gray-400">{p.prisonName}</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400 font-mono ml-2">#{p.prisonerId}</span>
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

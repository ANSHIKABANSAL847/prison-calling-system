"use client";

import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

export interface Prisoner {
  _id: string;
  prisonerId: number;
  fullName: string;
  gender: string;
  prisonName: string;
  riskTags: string[];
  photo: string;
  dateOfBirth: string;
  aadhaarNumber?: string;
  caseNumber: string;
  sentenceYears: number;
  isActive?: boolean;
  contactCount?: number;
}

export function getRiskLevel(tags: string[]): { label: string; className: string } {
  if (tags.includes("High Risk") || tags.includes("Violent Offender") || tags.includes("Escape Risk"))
    return { label: "High", className: "text-red-600 font-semibold" };
  if (tags.includes("Gang Affiliated"))
    return { label: "Medium", className: "text-orange-500 font-semibold" };
  if (tags.includes("Good Conduct"))
    return { label: "Low", className: "text-green-600 font-semibold" };
  return { label: "Medium", className: "text-orange-500 font-semibold" };
}

interface PrisonerTableRowProps {
  prisoner: Prisoner;
  openMoreId: string | null;
  deactivatingId: string | null;
  onOpenMore: (id: string | null) => void;
  onEdit: (p: Prisoner) => void;
  onDeactivateRequest: (id: string) => void;
  onDeactivateConfirm: (id: string) => void;
  onDeactivateCancel: () => void;
  onDelete: (id: string) => void;
}

export default function PrisonerTableRow({
  prisoner: p,
  openMoreId,
  deactivatingId,
  onOpenMore,
  onEdit,
  onDeactivateRequest,
  onDeactivateConfirm,
  onDeactivateCancel,
  onDelete,
}: PrisonerTableRowProps) {
  const router = useRouter();
  const moreRef = useRef<HTMLDivElement>(null);
  const risk = getRiskLevel(p.riskTags);
  const communication = p.isActive === false ? "Restricted" : "Allowed";
  const isOpen = openMoreId === p._id;

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) onOpenMore(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onOpenMore]);

  return (
    <tr
      className="transition"
      onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "#EEF0F8")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "")}
    >
      <td className="px-4 py-3 text-xs font-mono" style={{ color: "#5A6073" }}>{p.prisonerId}</td>
      <td className="px-4 py-3">
        <button
          onClick={() => router.push(`/prisoner/${p._id}`)}
          className="cursor-pointer font-bold text-sm hover:underline text-left"
          style={{ color: "#0B1F4B" }}
        >
          {p.fullName}
        </button>
      </td>
      <td className="px-4 py-3">{p.prisonName}</td>
      <td className="px-4 py-3 text-center">{p.contactCount ?? "—"}</td>
      <td className={`px-4 py-3 ${risk.className}`}>{risk.label}</td>
      <td className="px-4 py-3">{communication}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => router.push(`/prisoner/${p._id}`)}
            className="cursor-pointer px-3 py-1 text-xs font-bold uppercase tracking-wide transition"
            style={{ background: "#0B1F4B", color: "#C9A227", borderRadius: 2 }}
          >
            View
          </button>
          <button
            onClick={() => onEdit(p)}
            className="cursor-pointer px-3 py-1 text-xs font-bold uppercase tracking-wide transition"
            style={{ background: "#7A0000", color: "#fff", borderRadius: 2 }}
          >
            Edit
          </button>
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => onOpenMore(isOpen ? null : p._id)}
              className="cursor-pointer flex items-center gap-0.5 px-2 py-1 text-xs font-bold uppercase tracking-wide transition"
              style={{ background: "#5A6073", color: "#fff", borderRadius: 2 }}
            >
              More <ChevronDown className="w-3 h-3" />
            </button>
            {isOpen && (
              <div className="absolute right-0 top-7 z-50 w-44 bg-white border rounded shadow-lg text-sm text-gray-700">
                <button
                  onClick={() => { onOpenMore(null); router.push(`/prisoner/${p._id}`); }}
                  className="cursor-pointer w-full text-left px-4 py-2 hover:bg-gray-50 transition"
                >
                  Call History
                </button>
                <button
                  onClick={() => { onOpenMore(null); router.push(`/prisoner/${p._id}`); }}
                  className="cursor-pointer w-full text-left px-4 py-2 hover:bg-gray-50 transition"
                >
                  Contacts
                </button>
                {p.isActive !== false ? (
                  deactivatingId === p._id ? (
                    <div className="px-4 py-2 border-t space-y-1">
                      <p className="text-xs text-gray-500">Deactivate this prisoner?</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onDeactivateConfirm(p._id)}
                          className="cursor-pointer px-2 py-0.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition"
                        >
                          Yes
                        </button>
                        <button
                          onClick={onDeactivateCancel}
                          className="cursor-pointer px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onDeactivateRequest(p._id)}
                      className="cursor-pointer w-full text-left px-4 py-2 hover:bg-gray-50 text-red-500 transition border-t"
                    >
                      Deactivate
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => onDelete(p._id)}
                    className="cursor-pointer w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 font-medium transition border-t"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

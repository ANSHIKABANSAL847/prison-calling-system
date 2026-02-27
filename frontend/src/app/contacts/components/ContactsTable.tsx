"use client";

import { useRouter } from "next/navigation";
import { Check, X, ArrowRight, Pencil, Trash2 } from "lucide-react";
import Pagination from "@/components/Pagination";

export interface PopulatedPrisoner {
  _id: string;
  fullName: string;
  prisonerId: number;
}

export interface ContactRow {
  _id: string;
  contactName: string;
  relation: string;
  phoneNumber: string;
  photo?: string;
  isVerified: boolean;
  voiceSamples: number;
  verificationAccuracy: number;
  prisoner: PopulatedPrisoner;
  createdAt: string;
}

const TABLE_HEADERS = [
  "Contact Name", "Relationship", "Linked Inmate", "Voice Enrolled",
  "Voice Samples", "Verification Accuracy", "Relationship Map", "Actions",
];

function firstName(name: string) { return name.split(" ")[0]; }

interface ContactsTableProps {
  contacts: ContactRow[];
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (pg: number) => void;
  onDelete: (c: ContactRow) => void;
}

export default function ContactsTable({
  contacts, page, totalPages, total, pageSize, onPageChange, onDelete,
}: ContactsTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-visible" style={{ background: "#fff", border: "1px solid #CBD0D8", borderTop: "3px solid #0B1F4B", borderRadius: 4 }}>
      <table className="w-full text-sm text-left">
        <thead>
          <tr style={{ background: "#0B1F4B" }}>
            {TABLE_HEADERS.map((h) => (
              <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: "#E5E8EC" }}>
          {contacts.map((c) => {
            const prisonerName = c.prisoner?.fullName || "Unknown";
            return (
              <tr key={c._id} className="transition"
                onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "#EEF0F8")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "")}>
                <td className="px-5 py-3 font-bold text-sm" style={{ color: "#0B1F4B" }}>{c.contactName}</td>
                <td className="px-5 py-3" style={{ color: "#5A6073" }}>{c.relation}</td>
                <td className="px-5 py-3">
                  <button onClick={() => c.prisoner?._id && router.push(`/prisoner/${c.prisoner._id}`)}
                    className="cursor-pointer font-semibold hover:underline" style={{ color: "#0B1F4B" }}>
                    {prisonerName}
                  </button>
                </td>
                <td className="px-5 py-3">
                  {c.isVerified ? (
                    <span className="flex items-center gap-1 text-green-600 font-medium"><Check className="w-4 h-4" /> Yes</span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 font-medium"><X className="w-4 h-4" /> No</span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-700">{c.isVerified ? c.voiceSamples || 0 : 0}</td>
                <td className="px-5 py-3">
                  {c.isVerified && c.verificationAccuracy > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 w-10">{c.verificationAccuracy}%</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${c.verificationAccuracy}%` }} />
                      </div>
                    </div>
                  ) : <span className="text-gray-400">N/A</span>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200 font-medium">{firstName(c.contactName)}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                    <div className="flex flex-col items-center">
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200 font-medium">{firstName(prisonerName)}</span>
                      <span className="text-gray-400 text-[10px]">(Inmate)</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/contacts/edit-contact?contactId=${c._id}&prisonerId=${c.prisoner._id}`)}
                      title="Edit contact"
                      className="cursor-pointer p-1.5 transition"
                      style={{ color: "#0B1F4B", borderRadius: 3 }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#EEF0F8")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "")}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(c)}
                      title="Delete contact"
                      className="cursor-pointer p-1.5 transition"
                      style={{ color: "#7A0000", borderRadius: 3 }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#fee2e2")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "")}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={onPageChange} />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Users, ArrowRight, Check, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface PopulatedPrisoner {
  _id: string;
  fullName: string;
  prisonerId: number;
}

interface ContactRow {
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

function firstName(name: string) {
  return name.split(" ")[0];
}

export default function ContactsOverviewPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  async function fetchContacts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/contacts/all`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to fetch contacts");
        return;
      }
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch {
      setError("Network error. Could not fetch contacts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContacts();
  }, []);

  const filtered = contacts.filter((c) => {
    if (!activeSearch) return true;
    const q = activeSearch.toLowerCase();
    return (
      c.contactName.toLowerCase().includes(q) ||
      c.relation.toLowerCase().includes(q) ||
      (c.prisoner?.fullName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Approved Contacts Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            All verified and pending contacts across all inmates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setActiveSearch(search);
              }}
              placeholder="Name, relation, inmate…"
              className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 bg-white"
            />
            <button
              onClick={() => setActiveSearch(search)}
              className="cursor-pointer px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition font-medium"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <AlertCircle className="w-10 h-10 mb-3 text-red-400" />
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchContacts}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Users className="w-12 h-12 mb-3" />
          <p className="text-sm">
            {activeSearch
              ? "No contacts match your search."
              : "No contacts found."}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="bg-white border rounded-lg shadow-sm overflow-visible">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-gray-500 font-semibold text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3">Contact Name</th>
                <th className="px-5 py-3">Relationship</th>
                <th className="px-5 py-3">Linked Inmate</th>
                <th className="px-5 py-3">Voice Enrolled</th>
                <th className="px-5 py-3">Voice Samples</th>
                <th className="px-5 py-3">Verification Accuracy</th>
                <th className="px-5 py-3">Relationship Map</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {filtered.map((c) => {
                const prisonerName = c.prisoner?.fullName || "Unknown";
                return (
                  <tr key={c._id} className="hover:bg-gray-50 transition">
                    {/* Contact Name */}
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {c.contactName}
                    </td>

                    {/* Relationship */}
                    <td className="px-5 py-3 text-gray-600">{c.relation}</td>

                    {/* Linked Inmate */}
                    <td className="px-5 py-3">
                      <button
                        onClick={() =>
                          c.prisoner?._id &&
                          router.push(`/prisoner/${c.prisoner._id}`)
                        }
                        className="cursor-pointer text-blue-600 hover:underline"
                      >
                        {prisonerName}
                      </button>
                    </td>

                    {/* Voice Enrolled */}
                    <td className="px-5 py-3">
                      {c.isVerified ? (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <Check className="w-4 h-4" />
                          Yes
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <X className="w-4 h-4" />
                          No
                        </span>
                      )}
                    </td>

                    {/* Voice Samples */}
                    <td className="px-5 py-3 text-gray-700">
                      {c.isVerified ? c.voiceSamples || 0 : 0}
                    </td>

                    {/* Verification Accuracy */}
                    <td className="px-5 py-3">
                      {c.isVerified && c.verificationAccuracy > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800 w-10">
                            {c.verificationAccuracy}%
                          </span>
                          <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${c.verificationAccuracy}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>

                    {/* Relationship Map */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200 font-medium">
                          {firstName(c.contactName)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                        <div className="flex flex-col items-center">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200 font-medium">
                            {firstName(prisonerName)}
                          </span>
                          <span className="text-gray-400 text-[10px]">
                            (Inmate)
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

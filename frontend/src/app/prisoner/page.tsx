"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  Users,
  ChevronDown,
  Download,
} from "lucide-react";
import EditPrisonerModal from "./components/EditPrisonerModal";
import Pagination from "@/components/Pagination";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Prisoner {
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

function getRiskLevel(tags: string[]): { label: string; className: string } {
  if (
    tags.includes("High Risk") ||
    tags.includes("Violent Offender") ||
    tags.includes("Escape Risk")
  )
    return { label: "High", className: "text-red-600 font-semibold" };
  if (tags.includes("Gang Affiliated"))
    return { label: "Medium", className: "text-orange-500 font-semibold" };
  if (tags.includes("Good Conduct"))
    return { label: "Low", className: "text-green-600 font-semibold" };
  return { label: "Medium", className: "text-orange-500 font-semibold" };
}

export default function PrisonerListPage() {
  const router = useRouter();
  const [prisoners, setPrisoners] = useState<Prisoner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [editingPrisoner, setEditingPrisoner] = useState<Prisoner | null>(null);
  const [openMoreId, setOpenMoreId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const moreRef = useRef<HTMLDivElement | null>(null);

  // Pagination state
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPrisoners = useCallback(async (pg: number, search: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(pg));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`${API_URL}/api/prisoners/list?${params}`, {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to fetch prisoners");
        return;
      }

      const data = await res.json();
      setPrisoners(data.prisoners || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setError("Network error. Could not fetch prisoners.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPrisoners(page, activeSearch);
  }, [fetchPrisoners, page, activeSearch]);

  async function handleDeactivate(id: string) {
    try {
      const res = await fetch(`${API_URL}/api/prisoners/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: false }),
      });
      if (res.ok) {
        setDeactivatingId(null);
        setOpenMoreId(null);
        fetchPrisoners(page, activeSearch);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Failed to deactivate prisoner.");
      }
    } catch {
      alert("Network error. Please try again.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this prisoner and all their contacts? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_URL}/api/prisoners/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setOpenMoreId(null);
        fetchPrisoners(page, activeSearch);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Failed to delete prisoner.");
      }
    } catch {
      alert("Network error. Please try again.");
    }
  }

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setOpenMoreId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div>
      {/* Top bar: Search left, buttons right */}
      <div className="flex items-end justify-between mb-6">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { setPage(1); setActiveSearch(searchInput); }
              }}
              className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 bg-white"
            />
            <button
              onClick={() => { setPage(1); setActiveSearch(searchInput); }}
              className="cursor-pointer px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition font-medium"
            >
              Search
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/prisoner/add-prisoner")}
            className="cursor-pointer flex items-center gap-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition"
          >
            Add Inmate
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="cursor-pointer flex items-center gap-1 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-medium transition">
            Export
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <AlertCircle className="w-10 h-10 mb-3 text-red-400" />
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => fetchPrisoners(page, activeSearch)}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && prisoners.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Users className="w-12 h-12 mb-3" />
          <p className="text-sm">
            {activeSearch
              ? "No prisoners match your search."
              : "No prisoners found."}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && prisoners.length > 0 && (
        <div className="bg-white border rounded shadow-sm overflow-visible">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-gray-600 font-semibold">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Facility</th>
                <th className="px-4 py-3">Contact Count</th>
                <th className="px-4 py-3">Risk Level</th>
                <th className="px-4 py-3">Communication</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {prisoners.map((p) => {
                const risk = getRiskLevel(p.riskTags);
                const communication =
                  p.isActive === false ? "Restricted" : "Allowed";
                return (
                  <tr key={p._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-600">{p.prisonerId}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/prisoner/${p._id}`)}
                        className="cursor-pointer text-blue-600 hover:underline font-medium text-left"
                      >
                        {p.fullName}
                      </button>
                    </td>
                    <td className="px-4 py-3">{p.prisonName}</td>
                    <td className="px-4 py-3 text-center">
                      {p.contactCount ?? "—"}
                    </td>
                    <td className={`px-4 py-3 ${risk.className}`}>
                      {risk.label}
                    </td>
                    <td className="px-4 py-3">{communication}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 relative">
                        {/* View */}
                        <button
                          onClick={() => router.push(`/prisoner/${p._id}`)}
                          className="cursor-pointer px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium transition"
                        >
                          View
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => setEditingPrisoner(p)}
                          className="cursor-pointer px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded font-medium transition"
                        >
                          Edit
                        </button>
                        {/* More dropdown */}
                        <div className="relative" ref={openMoreId === p._id ? moreRef : null}>
                          <button
                            onClick={() =>
                              setOpenMoreId(
                                openMoreId === p._id ? null : p._id
                              )
                            }
                            className="cursor-pointer flex items-center gap-0.5 px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded font-medium transition"
                          >
                            More
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {openMoreId === p._id && (
                            <div className="absolute right-0 top-7 z-50 w-44 bg-white border rounded shadow-lg text-sm text-gray-700">
                              <button
                                onClick={() => {
                                  setOpenMoreId(null);
                                  router.push(`/prisoner/${p._id}`);
                                }}
                                className="cursor-pointer w-full text-left px-4 py-2 hover:bg-gray-50 transition"
                              >
                                Call History
                              </button>
                              <button
                                onClick={() => {
                                  setOpenMoreId(null);
                                  router.push(`/prisoner/${p._id}`);
                                }}
                                className="cursor-pointer w-full text-left px-4 py-2 hover:bg-gray-50 transition"
                              >
                                Contacts
                              </button>
                              {p.isActive !== false ? (
                                deactivatingId === p._id ? (
                                  <div className="px-4 py-2 border-t space-y-1">
                                    <p className="text-xs text-gray-500">
                                      Deactivate this prisoner?
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleDeactivate(p._id)}
                                        className="cursor-pointer px-2 py-0.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={() =>
                                          setDeactivatingId(null)
                                        }
                                        className="cursor-pointer px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition"
                                      >
                                        No
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeactivatingId(p._id)}
                                    className="cursor-pointer w-full text-left px-4 py-2 hover:bg-gray-50 text-red-500 transition border-t"
                                  >
                                    Deactivate
                                  </button>
                                )
                              ) : (
                                <button
                                  onClick={() => handleDelete(p._id)}
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
              })}
            </tbody>
          </table>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={(pg) => setPage(pg)}
          />
        </div>
      )}

      {/* Edit Prisoner Modal */}
      <EditPrisonerModal
        isOpen={!!editingPrisoner}
        prisoner={editingPrisoner}
        onClose={() => setEditingPrisoner(null)}
        onSuccess={() => fetchPrisoners(page, activeSearch)}
      />
    </div>
  );
}
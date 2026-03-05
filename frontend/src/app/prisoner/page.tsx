"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Users, Download } from "lucide-react";
import * as XLSX from "xlsx";
import Pagination from "@/components/Pagination";
import PageBanner from "@/components/PageBanner";
import PrisonerTableRow, { Prisoner, getRiskLevel } from "./components/PrisonerTableRow";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const TABLE_HEADERS = [
  "Prisoner ID", "Full Name", "Facility", "Contacts",
  "Risk Level", "Comm. Status", "Actions",
];

const EXPORT_PAGE_SIZE = 50;

export default function PrisonerListPage() {
  const router = useRouter();
  const [prisoners, setPrisoners] = useState<Prisoner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [openMoreId, setOpenMoreId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPrisoners = useCallback(async (pg: number, search: string) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(pg));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`${API_URL}/api/prisoners/list?${params}`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) { router.replace("/login"); return; }
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to fetch prisoners"); return;
      }
      const data = await res.json();
      setPrisoners(data.prisoners || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch { setError("Network error. Could not fetch prisoners."); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchPrisoners(page, activeSearch); }, [fetchPrisoners, page, activeSearch]);

  /* ── Export handler ── */
  async function handleExport() {
    setExporting(true);
    try {
      // Fetch ALL prisoners (set a high limit)
      const params = new URLSearchParams();
      if (activeSearch) params.set("search", activeSearch);
      params.set("page", "1");
      params.set("limit", "10000");
      const res = await fetch(`${API_URL}/api/prisoners/list?${params}`, { credentials: "include" });
      if (!res.ok) { alert("Failed to fetch prisoners for export."); return; }
      const data = await res.json();
      const allPrisoners: Prisoner[] = data.prisoners || [];

      if (allPrisoners.length === 0) { alert("No prisoners to export."); return; }

      const wb = XLSX.utils.book_new();
      const totalExportPages = Math.ceil(allPrisoners.length / EXPORT_PAGE_SIZE);

      for (let pg = 0; pg < totalExportPages; pg++) {
        const slice = allPrisoners.slice(pg * EXPORT_PAGE_SIZE, (pg + 1) * EXPORT_PAGE_SIZE);

        const rows = slice.map((p, idx) => ({
          "S.No": pg * EXPORT_PAGE_SIZE + idx + 1,
          "Prisoner ID": p.prisonerId,
          "Full Name": p.fullName,
          "Gender": p.gender,
          "Date of Birth": p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString("en-IN") : "—",
          "Aadhaar Number": p.aadhaarNumber || "—",
          "Case Number": p.caseNumber,
          "Facility": p.prisonName,
          "Sentence (Years)": p.sentenceYears,
          "Risk Level": getRiskLevel(p.riskTags).label,
          "Risk Tags": p.riskTags.join(", ") || "—",
          "Contacts": p.contactCount ?? 0,
          "Comm. Status": p.isActive === false ? "Restricted" : "Allowed",
        }));

        const ws = XLSX.utils.json_to_sheet(rows);

        /* Auto-fit column widths */
        const colKeys = Object.keys(rows[0]);
        ws["!cols"] = colKeys.map((key) => {
          const maxLen = Math.max(key.length, ...rows.map((r) => String((r as Record<string, unknown>)[key] ?? "").length));
          return { wch: Math.min(maxLen + 2, 40) };
        });

        const sheetName = totalExportPages === 1 ? "Prisoners" : `Page ${pg + 1}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      XLSX.writeFile(wb, `Prisoner_Records_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error("Export error:", err);
      alert("An error occurred while exporting.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeactivate(id: string) {
    try {
      const res = await fetch(`${API_URL}/api/prisoners/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ isActive: false }),
      });
      if (res.ok) { setDeactivatingId(null); setOpenMoreId(null); fetchPrisoners(page, activeSearch); }
      else { const data = await res.json().catch(() => ({})); alert(data.message || "Failed to deactivate prisoner."); }
    } catch { alert("Network error. Please try again."); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this prisoner and all their contacts? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_URL}/api/prisoners/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { setOpenMoreId(null); fetchPrisoners(page, activeSearch); }
      else { const data = await res.json().catch(() => ({})); alert(data.message || "Failed to delete prisoner."); }
    } catch { alert("Network error. Please try again."); }
  }

  return (
    <div className="p-8" style={{ minHeight: "100vh", background: "#F2F4F7" }}>
      <PageBanner
        title="Prisoner Records Register"
        subtitle={`${total} total inmates on record`}
        actions={
          <>
            <button onClick={() => router.push("/prisoner/add-prisoner")}
              className="cursor-pointer flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-4 py-2 transition"
              style={{ background: "#C9A227", color: "#0B1F4B", borderRadius: 3 }}>
              + Add Inmate
            </button>
            <button onClick={handleExport} disabled={exporting}
              className="cursor-pointer flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-4 py-2 transition disabled:opacity-50"
              style={{ border: "1px solid rgba(201,162,39,0.5)", color: "#C9A227", borderRadius: 3 }}>
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {exporting ? "Exporting…" : "Export"}
            </button>
          </>
        }
      />

      <div className="flex items-center gap-2 mb-5">
        <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "#0B1F4B" }}>Search:</label>
        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); setActiveSearch(searchInput); } }}
          className="border px-3 py-1.5 text-sm focus:outline-none w-56 bg-white"
          style={{ borderColor: "#CBD0D8", borderRadius: 3 }} />
        <button onClick={() => { setPage(1); setActiveSearch(searchInput); }}
          className="cursor-pointer px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition"
          style={{ background: "#0B1F4B", color: "#C9A227", borderRadius: 3 }}>
          Search
        </button>
      </div>

      {loading && <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <AlertCircle className="w-10 h-10 mb-3 text-red-400" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => fetchPrisoners(page, activeSearch)} className="mt-3 text-sm text-blue-600 hover:underline">Retry</button>
        </div>
      )}
      {!loading && !error && prisoners.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Users className="w-12 h-12 mb-3" />
          <p className="text-sm">{activeSearch ? "No prisoners match your search." : "No prisoners found."}</p>
        </div>
      )}

      {!loading && !error && prisoners.length > 0 && (
        <div className="overflow-visible" style={{ background: "#fff", border: "1px solid #CBD0D8", borderTop: "3px solid #0B1F4B", borderRadius: 4 }}>
          <table className="w-full text-sm text-left">
            <thead>
              <tr style={{ background: "#0B1F4B" }}>
                {TABLE_HEADERS.map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#E5E8EC" }}>
              {prisoners.map((p) => (
                <PrisonerTableRow
                  key={p._id}
                  prisoner={p}
                  openMoreId={openMoreId}
                  deactivatingId={deactivatingId}
                  onOpenMore={setOpenMoreId}
                  onDeactivateRequest={setDeactivatingId}
                  onDeactivateConfirm={handleDeactivate}
                  onDeactivateCancel={() => setDeactivatingId(null)}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(pg) => setPage(pg)} />
        </div>
      )}

    </div>
  );
}

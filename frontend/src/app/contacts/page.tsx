"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Users, UserPlus } from "lucide-react";
import PageBanner from "@/components/PageBanner";
import ContactsTable, { ContactRow } from "./components/ContactsTable";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ContactsOverviewPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<ContactRow | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const fetchContacts = useCallback(async (pg: number, searchTerm: string) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      params.set("page", String(pg));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`${API_URL}/api/contacts/all?${params}`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) { router.replace("/login"); return; }
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to fetch contacts"); return;
      }
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch { setError("Network error. Could not fetch contacts."); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchContacts(page, activeSearch); }, [fetchContacts, page, activeSearch]);

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteConfirming(true);
    try {
      const res = await fetch(`${API_URL}/api/contacts/${deleteTarget._id}`, {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); alert(data.message || "Failed to delete contact."); return; }
      setDeleteTarget(null);
      fetchContacts(page, activeSearch);
    } catch { alert("Network error."); }
    finally { setDeleteConfirming(false); }
  }

  return (
    <div className="p-8" style={{ minHeight: "100vh", background: "#F2F4F7" }}>
      <PageBanner
        title="Authorised Contacts Register"
        subtitle="All verified and pending contacts across inmates"
        actions={
          <button onClick={() => router.push("/contacts/add-contact")}
            className="cursor-pointer flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-4 py-2 transition"
            style={{ background: "#C9A227", color: "#0B1F4B", borderRadius: 3 }}>
            <UserPlus className="w-3.5 h-3.5" /> Add Contact
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-5">
        <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "#0B1F4B" }}>Search:</label>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); setActiveSearch(search); } }}
          placeholder="Name, relation, inmate…"
          className="border px-3 py-1.5 text-sm focus:outline-none w-60 bg-white"
          style={{ borderColor: "#CBD0D8", borderRadius: 3 }} />
        <button onClick={() => { setPage(1); setActiveSearch(search); }}
          className="cursor-pointer px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition"
          style={{ background: "#0B1F4B", color: "#C9A227", borderRadius: 3 }}>
          Search
        </button>
      </div>

      {loading && <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <AlertCircle className="w-10 h-10 mb-3 text-red-400" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => fetchContacts(page, activeSearch)} className="mt-3 text-sm text-blue-600 hover:underline">Retry</button>
        </div>
      )}
      {!loading && !error && contacts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Users className="w-12 h-12 mb-3" />
          <p className="text-sm">{activeSearch ? "No contacts match your search." : "No contacts found."}</p>
        </div>
      )}

      {!loading && !error && contacts.length > 0 && (
        <ContactsTable
          contacts={contacts}
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onDelete={setDeleteTarget}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          itemName={deleteTarget.contactName}
          confirming={deleteConfirming}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

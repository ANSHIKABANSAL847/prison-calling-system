"use client";

import { useEffect, useState } from "react";
import {
  Phone,
  CheckCircle,
  XCircle,
  UserPlus,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Loader2,
} from "lucide-react";
import type { ContactData } from "../[id]/page";
import AddContactModal from "./AddContactModal";
import { useRouter } from "next/navigation";
import Pagination from "@/components/Pagination";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface AuthorizedContactsProps {
  prisonerId: string;
  contacts: ContactData[];
  onRefresh: () => void;
}

export default function AuthorizedContacts({
  prisonerId,
  contacts,
  onRefresh,
}: AuthorizedContactsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const router = useRouter();

  // Client-side pagination
  const CONTACTS_PAGE_SIZE = 5;
  const [contactPage, setContactPage] = useState(1);
  const totalContactPages = Math.ceil(contacts.length / CONTACTS_PAGE_SIZE);
  const pagedContacts = contacts.slice(
    (contactPage - 1) * CONTACTS_PAGE_SIZE,
    contactPage * CONTACTS_PAGE_SIZE
  );

  // Reset to page 1 when contacts list changes (e.g. after add/delete)
  useEffect(() => {
    setContactPage(1);
  }, [contacts.length]);
  async function handleDelete(contactId: string) {
    setDeletingId(contactId);
    try {
      const res = await fetch(`${API_URL}/api/contacts/${contactId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        onRefresh();
      }
    } catch {
      // silently fail, user can retry
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  async function handleToggleVerify(contactId: string) {
    setTogglingId(contactId);
    try {
      const res = await fetch(
        `${API_URL}/api/contacts/${contactId}/verify`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      if (res.ok) {
        onRefresh();
      }
    } catch {
      // silently fail
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Authorized Contacts{" "}
            <span className="text-sm font-normal text-gray-400">
              ({contacts.length})
            </span>
          </h3>
          <button
            onClick={() => router.push(`/contacts/add-contact?prisonerId=${prisonerId}`)}
            className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Contact
          </button>
        </div>

        {contacts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400 mb-3">
              No authorized contacts found for this prisoner.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="cursor-pointer text-sm text-blue-600 hover:underline"
            >
              + Add the first contact
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pagedContacts.map((c) => (
              <div
                key={c._id}
                className="flex justify-between items-center border rounded-lg p-3 hover:bg-gray-50 transition"
              >
                {/* Left: avatar + info */}
                <div className="flex items-center gap-3">
                  {c.photo ? (
                    <img
                      src={c.photo}
                      alt={c.contactName}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://i.pravatar.cc/40";
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">
                      {c.contactName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm">{c.contactName}</p>
                    <p className="text-xs text-gray-500">{c.relation}</p>
                  </div>
                </div>

                {/* Right: phone, status, actions */}
                <div className="flex items-center gap-3">
                  {/* Phone */}
                  <div className="hidden sm:flex items-center gap-1 text-sm text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {c.phoneNumber}
                  </div>

                  {/* Verification badge */}
                  <div className="flex items-center gap-1 text-xs">
                    {c.isVerified ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle className="w-3.5 h-3.5" />
                        Unverified
                      </span>
                    )}
                  </div>

                  {/* Toggle verify */}
                  <button
                    onClick={() => handleToggleVerify(c._id)}
                    disabled={togglingId === c._id}
                    title={
                      c.isVerified ? "Mark as unverified" : "Mark as verified"
                    }
                    className="cursor-pointer p-1.5 rounded-md hover:bg-gray-200 transition text-gray-500 disabled:opacity-50"
                  >
                    {togglingId === c._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : c.isVerified ? (
                      <ShieldOff className="w-4 h-4" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                  </button>

                  {/* Delete */}
                  {confirmDeleteId === c._id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(c._id)}
                        disabled={deletingId === c._id}
                        className="cursor-pointer px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition disabled:opacity-50"
                      >
                        {deletingId === c._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Confirm"
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="cursor-pointer px-2 py-1 text-xs border rounded hover:bg-gray-100 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(c._id)}
                      className="cursor-pointer p-1.5 rounded-md hover:bg-red-50 transition text-red-400 hover:text-red-600"
                      title="Delete contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contacts pagination */}
        {totalContactPages > 1 && (
          <div className="mt-3 border-t pt-3">
            <Pagination
              page={contactPage}
              totalPages={totalContactPages}
              total={contacts.length}
              pageSize={CONTACTS_PAGE_SIZE}
              onPageChange={setContactPage}
            />
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddModal}
        prisonerId={prisonerId}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          onRefresh();
        }}
      />
    </>
  );
}
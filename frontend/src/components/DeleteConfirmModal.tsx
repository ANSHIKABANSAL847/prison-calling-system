"use client";

import { Loader2 } from "lucide-react";

interface DeleteConfirmModalProps {
  itemName: string;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({ itemName, confirming, onCancel, onConfirm }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-full max-w-sm mx-4 overflow-hidden"
        style={{
          background: "#fff",
          border: "1px solid #CBD0D8",
          borderTop: "4px solid #7A0000",
          borderRadius: 4,
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}
      >
        <div className="px-6 py-4" style={{ background: "#FFF5F5", borderBottom: "1px solid #fca5a5" }}>
          <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: "#7A0000" }}>
            Confirm Deletion
          </h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm" style={{ color: "#1A1A1A" }}>
            Delete <span className="font-bold">{itemName}</span>? This cannot be undone.
          </p>
        </div>
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: "1px solid #CBD0D8", background: "#F9FAFB" }}
        >
          <button
            onClick={onCancel}
            className="cursor-pointer px-4 py-2 text-xs font-bold uppercase tracking-widest transition"
            style={{ border: "1px solid #CBD0D8", borderRadius: 3, color: "#5A6073" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition"
            style={{ background: "#7A0000", color: "#fff", borderRadius: 3 }}
          >
            {confirming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

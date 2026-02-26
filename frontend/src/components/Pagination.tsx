"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/**
 * Shared pagination control used across all list pages.
 * Renders nothing when there is only one page.
 */
export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Build the page-number window with ellipsis
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
      <p className="text-sm text-gray-500">
        Showing {from}–{to} of {total}
      </p>

      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        {pages.map((pg, i) =>
          pg === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="w-8 text-center text-gray-400 text-sm select-none"
            >
              …
            </span>
          ) : (
            <button
              key={pg}
              onClick={() => onPageChange(pg as number)}
              className={`w-8 h-8 rounded text-sm font-medium transition cursor-pointer ${
                pg === page
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-gray-200 text-gray-600 hover:bg-white"
              }`}
            >
              {pg}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

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
    <div className="flex items-center justify-between px-4 py-3" style={{borderTop:'1px solid #E5E8EC', background:'#F9FAFB'}}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{color:'#5A6073'}}>
        Showing {from}–{to} of {total} records
      </p>

      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 transition cursor-pointer disabled:opacity-40"
          style={{border:'1px solid #CBD0D8', borderRadius:3, color:'#0B1F4B'}}
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
              className="w-8 h-8 text-xs font-bold transition cursor-pointer"
              style={
                pg === page
                  ? {background:'#0B1F4B', color:'#C9A227', borderRadius:3}
                  : {border:'1px solid #CBD0D8', borderRadius:3, color:'#0B1F4B'}
              }
            >
              {pg}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 transition cursor-pointer disabled:opacity-40"
          style={{border:'1px solid #CBD0D8', borderRadius:3, color:'#0B1F4B'}}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

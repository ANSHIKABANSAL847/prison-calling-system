import { Loader2, AlertCircle, Play, Eye, Download } from "lucide-react";
import { CallLog } from "../types";
import VerificationBadge from "./VerificationBadge";
import Pagination from "@/components/Pagination";

interface CallLogsTableProps {
  logs: CallLog[];
  loading: boolean;
  error: string;
  selected: CallLog | null;
  page: number;
  totalPages: number;
  total: number;
  onSelectLog: (log: CallLog) => void;
  onPageChange: (pg: number) => void;
  formatDate: (iso: string) => string;
}

const TABLE_HEADERS = [
  "Date & Time",
  "Agent",
  "Contact",
  "Session ID",
  "Verification Result",
  "Similarity",
  "Actions",
];

export default function CallLogsTable({
  logs, loading, error, selected,
  page, totalPages, total,
  onSelectLog, onPageChange, formatDate,
}: CallLogsTableProps) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #CBD0D8",
        borderTop: "3px solid #0B1F4B",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      {error && (
        <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 border-b border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#0B1F4B" }}>
              {TABLE_HEADERS.map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Loading records…</p>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400 text-sm">
                  No records found. Try adjusting your filters.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log._id}
                  onClick={() => onSelectLog(log)}
                  className="cursor-pointer transition-colors"
                  style={
                    selected?._id === log._id
                      ? { background: "#EEF0F8", borderBottom: "1px solid #C9A227" }
                      : { borderBottom: "1px solid #E5E8EC" }
                  }
                  onMouseEnter={(e) => {
                    if (selected?._id !== log._id)
                      (e.currentTarget as HTMLTableRowElement).style.background = "#EEF0F8";
                  }}
                  onMouseLeave={(e) => {
                    if (selected?._id !== log._id)
                      (e.currentTarget as HTMLTableRowElement).style.background = "";
                  }}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {formatDate(log.date)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-800 font-medium">
                    {log.agent?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {log.contact?.contactName ?? "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-600 text-xs">
                    {log.sessionId}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <VerificationBadge result={log.verificationResult} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-800">
                    {log.similarityScore}%
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        title="Play"
                        onClick={(e) => { e.stopPropagation(); onSelectLog(log); }}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="View Details"
                        onClick={(e) => { e.stopPropagation(); onSelectLog(log); }}
                        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Export"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={10}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

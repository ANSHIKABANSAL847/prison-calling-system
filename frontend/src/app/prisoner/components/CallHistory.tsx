"use client";

import { useEffect, useState } from "react";
import { PhoneIncoming, Loader2, AlertCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface CallLog {
  _id: string;
  sessionId: string;
  verificationResult: string;
  similarityScore: number;
  duration: string;
  date: string;
}

interface CallHistoryProps {
  prisonerId: string;
  prisonerName: string;
}

export default function CallHistory({ prisonerId, prisonerName }: CallHistoryProps) {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLogs();
  }, [prisonerId]);

  async function fetchLogs() {
  setLoading(true);
  setError("");
  try {
    console.log("Fetching call logs for prisoner:", prisonerId);
    const url = `${API_URL}/api/call-logs?prisoner=${prisonerId}`;
    console.log("Full URL:", url);

    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Response status:", res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.error("Error response:", errText);
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log("Full API response:", data);

    setLogs(data.logs || []);
  } catch (err: any) {
    console.error("Fetch error:", err);
    setError(err.message || "Failed to load call monitoring logs.");
  } finally {
    setLoading(false);
  }
}
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-600">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <PhoneIncoming className="w-10 h-10 mb-3" />
        <p className="text-sm text-center">
          No call history available for <span className="font-medium text-gray-600">{prisonerName}</span>.
        </p>
        <p className="text-xs mt-1">Call logs will appear here once monitored.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-700">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2">Session ID</th>
            <th className="px-4 py-2">Verification</th>
            <th className="px-4 py-2">Similarity (%)</th>
            <th className="px-4 py-2">Duration</th>
            <th className="px-4 py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log._id} className="bg-white border-b">
              <td className="px-4 py-2">{log.sessionId}</td>
              <td className="px-4 py-2">{log.verificationResult}</td>
              <td className="px-4 py-2">{log.similarityScore}</td>
              <td className="px-4 py-2">{log.duration}</td>
              <td className="px-4 py-2">{new Date(log.date).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  }

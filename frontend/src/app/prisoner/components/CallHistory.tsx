"use client";

import { PhoneIncoming } from "lucide-react";

interface CallHistoryProps {
  prisonerName: string;
}

export default function CallHistory({ prisonerName }: CallHistoryProps) {
  // Call history data will come from a future API endpoint.
  // For now, show an empty state since there's no call-log backend yet.
  return (
    <div className="bg-white rounded-xl shadow p-6 h-full">
      <h3 className="text-lg font-semibold mb-4">
        Communication & Call History
      </h3>

      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <PhoneIncoming className="w-10 h-10 mb-3" />
        <p className="text-sm text-center">
          No call history available for{" "}
          <span className="font-medium text-gray-600">{prisonerName}</span>.
        </p>
        <p className="text-xs mt-1">
          Call logs will appear here once monitored.
        </p>
      </div>
    </div>
  );
}
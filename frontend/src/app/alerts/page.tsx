"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Phone, ShieldAlert } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Alert {
  _id: string;
  callId: string;
  type: string;
  prisonerId: string;
  timestamp: string;
}

export default function AlertsPage() {

  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/alerts/list`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setAlerts(data.alerts || []));
  }, []);

  return (
    <div className="p-8" style={{ background: "#F2F4F7", minHeight: "100vh" }}>

      {/* Header */}
      <div
        className="flex items-center justify-between mb-6 px-6 py-4"
        style={{
          background: "linear-gradient(135deg,#0B1F4B,#162d6b)",
          borderLeft: "5px solid #C9A227",
          borderRadius: 6,
        }}
      >
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-red-400 w-6 h-6" />
          <h1 className="text-white text-lg font-bold tracking-wide">
            Incident Monitoring
          </h1>
        </div>

        <span
          className="text-xs font-bold px-3 py-1 rounded"
          style={{
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
          }}
        >
          {alerts.length} ACTIVE ALERTS
        </span>
      </div>

      {/* Alerts Container */}
      <div className="bg-white rounded border shadow-sm">

        {/* Empty State */}
        {alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <AlertTriangle className="w-10 h-10 mb-3 text-gray-400" />
            <p className="text-sm font-medium">No incidents detected</p>
            <p className="text-xs text-gray-400">
              All monitored calls are currently secure
            </p>
          </div>
        )}

        {/* Alert List */}
        {alerts.map((alert) => (
          <div
            key={alert._id}
            className="flex items-center justify-between px-6 py-4 border-b hover:bg-gray-50 transition"
          >
            {/* Left section */}
            <div className="flex items-center gap-4">

              <div
                className="p-2 rounded"
                style={{
                  background: "rgba(220,38,38,0.12)",
                }}
              >
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Unauthorized Speaker Detected
                </p>

                <p className="text-xs text-gray-500">
                  Prisoner ID: {alert.prisonerId}
                </p>
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-8 text-xs text-gray-500">

              <div className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                <span className="font-mono">{alert.callId}</span>
              </div>

              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(alert.timestamp).toLocaleString()}
              </div>

              <span
                className="text-[10px] font-bold px-2 py-1 rounded tracking-wide"
                style={{
                  background: "#7A0000",
                  color: "#fff",
                }}
              >
                HIGH RISK
              </span>

            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
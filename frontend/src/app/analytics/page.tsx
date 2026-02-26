"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Clock, Bell, User } from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const trendData = [
  { month: "Jan", alerts: 2000 },
  { month: "Feb", alerts: 2400 },
  { month: "Mar", alerts: 2800 },
  { month: "Apr", alerts: 3600 },
  { month: "May", alerts: 3200 },
  { month: "Jun", alerts: 3900 },
];

const detectionMetrics = [
  { label: "Speech Recognition", value: 92, color: "#3b82f6" },
  { label: "Keyword Detection", value: 89, color: "#22c55e" },
  { label: "Threat Identification", value: 87, color: "#f97316" },
];

const highRiskPrisoners = [
  { id: "A7321", risk: "High", alerts: 23, flagged: 15 },
  { id: "B4598", risk: "High", alerts: 18, flagged: 12 },
  { id: "C6784", risk: "Medium", alerts: 12, flagged: 5 },
  { id: "D3157", risk: "High", alerts: 20, flagged: 14 },
];

// heatmap: rows = days, cols = time slots
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const times = ["12 AM", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM"];

const heatmapData: number[][] = [
  [0, 0, 1, 2, 4, 5, 6, 4],
  [0, 1, 2, 4, 7, 8, 7, 5],
  [0, 0, 1, 3, 5, 6, 8, 3],
  [0, 1, 2, 5, 9, 7, 6, 4],
  [0, 1, 3, 5, 8, 9, 7, 5],
  [1, 2, 2, 3, 4, 4, 3, 1],
  [0, 0, 1, 1, 2, 2, 1, 0],
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function heatColor(value: number): string {
  if (value === 0) return "#fff9f0";
  if (value <= 2) return "#fde68a";
  if (value <= 4) return "#fbbf24";
  if (value <= 6) return "#f97316";
  if (value <= 8) return "#dc2626";
  return "#991b1b";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DonutChart({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label: string;
}) {
  const radius = 36;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="96" height="96" viewBox="0 0 96 96">
        {/* Track */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
        {/* Label */}
        <text x="48" y="52" textAnchor="middle" fontSize="18" fontWeight="700" fill="#111827">
          {value}%
        </text>
      </svg>
      <p className="text-xs text-center text-gray-600 leading-tight">{label}</p>
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const isHigh = risk === "High";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold text-white ${isHigh ? "bg-red-500" : "bg-yellow-500"
        }`}
    >
      {risk}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Intelligence</h1>
        <div className="flex items-center gap-3 text-gray-500">
          <button className="hover:text-gray-700 transition-colors">
            <Clock className="w-5 h-5" />
          </button>
          <button className="hover:text-gray-700 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="hover:text-gray-700 transition-colors">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Top Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* System Trends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">System Trends</h2>
          <p className="text-xs text-gray-400 mb-4">Keyword Alerts</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: number | undefined) => [(v ?? 0).toLocaleString(), "Alerts"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Line
                type="monotone"
                dataKey="alerts"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#3b82f6" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Detection Accuracy */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Detection Accuracy</h2>
          <div className="flex justify-around items-center h-[180px]">
            {detectionMetrics.map((m) => (
              <DonutChart key={m.label} value={m.value} color={m.color} label={m.label} />
            ))}
          </div>
        </div>

        {/* High-Risk Prisoner Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            High-Risk Prisoner Analysis
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-2 text-left font-medium">Inmate ID</th>
                <th className="pb-2 text-left font-medium">Risk Level</th>
                <th className="pb-2 text-right font-medium">Alerts</th>
                <th className="pb-2 text-right font-medium">Flagged Calls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {highRiskPrisoners.map((p) => (
                <tr key={p.id} className="text-gray-700">
                  <td className="py-2.5 font-medium">{p.id}</td>
                  <td className="py-2.5">
                    <RiskBadge risk={p.risk} />
                  </td>
                  <td className="py-2.5 text-right">{p.alerts}</td>
                  <td className="py-2.5 text-right">{p.flagged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Call Volume Heatmap */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Call Volume Heatmap</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-gray-500 border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="w-10" />
                  {times.map((t) => (
                    <th key={t} className="font-normal text-center pb-1 whitespace-nowrap">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day, di) => (
                  <tr key={day}>
                    <td className="pr-2 text-right font-medium text-gray-500">{day}</td>
                    {heatmapData[di].map((val, ti) => (
                      <td key={ti} className="text-center">
                        <div
                          className="w-full h-7 rounded"
                          style={{ backgroundColor: heatColor(val) }}
                          title={`${day} ${times[ti]}: ${val}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance Reports */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Compliance Reports</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Recorded Calls Reviewed</p>
              <p className="text-3xl font-bold text-gray-900">3,250</p>
            </div>
            <div className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Policy Violations</p>
              <p className="text-3xl font-bold text-red-500">58</p>
            </div>
            <div className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Non-Compliant Calls</p>
              <p className="text-3xl font-bold text-gray-900">112</p>
            </div>
            <div className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Audit Pass Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                94%{" "}
                <span className="text-green-500 text-base font-semibold">▲</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

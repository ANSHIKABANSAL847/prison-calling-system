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
    <div className="p-8" style={{minHeight:'100vh', background:'#F2F4F7'}}>
      {/* ═══ PAGE HEADER ═══ */}
      <div
        className="mb-6 px-7 py-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, #0B1F4B 0%, #162d6b 100%)',
          borderLeft: '5px solid #C9A227',
          borderRadius: 4,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-0.5" style={{color:'rgba(201,162,39,0.7)'}}>Department of Prisons · Haryana</p>
          <h1 className="text-xl font-black uppercase tracking-wide text-white">System Intelligence & Reports</h1>
          <p className="text-white/40 text-xs mt-0.5">AI-powered analytics and compliance reporting</p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" style={{color:'rgba(201,162,39,0.6)'}} />
          <Bell className="w-5 h-5" style={{color:'rgba(201,162,39,0.6)'}} />
          <User className="w-5 h-5" style={{color:'rgba(201,162,39,0.6)'}} />
        </div>
      </div>

      {/* Top Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* System Trends */}
        <div style={{background:'#fff', border:'1px solid #CBD0D8', borderTop:'3px solid #0B1F4B', borderRadius:4}} className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{color:'#0B1F4B'}}>System Trends</p>
          <p className="text-xs mb-4" style={{color:'#5A6073'}}>Keyword Alerts by Month</p>
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
        <div style={{background:'#fff', border:'1px solid #CBD0D8', borderTop:'3px solid #0B1F4B', borderRadius:4}} className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{color:'#0B1F4B'}}>AI Detection Accuracy</p>
          <div className="flex justify-around items-center h-[180px]">
            {detectionMetrics.map((m) => (
              <DonutChart key={m.label} value={m.value} color={m.color} label={m.label} />
            ))}
          </div>
        </div>

        {/* High-Risk Prisoner Analysis */}
        <div style={{background:'#fff', border:'1px solid #CBD0D8', borderTop:'3px solid #7A0000', borderRadius:4}} className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{color:'#7A0000'}}>High-Risk Prisoner Analysis</p>
          <table className="w-full text-sm">
            <thead>
              <tr style={{background:'#0B1F4B'}}>
                <th className="pb-2 pt-2 pl-2 text-left text-[10px] font-bold uppercase tracking-widest text-white">Inmate ID</th>
                <th className="pb-2 pt-2 text-left text-[10px] font-bold uppercase tracking-widest text-white">Risk</th>
                <th className="pb-2 pt-2 text-right text-[10px] font-bold uppercase tracking-widest text-white">Alerts</th>
                <th className="pb-2 pt-2 pr-2 text-right text-[10px] font-bold uppercase tracking-widest text-white">Flagged</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{borderColor:'#E5E8EC'}}>
              {highRiskPrisoners.map((p) => (
                <tr key={p.id} className="transition" onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background='#EEF0F8'} onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=''}>
                  <td className="py-2.5 pl-2 font-mono text-xs" style={{color:'#0B1F4B', fontWeight:700}}>{p.id}</td>
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
        <div style={{background:'#fff', border:'1px solid #CBD0D8', borderTop:'3px solid #0B1F4B', borderRadius:4}} className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{color:'#0B1F4B'}}>Call Volume Heatmap</p>
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
        <div style={{background:'#fff', border:'1px solid #CBD0D8', borderTop:'3px solid #C9A227', borderRadius:4}} className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{color:'#0B1F4B'}}>Compliance Reports</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4" style={{border:'1px solid #CBD0D8', borderRadius:3}}>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{color:'#5A6073'}}>Recorded Calls Reviewed</p>
              <p className="text-3xl font-black" style={{color:'#0B1F4B'}}>3,250</p>
            </div>
            <div className="p-4" style={{border:'1px solid #fca5a5', borderRadius:3, background:'#fff5f5'}}>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{color:'#5A6073'}}>Policy Violations</p>
              <p className="text-3xl font-black" style={{color:'#7A0000'}}>58</p>
            </div>
            <div className="p-4" style={{border:'1px solid #CBD0D8', borderRadius:3}}>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{color:'#5A6073'}}>Non-Compliant Calls</p>
              <p className="text-3xl font-black" style={{color:'#0B1F4B'}}>112</p>
            </div>
            <div className="p-4" style={{border:'1px solid #d1fae5', borderRadius:3, background:'#f0fdf4'}}>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{color:'#5A6073'}}>Audit Pass Rate</p>
              <p className="text-3xl font-black" style={{color:'#065f46'}}>94% <span style={{fontSize:'1rem', color:'#22c55e'}}>&#9650;</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

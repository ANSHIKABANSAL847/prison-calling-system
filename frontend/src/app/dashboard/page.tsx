"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Contact, PhoneCall, ShieldAlert, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface DashboardStats {
  prisoners: { total: number; active: number; inactive: number };
  contacts: { total: number; verified: number; unverified: number };
  activeCalls: number;
  alerts: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
}

function StatCard({ label, value, sub, icon, color, loading }: StatCardProps) {
  return (
    <div className={`${color} text-white rounded-lg shadow-md p-6`}>
      <div className="flex items-center justify-between">
        <p className="text-sm opacity-90">{label}</p>
        <div className="opacity-40">{icon}</div>
      </div>
      {loading ? (
        <Loader2 className="w-7 h-7 animate-spin mt-2 opacity-70" />
      ) : (
        <>
          <p className="text-3xl font-bold mt-2">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {sub && <p className="text-xs opacity-75 mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`${API_URL}/api/stats`, {
          credentials: "include",
        });
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // silently fail — cards will show 0
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <>
      {/* Page Title */}
      <h2 className="text-gray-700 text-xl font-semibold mb-8">
        Operational Overview
      </h2>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        <StatCard
          label="Prisoners"
          value={stats?.prisoners.total ?? 0}
          sub={`${stats?.prisoners.active ?? 0} active · ${stats?.prisoners.inactive ?? 0} inactive`}
          icon={<Users className="w-8 h-8" />}
          color="bg-blue-600"
          loading={loadingStats}
        />
        <StatCard
          label="Contacts"
          value={stats?.contacts.total ?? 0}
          sub={`${stats?.contacts.verified ?? 0} verified`}
          icon={<Contact className="w-8 h-8" />}
          color="bg-green-600"
          loading={loadingStats}
        />
        <StatCard
          label="Active Calls"
          value={stats?.activeCalls ?? 0}
          icon={<PhoneCall className="w-8 h-8" />}
          color="bg-orange-500"
          loading={loadingStats}
        />
        <StatCard
          label="Alerts"
          value={stats?.alerts ?? 0}
          icon={<ShieldAlert className="w-8 h-8" />}
          color="bg-red-500"
          loading={loadingStats}
        />
      </div>

        {/* Middle Section */}
        <div className="grid grid-cols-2 gap-6 mb-10">
          {/* Live Call Monitoring */}
          <div className="bg-white rounded-lg shadow-md border">
            <div className="bg-gray-100 px-4 py-3 font-medium text-sm border-b">
              Live Call Monitoring
            </div>

            <div className="p-6 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-gray-600 border-b">
                  <tr>
                    <th className="py-2">Inmate</th>
                    <th>Contact</th>
                    <th>Call Time</th>
                    <th>Status</th>
                    <th>Duration</th>
                  </tr>
                </thead>

                <tbody className="text-gray-700">
                  <tr className="border-b">
                    <td className="py-3">Johnson, M.</td>
                    <td>Brother</td>
                    <td>12:34 PM</td>
                    <td>
                      <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                        In Progress
                      </span>
                    </td>
                    <td>08:12</td>
                  </tr>

                  <tr className="border-b">
                    <td className="py-3">Davis, L.</td>
                    <td>Mother</td>
                    <td>12:28 PM</td>
                    <td>
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        Listening
                      </span>
                    </td>
                    <td>15:45</td>
                  </tr>

                  <tr className="border-b">
                    <td className="py-3">Smith, R.</td>
                    <td>Friend</td>
                    <td>12:15 PM</td>
                    <td>
                      <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded">
                        Connected
                      </span>
                    </td>
                    <td>22:19</td>
                  </tr>

                  <tr>
                    <td className="py-3">Garcia, T.</td>
                    <td>Spouse</td>
                    <td>11:58 AM</td>
                    <td>
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                        Ended
                      </span>
                    </td>
                    <td>09:51</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-Time Alerts */}
          <div className="bg-white rounded-lg shadow-md border">
            <div className="bg-gray-100 px-4 py-3 font-medium text-sm border-b">
              Real-Time Alerts
            </div>

            <div className="p-6 text-sm text-gray-700 space-y-4">
              <div className="flex justify-between border-b pb-3">
                <span>12:36 PM</span>
                <span>Suspicious Keyword Detected</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span>12:30 PM</span>
                <span>Contraband Mentioned in Call</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span>12:24 PM</span>
                <span>Threatening Language Alert</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span>12:15 PM</span>
                <span>Unauthorized 3rd Party Detected</span>
              </div>

              <div className="flex justify-between">
                <span>12:10 PM</span>
                <span>Discussion of Escape Plans</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md border">
            <div className="bg-gray-100 px-4 py-3 font-medium text-sm border-b">
              Keyword Detection Trend
            </div>
            <div className="p-10 text-center text-gray-400">Chart Area</div>
          </div>

          <div className="bg-white rounded-lg shadow-md border">
            <div className="bg-gray-100 px-4 py-3 font-medium text-sm border-b">
              Alert Types Over Time
            </div>
            <div className="p-10 text-center text-gray-400">Chart Area</div>
          </div>
        </div>
    </>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, LogOut, Loader2, UserPlus } from "lucide-react";
import CreateJailerModal from "./CreateJailerModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface User {
  email: string;
  role: string;
}

interface Jailer {
  name: string;
  email: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateJailer, setShowCreateJailer] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = await res.json();
        setUser(data.user);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  async function handleLogout() {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-800">
              CYBERSEC Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {user?.role === "Admin" && (
              <button
                onClick={() => setShowCreateJailer(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-gray-900 hover:bg-black rounded-lg transition font-medium shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Create Jailer
              </button>
            )}

            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {user?.email}
              </p>
              <p className="text-xs text-blue-600 font-semibold">
                {user?.role}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-10">
        {/* Page Title */}
        <h2 className="text-center text-gray-700 text-lg font-semibold mb-10">
          Operational Overview
        </h2>

        {/* Top Stat Cards */}
        <div className="grid grid-cols-4 gap-8 mb-10">
          <div className="bg-blue-600 text-white rounded-lg shadow-md p-6">
            <p className="text-sm opacity-90">Prisoners</p>
            <p className="text-3xl font-bold mt-2">1,254</p>
          </div>

          <div className="bg-green-600 text-white rounded-lg shadow-md p-6">
            <p className="text-sm opacity-90">Contacts</p>
            <p className="text-3xl font-bold mt-2">3,721</p>
          </div>

          <div className="bg-orange-500 text-white rounded-lg shadow-md p-6">
            <p className="text-sm opacity-90">Active Calls</p>
            <p className="text-3xl font-bold mt-2">15</p>
          </div>

          <div className="bg-red-500 text-white rounded-lg shadow-md p-6">
            <p className="text-sm opacity-90">Alerts</p>
            <p className="text-3xl font-bold mt-2">8</p>
          </div>
        </div>

        {/* Middle Section */}
        <div className="grid grid-cols-2 gap-8 mb-10">
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
        <div className="grid grid-cols-2 gap-8">
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
      </main>

      {/* Create Jailer Modal */}
      <CreateJailerModal
        isOpen={showCreateJailer}
        onClose={() => setShowCreateJailer(false)}
        onSuccess={(jailer: Jailer) => {
          console.log("Jailer created:", jailer);
        }}
      />
    </div>
  );
}

"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Shield,
  LogOut,
  UserPlus,
  LayoutDashboard,
  Users,
  Contact,
  PhoneCall,
  ShieldAlert,
  FileText,
  BarChart3,
  KeyRound,
} from "lucide-react";

interface SidebarProps {
  userEmail?: string;
  userRole?: string;
  onCreateJailer: () => void;
  onLogout: () => void;
  onChangePassword: () => void;
}

const navItems = [
  { key: "dashboard", label: "Main Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { key: "prisoners", label: "Prisoner Management", icon: Users, href: "/prisoner" },
  { key: "contacts", label: "Authorized Contacts", icon: Contact, href: "/contacts" },
  { key: "calls", label: "Live Call Monitoring", icon: PhoneCall, href: "/live-monitor" },
  { key: "alerts", label: "Alerts & Incidents", icon: ShieldAlert, href: "" },
  { key: "logs", label: "Call Logs", icon: FileText, href: "/calllogs" },
  { key: "analytics", label: "Analytics & Reports", icon: BarChart3, href: "/analytics" },
];

export default function Sidebar({
  userEmail,
  userRole,
  onCreateJailer,
  onLogout,
  onChangePassword,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  function isActive(item: typeof navItems[number]): boolean {
    if (item.key === "dashboard") return pathname === "/dashboard";
    if (item.href) return pathname.startsWith(item.href);
    return false;
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-white text-gray-900 flex flex-col border-r border-gray-200 z-40">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
        <Shield className="w-7 h-7 text-gray-900" />
        <span className="text-lg font-bold tracking-wide text-gray-900">
          PICS
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <button
              key={item.key}
              onClick={() => {
                if (item.href) {
                  router.push(item.href);
                }
              }}
              className={`cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-200 px-4 py-4 space-y-3">
        {/* Create Jailer (Admin only) */}
        {userRole === "Admin" && (
          <button
            onClick={onCreateJailer}
            className="cursor-pointer w-full flex items-center gap-2 px-4 py-2 text-sm text-white bg-gray-900 hover:bg-black rounded-lg transition font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Create Jailer
          </button>
        )}

        {/* User Info */}
        <div className="px-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {userEmail}
          </p>
          <p className="text-xs text-gray-500 font-semibold">{userRole}</p>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="cursor-pointer w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-gray-100 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>

        {/* Change Password */}
        <button
          onClick={onChangePassword}
          className="cursor-pointer w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
        >
          <KeyRound className="w-4 h-4" />
          Change Password
        </button>
      </div>
    </aside>
  );
}

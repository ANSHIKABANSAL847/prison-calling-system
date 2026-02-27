"use client";

import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import {
  Building2,
  Users,
  Phone,
  FileText,
  AlertTriangle,
  BarChart4,
  UserCog,
  LogOut,
  Key,
  Shield,
} from "lucide-react";

interface SidebarProps {
  userEmail?: string;
  userRole?: string;
  onCreateJailer: () => void;
  onLogout: () => void;
  onChangePassword: () => void;
}

const navItems = [
  { key: "dashboard", label: "Dashboard",           icon: Building2,   href: "/dashboard" },
  { key: "prisoners", label: "Prisoner Records",    icon: Users,       href: "/prisoner" },
  { key: "contacts",  label: "Authorised Contacts", icon: UserCog,     href: "/contacts" },
  { key: "calls",     label: "Call Monitoring",     icon: Phone,       href: "/live-monitor" },
  { key: "alerts",    label: "Incidents & Alerts",  icon: AlertTriangle, href: "" },
  { key: "logs",      label: "Call Logs",           icon: FileText,    href: "/calllogs" },
  { key: "analytics", label: "Reports & Analytics", icon: BarChart4,   href: "/analytics" },
];

export default function Sidebar({
  userEmail,
  userRole,
  onCreateJailer,
  onLogout,
  onChangePassword,
}: SidebarProps) {
  const router   = useRouter();
  const pathname = usePathname();

  function isActive(item: typeof navItems[number]): boolean {
    if (item.key === "dashboard") return pathname === "/dashboard";
    if (item.href) return pathname.startsWith(item.href);
    return false;
  }

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-72 flex flex-col z-40"
      style={{ background: "#0B1F4B", borderRight: "3px solid #C9A227" }}
    >
      {/* â•â•â• Gold top accent â•â•â• */}
      <div style={{ height: 4, background: "linear-gradient(to right, #C9A227, #e8c84a, #C9A227)" }} />

      {/* â•â•â• Govt Header*/}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(201,162,39,0.35)" }}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <Image
              src="/haryana-prisons-logo.jpeg"
              alt="Haryana Prisons"
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
          <div>
            <p className="text-white text-xs font-bold uppercase tracking-widest leading-tight">
              Government of Haryana
            </p>
            <p style={{ color: "#C9A227" }} className="text-xs font-semibold uppercase tracking-wide leading-tight mt-0.5">
              Department of Prisons
            </p>
            <p className="text-white/50 text-[10px] mt-0.5 leading-tight">
              Prison Call Monitoring System
            </p>
          </div>
        </div>
      </div>

      {/* â•â•â• Navigation â•â•â• */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {/* Section label */}
        <p className="px-5 pt-1 pb-2 text-[9px] font-bold tracking-[0.15em] uppercase"
          style={{ color: "rgba(201,162,39,0.6)" }}>
          Main Navigation
        </p>

        {navItems.map((item) => {
          const Icon   = item.icon;
          const active = isActive(item);

          return (
            <button
              key={item.key}
              onClick={() => item.href && router.push(item.href)}
              className="w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all"
              style={
                active
                  ? {
                      background: "rgba(201,162,39,0.18)",
                      borderLeft: "3px solid #C9A227",
                      color: "#F5E6A8",
                      fontWeight: 600,
                    }
                  : {
                      borderLeft: "3px solid transparent",
                      color: "rgba(255,255,255,0.72)",
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = "";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(255,255,255,0.72)";
                }
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-[13px] tracking-wide">{item.label}</span>
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: "#C9A227" }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* â•â•â• Security badge strip â•â•â• */}
      <div
        className="mx-4 mb-3 px-3 py-2 rounded text-center"
        style={{ background: "rgba(122,0,0,0.55)", border: "1px solid rgba(122,0,0,0.9)" }}
      >
        <div className="flex items-center justify-center gap-1.5">
          <Shield className="w-3 h-3 text-red-300" />
          <span className="text-red-200 text-[10px] font-bold tracking-widest uppercase">
            Restricted Access Only
          </span>
        </div>
      </div>

      {/* â•â•â• Bottom user section â•â•â• */}
      <div
        className="px-5 py-4 space-y-2"
        style={{ borderTop: "1px solid rgba(201,162,39,0.35)" }}
      >
        {/* User info */}
        <div className="flex items-center gap-2 pb-2"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold uppercase"
            style={{ background: "#C9A227", color: "#0B1F4B" }}
          >
            {userEmail?.[0] ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{userEmail}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "#C9A227" }}>
              {userRole}
            </p>
          </div>
        </div>

        {userRole === "Admin" && (
          <button
            onClick={onCreateJailer}
            className="w-full py-1.5 text-xs font-semibold uppercase tracking-wide transition"
            style={{
              border: "1px solid #C9A227",
              color:  "#C9A227",
              borderRadius: 3,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#C9A227";
              (e.currentTarget as HTMLButtonElement).style.color = "#0B1F4B";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "";
              (e.currentTarget as HTMLButtonElement).style.color = "#C9A227";
            }}
          >
            + Create Jailer
          </button>
        )}

        {/* Action links */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs transition"
            style={{ color: "rgba(255,255,255,0.6)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#f87171")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)")}
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
          <button
            onClick={onChangePassword}
            className="flex items-center gap-1.5 text-xs transition"
            style={{ color: "rgba(255,255,255,0.6)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#C9A227")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)")}
          >
            <Key className="w-3.5 h-3.5" />
            Change Password
          </button>
        </div>
      </div>

      {/* â•â•â• Footer stamp â•â•â• */}
      <div
        className="px-5 py-2 text-center"
        style={{ background: "rgba(0,0,0,0.3)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-[9px] uppercase tracking-widest font-semibold"
          style={{ color: "rgba(201,162,39,0.5)" }}>
          Â© Haryana Prison Authority
        </p>
      </div>
    </aside>
  );
}


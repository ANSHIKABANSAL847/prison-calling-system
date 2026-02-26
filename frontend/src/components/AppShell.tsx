"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Sidebar from "./Sidebar";
import CreateJailerModal from "@/app/dashboard/CreateJailerModal";
import ForgotPasswordModal from "./ForgotPasswordModal";

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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateJailer, setShowCreateJailer] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

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
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar
        userEmail={user?.email}
        userRole={user?.role}
        onCreateJailer={() => setShowCreateJailer(true)}
        onLogout={handleLogout}
        onChangePassword={() => setShowChangePassword(true)}
      />

      <main className="ml-64 flex-1 p-10">{children}</main>

      <CreateJailerModal
        isOpen={showCreateJailer}
        onClose={() => setShowCreateJailer(false)}
        onSuccess={(jailer: Jailer) => {
          console.log("Jailer created:", jailer);
        }}
      />

      <ForgotPasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        prefillEmail={user?.email}
      />
    </div>
  );
}

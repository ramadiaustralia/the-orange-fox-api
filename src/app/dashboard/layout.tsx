"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = await res.json();
        if (!data.authenticated) {
          router.replace("/login");
          return;
        }
        setAdminName(data.admin.display_name || data.admin.username || "Admin");
        setReady(true);
      } catch {
        router.replace("/login");
      }
    }
    checkAuth();
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f2ef]">
        <div className="animate-pulse-orange w-4 h-4 rounded-full bg-[#D4692A]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f5f2ef]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <div className="sticky top-0 h-screen">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </div>
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <Sidebar collapsed={false} onToggle={() => {}} mobile onClose={() => setMobileOpen(false)} />
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar adminName={adminName} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

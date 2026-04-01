"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getCookie("fox_admin_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    const payload = parseJwt(token);
    if (!payload) {
      router.replace("/login");
      return;
    }
    setAdminName(payload.display_name || payload.username || "Admin");
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="animate-pulse-orange w-4 h-4 rounded-full bg-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark flex">
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
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

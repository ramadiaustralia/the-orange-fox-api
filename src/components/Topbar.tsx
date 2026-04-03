"use client";
import { useRouter, usePathname } from "next/navigation";
import { Menu, LogOut, Bell } from "lucide-react";

interface TopbarProps {
  adminName: string;
  onMenuClick: () => void;
}

const pageMeta: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "Overview and quick access" },
  "/dashboard/content": { title: "Content Editor", description: "Edit website content" },
  "/dashboard/pricing": { title: "Pricing", description: "Manage packages and pricing" },
  "/dashboard/shop": { title: "Shop", description: "Manage your products" },
  "/dashboard/orders": { title: "Orders", description: "Track and manage orders" },
  "/dashboard/tech-stack": { title: "Tech Stack", description: "Manage technologies" },
  "/dashboard/menus": { title: "Menus", description: "Configure navigation" },
  "/dashboard/messages": { title: "Messages", description: "Customer inquiries" },
  "/dashboard/contact": { title: "Contact", description: "Contact details" },
  "/dashboard/seo": { title: "SEO & Analytics", description: "Search optimisation" },
  "/dashboard/settings": { title: "Settings", description: "System configuration" },
};

export default function Topbar({ adminName, onMenuClick }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  const current = pageMeta[pathname] || {
    title: pathname.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Dashboard",
    description: "",
  };

  return (
    <header className="h-16 bg-white border-b border-[#e8e4e0] flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
      {/* Left Side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-[#f5f2ef] text-[#999999] hover:text-[#1a1a1a] transition-all"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:block">
          <h2
            className="text-sm font-semibold text-[#1a1a1a]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {current.title}
          </h2>
          <p className="text-xs text-[#999999]">{current.description}</p>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-xl hover:bg-[#f5f2ef] text-[#999999] hover:text-[#1a1a1a] transition-all">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D4692A]" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-[#e8e4e0]">
          <div className="w-8 h-8 rounded-xl bg-[#D4692A]/10 flex items-center justify-center text-[#D4692A] text-xs font-bold">
            {adminName?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <span className="hidden sm:block text-sm font-medium text-[#1a1a1a]">{adminName}</span>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-red-500/10 text-[#999999] hover:text-red-400 transition-all"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

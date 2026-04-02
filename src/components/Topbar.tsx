"use client";
import { useRouter } from "next/navigation";
import { Menu, LogOut, Bell, Search } from "lucide-react";

interface TopbarProps {
  adminName: string;
  onMenuClick: () => void;
}

export default function Topbar({ adminName, onMenuClick }: TopbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
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
          <h2 className="font-heading text-sm font-semibold text-[#1a1a1a]">Welcome back</h2>
          <p className="text-xs text-[#999999]">Manage your website content</p>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="hidden md:flex items-center gap-2 bg-[#fafafa] border border-[#f0ece8] rounded-xl px-4 py-2 text-sm">
          <Search size={15} className="text-[#999999]" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent outline-none text-[#1a1a1a] placeholder:text-[#999999] w-40 lg:w-52"
          />
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-xl hover:bg-[#f5f2ef] text-[#999999] hover:text-[#1a1a1a] transition-all">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D4692A]" />
        </button>

        {/* User Area */}
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

"use client";
import { useRouter } from "next/navigation";
import { Menu, LogOut, Bell } from "lucide-react";

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
    <header className="h-16 bg-dark-400/80 backdrop-blur-xl border-b border-dark-50/50 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-dark-200 text-gray-400 hover:text-white transition-all"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-sm font-semibold text-white">Welcome back</h2>
          <p className="text-xs text-gray-500">Manage your website content</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-xl hover:bg-dark-200 text-gray-400 hover:text-white transition-all">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-dark-50/50">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange to-orange-700 flex items-center justify-center text-white text-xs font-bold shadow shadow-orange/20">
            {adminName?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <span className="hidden sm:block text-sm font-medium text-white">{adminName}</span>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

"use client";
import { useRouter, usePathname } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import type { UserProfile } from "@/context/AuthContext";
import NotificationDropdown from "@/components/NotificationDropdown";
import MessagingDropdown from "@/components/MessagingDropdown";

interface TopbarProps {
  user: UserProfile | null;
  onMenuClick: () => void;
}

const pageMeta: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Home", description: "Team timeline & updates" },
  "/dashboard/content": { title: "Content Editor", description: "Edit website content" },
  "/dashboard/pricing": { title: "Pricing", description: "Manage packages and pricing" },
  "/dashboard/shop": { title: "Shop", description: "Manage your products" },
  "/dashboard/orders": { title: "Orders", description: "Track and manage orders" },
  "/dashboard/tech-stack": { title: "Tech Stack", description: "Manage technologies" },
  "/dashboard/menus": { title: "Menus", description: "Configure navigation" },
  "/dashboard/messages": { title: "Customer Project Request", description: "Manage customer project requests" },
  "/dashboard/contact": { title: "Contact", description: "Contact details" },
  "/dashboard/seo": { title: "SEO & Analytics", description: "Search optimisation" },
  "/dashboard/settings": { title: "Settings", description: "System configuration" },
};

export default function Topbar({ user, onMenuClick }: TopbarProps) {
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

  const displayName = user?.display_name || "Admin";
  const initial = displayName.charAt(0).toUpperCase();

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
      <div className="flex items-center gap-2">
        {/* Notifications */}
        {user && <NotificationDropdown currentUserId={user.id} />}

        {/* Messaging */}
        {user && <MessagingDropdown currentUser={user} />}

        {/* Divider */}
        <div className="w-px h-6 bg-[#e8e4e0] mx-1" />

        {/* User Avatar → Profile */}
        <button
          onClick={() => router.push("/dashboard/profile")}
          className="rounded-full overflow-hidden hover:ring-2 hover:ring-[#D4692A]/30 transition-all"
          title={displayName}
        >
          {user?.profile_pic_url ? (
            <img
              src={user.profile_pic_url}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#D4692A]/10 flex items-center justify-center text-[#D4692A] text-xs font-bold">
              {initial}
            </div>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl hover:bg-red-500/10 text-[#999999] hover:text-red-400 transition-all"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

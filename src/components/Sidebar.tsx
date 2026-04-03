"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileEdit,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ChevronLeft,
  X,
  DollarSign,
  Layers,
  LogOut,
  ShoppingBag,
  Package,
  Contact2,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onClose?: () => void;
}

const navSections = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { href: "/dashboard/content", label: "Content Editor", icon: FileEdit },
      { href: "/dashboard/menus", label: "Menus", icon: Menu },
      { href: "/dashboard/tech-stack", label: "Tech Stack", icon: Layers },
    ],
  },
  {
    label: "COMMERCE",
    items: [
      { href: "/dashboard/pricing", label: "Pricing", icon: DollarSign },
      { href: "/dashboard/shop", label: "Shop", icon: ShoppingBag },
      { href: "/dashboard/orders", label: "Orders", icon: Package },
    ],
  },
  {
    label: "COMMUNICATE",
    items: [
      { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
      { href: "/dashboard/contact", label: "Contact", icon: Contact2 },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { href: "/dashboard/seo", label: "SEO & Analytics", icon: Search },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle, mobile, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  const content = (
    <div className={`flex flex-col h-full bg-[#1c1c1c] border-r border-white/[0.06] ${collapsed && !mobile ? 'w-[72px]' : 'w-64'} transition-all duration-300`}>
      {/* Logo Area */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.06]">
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none">🦊</span>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-white text-sm tracking-wide">The Orange Fox</span>
              <span className="bg-[#D4692A]/15 text-[#D4692A] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">CMS</span>
            </div>
          </div>
        )}
        {collapsed && !mobile && (
          <span className="text-2xl mx-auto leading-none">🦊</span>
        )}
        {mobile && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {navSections.map((section, sectionIndex) => (
          <div key={section.label || "overview"}>
            {/* Section label or divider */}
            {section.label && (
              <>
                {collapsed && !mobile ? (
                  <div className="my-2 border-t border-white/[0.06]" />
                ) : (
                  <div className={`text-[10px] uppercase tracking-wider text-white/25 font-medium px-4 mb-1 ${sectionIndex === 0 ? 'mt-0' : 'mt-4'}`}>
                    {section.label}
                  </div>
                )}
              </>
            )}

            {/* Nav items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={mobile ? onClose : undefined}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                      active
                        ? "bg-[#D4692A]/10 text-[#D4692A] font-medium"
                        : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                    }`}
                  >
                    <Icon size={18} className={`w-[18px] h-[18px] flex-shrink-0 ${active ? "text-[#D4692A]" : "text-white/40 group-hover:text-white"}`} />
                    {(!collapsed || mobile) && <span className="font-heading">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Area */}
      <div className="px-5 py-4 border-t border-white/[0.06]">
        {/* Version */}
        {!collapsed && (
          <div className="text-center mb-3">
            <span className="text-[10px] text-white/20 font-mono">v2.0</span>
          </div>
        )}

        {/* Collapse Button (desktop only) */}
        {!mobile && (
          <button
            onClick={onToggle}
            className="flex items-center justify-center w-full p-2 mb-3 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
          >
            <ChevronLeft size={18} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span className="ml-2 text-sm">Collapse</span>}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors text-sm"
        >
          <LogOut size={16} className="flex-shrink-0" />
          {(!collapsed || mobile) && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-50 animate-slide-in">{content}</div>
      </div>
    );
  }

  return content;
}

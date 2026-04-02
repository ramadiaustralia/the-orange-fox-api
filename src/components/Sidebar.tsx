"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onClose?: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/content", label: "Content", icon: FileEdit },
  { href: "/dashboard/pricing", label: "Pricing", icon: DollarSign },
  { href: "/dashboard/tech-stack", label: "Tech Stack", icon: Layers },
  { href: "/dashboard/menus", label: "Menus", icon: Menu },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/seo", label: "SEO & Analytics", icon: Search },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ collapsed, onToggle, mobile, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const content = (
    <div className={`flex flex-col h-full bg-dark-400 border-r border-dark-50/50 ${collapsed && !mobile ? 'w-[72px]' : 'w-64'} transition-all duration-300`}>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-dark-50/50">
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange to-orange-700 flex items-center justify-center shadow-lg shadow-orange/20 text-lg">
              🦊
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-wide">THE ORANGE FOX</span>
              <span className="block text-[10px] text-gray-500 -mt-0.5">CMS Dashboard</span>
            </div>
          </div>
        )}
        {collapsed && !mobile && (
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-orange to-orange-700 flex items-center justify-center shadow-lg shadow-orange/20 text-lg">
            🦊
          </div>
        )}
        {mobile && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-dark-200 text-gray-400">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={mobile ? onClose : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                active
                  ? "bg-orange/10 text-orange border border-orange/20"
                  : "text-gray-400 hover:text-white hover:bg-dark-200 border border-transparent"
              }`}
            >
              <Icon size={18} className={active ? "text-orange" : "text-gray-500 group-hover:text-white"} />
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Version + Collapse button (desktop only) */}
      {!mobile && (
        <div className="p-3 border-t border-dark-50/50">
          {!collapsed && (
            <div className="text-center mb-2">
              <span className="text-[10px] text-gray-600 font-mono">v2.0</span>
            </div>
          )}
          <button
            onClick={onToggle}
            className="flex items-center justify-center w-full p-2 rounded-xl text-gray-500 hover:text-white hover:bg-dark-200 transition-all"
          >
            <ChevronLeft size={18} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span className="ml-2 text-sm">Collapse</span>}
          </button>
        </div>
      )}
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

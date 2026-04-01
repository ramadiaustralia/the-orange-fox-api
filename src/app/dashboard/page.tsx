"use client";
import { useEffect, useState } from "react";
import { FileEdit, Menu, MessageSquare, Search, ArrowUpRight, Clock } from "lucide-react";

interface Stats {
  pages: number;
  contentItems: number;
  messages: number;
  unreadMessages: number;
  menuItems: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ pages: 8, contentItems: 0, messages: 0, unreadMessages: 0, menuItems: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [contentRes, messagesRes, menusRes] = await Promise.all([
          fetch("/api/content"),
          fetch("/api/messages"),
          fetch("/api/menus"),
        ]);
        const content = await contentRes.json();
        const messages = await messagesRes.json();
        const menus = await menusRes.json();

        setStats({
          pages: 8,
          contentItems: content.data?.length || 0,
          messages: messages.data?.length || 0,
          unreadMessages: messages.data?.filter((m: { status: string }) => m.status === "unread")?.length || 0,
          menuItems: menus.data?.length || 0,
        });
      } catch (e) {
        console.error("Failed to load stats", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = [
    { label: "Total Pages", value: stats.pages, icon: FileEdit, color: "from-orange to-orange-700", desc: "Website pages managed" },
    { label: "Content Items", value: stats.contentItems, icon: FileEdit, color: "from-blue-500 to-blue-700", desc: "Across all pages" },
    { label: "Messages", value: stats.messages, icon: MessageSquare, color: "from-emerald-500 to-emerald-700", desc: `${stats.unreadMessages} unread` },
    { label: "Menu Items", value: stats.menuItems, icon: Menu, color: "from-purple-500 to-purple-700", desc: "Navigation links" },
  ];

  const quickActions = [
    { label: "Edit Content", href: "/dashboard/content", icon: FileEdit },
    { label: "Manage Menus", href: "/dashboard/menus", icon: Menu },
    { label: "View Messages", href: "/dashboard/messages", icon: MessageSquare },
    { label: "SEO Settings", href: "/dashboard/seo", icon: Search },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your website management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-dark-400 border border-dark-50/50 rounded-2xl p-5 hover:border-dark-50 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                  <Icon size={18} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {loading ? <span className="inline-block w-10 h-7 bg-dark-200 rounded animate-pulse" /> : card.value}
              </div>
              <div className="text-sm font-medium text-gray-400">{card.label}</div>
              <div className="text-xs text-gray-600 mt-1">{card.desc}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-dark-400 border border-dark-50/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 p-4 rounded-xl bg-dark-200 border border-dark-50/30 hover:border-orange/30 hover:bg-orange/5 transition-all duration-200 group"
                >
                  <Icon size={18} className="text-gray-500 group-hover:text-orange transition-colors" />
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{action.label}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Activity */}
        <div className="bg-dark-400 border border-dark-50/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { action: "Dashboard accessed", time: "Just now" },
              { action: "CMS system initialized", time: "System" },
              { action: "Ready for content management", time: "System" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-dark-200/50">
                <div className="w-8 h-8 rounded-lg bg-dark-200 flex items-center justify-center">
                  <Clock size={14} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{item.action}</p>
                  <p className="text-xs text-gray-600">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

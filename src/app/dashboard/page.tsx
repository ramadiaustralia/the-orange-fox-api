"use client";
import { useEffect, useState } from "react";
import { FileEdit, Menu, MessageSquare, Search, ArrowUpRight, ExternalLink, Zap, BarChart3 } from "lucide-react";

interface Stats {
  pages: number;
  contentItems: number;
  messages: number;
  unreadMessages: number;
  menuItems: number;
}

interface ContentItem {
  id: string;
  page: string;
  section: string;
  content_key: string;
  content_value: string;
  locale: string;
  updated_at: string;
  updated_by: string;
}

const PAGES = ["home", "about", "services", "process", "pricing", "contact", "faq", "global"];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    pages: 8,
    contentItems: 0,
    messages: 0,
    unreadMessages: 0,
    menuItems: 0,
  });
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});
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

        const allItems: ContentItem[] = content.data || [];

        // Count items per page
        const counts: Record<string, number> = {};
        PAGES.forEach((p) => {
          counts[p] = allItems.filter((item) => item.page === p).length;
        });
        setPageCounts(counts);

        setStats({
          pages: 8,
          contentItems: allItems.length,
          messages: messages.data?.length || 0,
          unreadMessages:
            messages.data?.filter((m: { status: string }) => m.status === "unread")?.length || 0,
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
    {
      label: "Total Pages",
      value: stats.pages,
      icon: FileEdit,
      color: "from-orange to-orange-700",
      desc: "Website pages managed",
    },
    {
      label: "Content Items",
      value: stats.contentItems,
      icon: FileEdit,
      color: "from-blue-500 to-blue-700",
      desc: "Across all pages",
    },
    {
      label: "Messages",
      value: stats.messages,
      icon: MessageSquare,
      color: "from-emerald-500 to-emerald-700",
      desc: `${stats.unreadMessages} unread`,
    },
    {
      label: "Menu Items",
      value: stats.menuItems,
      icon: Menu,
      color: "from-purple-500 to-purple-700",
      desc: "Navigation links",
    },
  ];

  const quickActions = [
    { label: "Edit Content", href: "/dashboard/content", icon: FileEdit },
    { label: "Manage Menus", href: "/dashboard/menus", icon: Menu },
    { label: "View Messages", href: "/dashboard/messages", icon: MessageSquare },
    { label: "SEO Settings", href: "/dashboard/seo", icon: Search },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your website management</p>
        </div>
        <a
          href="https://the-orange-fox-web.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-orange/10 border border-orange/20 text-orange hover:bg-orange/20 transition-all"
        >
          <ExternalLink size={14} />
          View Live Website
        </a>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-dark-400 border border-dark-50/50 rounded-2xl p-5 hover:border-dark-50 transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}
                >
                  <Icon size={18} className="text-white" />
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-gray-600 group-hover:text-gray-400 transition-colors"
                />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {loading ? (
                  <span className="inline-block w-10 h-7 bg-dark-200 rounded animate-pulse" />
                ) : (
                  card.value
                )}
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
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-orange" />
            <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 p-4 rounded-xl bg-dark-200 border border-dark-50/30 hover:border-orange/30 hover:bg-orange/5 transition-all duration-200 group"
                >
                  <Icon
                    size={18}
                    className="text-gray-500 group-hover:text-orange transition-colors"
                  />
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                    {action.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Content Coverage */}
        <div className="bg-dark-400 border border-dark-50/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-orange" />
            <h3 className="text-lg font-semibold text-white">Content Coverage</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-dark-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {PAGES.map((p) => {
                const count = pageCounts[p] || 0;
                const maxCount = Math.max(...Object.values(pageCounts), 1);
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={p} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <a
                        href={`/dashboard/content`}
                        className="text-sm text-gray-400 capitalize group-hover:text-orange transition-colors"
                      >
                        {p}
                      </a>
                      <span className="text-xs text-gray-500 font-mono">{count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-dark-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange to-orange-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-dark-50/30 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Total content items</span>
                  <span className="text-sm font-semibold text-white">{stats.contentItems}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import {
  FileEdit,
  Menu,
  MessageSquare,
  Search,
  ArrowUpRight,
  ExternalLink,
  Zap,
  BarChart3,
  DollarSign,
  Layers,
  Globe,
  TrendingUp,
} from "lucide-react";

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

interface SeoScore {
  title: string;
  description: string;
  keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
  robots: string;
  canonical_url: string;
  schema_markup: string;
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
  const [seoScore, setSeoScore] = useState<number | null>(null);

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

        // Fetch SEO score for home
        try {
          const seoRes = await fetch("/api/seo?page=home");
          const seoJson = await seoRes.json();
          if (seoJson.data) {
            const d = seoJson.data as SeoScore;
            let score = 0;
            if ((d.title ?? "").length >= 30) score += 15;
            if ((d.description ?? "").length >= 100) score += 15;
            if ((d.keywords ?? "").length > 0) score += 15;
            if ((d.og_title ?? "").length > 0) score += 15;
            if ((d.og_description ?? "").length > 0) score += 10;
            if ((d.og_image ?? "").length > 0) score += 10;
            if ((d.robots ?? "").length > 0) score += 10;
            if ((d.canonical_url ?? "").length > 0) score += 10;
            setSeoScore(Math.min(score, 100));
          }
        } catch {
          // SEO score optional
        }
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
    { label: "Edit Pricing", href: "/dashboard/pricing", icon: DollarSign },
    { label: "Manage Tech Stack", href: "/dashboard/tech-stack", icon: Layers },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 flex items-center gap-2">
            Welcome to the Den <span className="text-3xl">🦊</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your website content, SEO, and more from your CMS dashboard
          </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-enter">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-5 hover:border-gray-200 transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}
                >
                  <Icon size={18} className="text-white" />
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-gray-600 group-hover:text-gray-500 transition-colors"
                />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {loading ? (
                  <span className="inline-block w-10 h-7 bg-gray-50 rounded animate-pulse" />
                ) : (
                  card.value
                )}
              </div>
              <div className="font-heading text-sm font-medium text-gray-500">{card.label}</div>
              <div className="text-xs text-gray-600 mt-1">{card.desc}</div>
            </div>
          );
        })}
      </div>

      {/* SEO Score Overview + Live Website Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SEO Score Card */}
        <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-6 ">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-orange" />
            <h3 className="font-heading text-lg font-semibold text-gray-900">SEO Score — Home</h3>
          </div>
          {loading || seoScore === null ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-20 h-20 bg-gray-50 rounded-full animate-pulse" />
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative inline-flex items-center justify-center w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" stroke="#222" strokeWidth="8" fill="none" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke={seoScore >= 80 ? "#10b981" : seoScore >= 50 ? "#eab308" : "#ef4444"}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${seoScore * 3.27} 327`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className={`absolute text-2xl font-bold ${seoScore >= 80 ? "text-emerald-400" : seoScore >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                  {seoScore}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {seoScore >= 80 ? "Your homepage SEO is looking great!" : seoScore >= 50 ? "Room for improvement — check your meta tags." : "Your homepage needs SEO attention."}
                </p>
                <a
                  href="/dashboard/seo"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-orange hover:text-orange-400 transition-colors"
                >
                  View full SEO settings <ArrowUpRight size={12} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Live Website Preview Card */}
        <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-6 ">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-orange" />
            <h3 className="font-heading text-lg font-semibold text-gray-900">Live Website</h3>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex flex-col items-center justify-center gap-3 min-h-[120px]">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange to-orange-700 flex items-center justify-center text-2xl shadow-lg shadow-orange/20">
              🦊
            </div>
            <p className="text-sm text-gray-500 text-center">the-orange-fox-web.vercel.app</p>
            <a
              href="https://the-orange-fox-web.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-orange/10 border border-orange/20 text-orange hover:bg-orange/20 transition-all"
            >
              <ExternalLink size={14} />
              Open Website
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-orange" />
            <h3 className="font-heading text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 stagger-enter">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-orange/30 hover:bg-orange/5 transition-all duration-200 group"
                >
                  <Icon
                    size={18}
                    className="text-gray-500 group-hover:text-orange transition-colors"
                  />
                  <span className="text-sm font-medium text-gray-500 group-hover:text-gray-900 transition-colors">
                    {action.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Content Coverage */}
        <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-orange" />
            <h3 className="font-heading text-lg font-semibold text-gray-900">Content Coverage</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-gray-50 rounded-lg animate-pulse" />
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
                        className="text-sm text-gray-500 capitalize group-hover:text-orange transition-colors"
                      >
                        {p}
                      </a>
                      <span className="text-xs text-gray-500 font-mono">{count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange to-orange-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-gray-100 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Total content items</span>
                  <span className="text-sm font-semibold text-gray-900">{stats.contentItems}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

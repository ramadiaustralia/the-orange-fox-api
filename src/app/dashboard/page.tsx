'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  FileEdit,
  Menu,
  MessageSquare,
  Search,
  ExternalLink,
  Zap,
  BarChart3,
  DollarSign,
  Layers,
  Globe,
  TrendingUp,
  Package,
  ArrowRight,
  Clock,
  Eye,
} from 'lucide-react';

/* ── types ── */
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

const PAGES = ['home', 'about', 'services', 'process', 'pricing', 'contact', 'faq', 'global'];

/* ── Scroll reveal hook ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

/* ── Animated counter ── */
function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return <>{display}</>;
}

/* ── greeting ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── page ── */
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    pages: 8, contentItems: 0, messages: 0, unreadMessages: 0, menuItems: 0,
  });
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [seoScore, setSeoScore] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [contentRes, messagesRes, menusRes] = await Promise.all([
          fetch('/api/content'),
          fetch('/api/messages'),
          fetch('/api/menus'),
        ]);
        const content = await contentRes.json();
        const messages = await messagesRes.json();
        const menus = await menusRes.json();

        const allItems: ContentItem[] = content.data || [];
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
            messages.data?.filter((m: { status: string }) => m.status === 'unread')?.length || 0,
          menuItems: menus.data?.length || 0,
        });

        try {
          const seoRes = await fetch('/api/seo?page=home');
          const seoJson = await seoRes.json();
          if (seoJson.data) {
            const d = seoJson.data as SeoScore;
            let score = 0;
            if ((d.title ?? '').length >= 30) score += 15;
            if ((d.description ?? '').length >= 100) score += 15;
            if ((d.keywords ?? '').length > 0) score += 15;
            if ((d.og_title ?? '').length > 0) score += 15;
            if ((d.og_description ?? '').length > 0) score += 10;
            if ((d.og_image ?? '').length > 0) score += 10;
            if ((d.robots ?? '').length > 0) score += 10;
            if ((d.canonical_url ?? '').length > 0) score += 10;
            setSeoScore(Math.min(score, 100));
          }
        } catch { /* optional */ }
      } catch (e) {
        console.error('Failed to load stats', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { label: 'Pages', value: stats.pages, icon: FileEdit, accent: 'from-orange-500/20 to-orange-500/5', href: '/dashboard/content' },
    { label: 'Content Items', value: stats.contentItems, icon: Layers, accent: 'from-blue-500/20 to-blue-500/5', href: '/dashboard/content' },
    { label: 'Messages', value: stats.messages, icon: MessageSquare, accent: 'from-emerald-500/20 to-emerald-500/5', badge: stats.unreadMessages > 0 ? `${stats.unreadMessages} new` : undefined, href: '/dashboard/messages' },
    { label: 'Menu Items', value: stats.menuItems, icon: Menu, accent: 'from-purple-500/20 to-purple-500/5', href: '/dashboard/menus' },
  ];

  const quickActions = [
    { label: 'Edit Content', desc: 'Update pages & sections', href: '/dashboard/content', icon: FileEdit },
    { label: 'Manage Menus', desc: 'Edit site navigation', href: '/dashboard/menus', icon: Menu },
    { label: 'Messages', desc: 'View contact inquiries', href: '/dashboard/messages', icon: MessageSquare },
    { label: 'SEO Settings', desc: 'Optimize search rankings', href: '/dashboard/seo', icon: Search },
    { label: 'Pricing', desc: 'Update pricing tables', href: '/dashboard/pricing', icon: DollarSign },
    { label: 'Orders', desc: 'Track customer purchases', href: '/dashboard/orders', icon: Package },
    { label: 'Tech Stack', desc: 'Manage technologies', href: '/dashboard/tech-stack', icon: Layers },
    { label: 'View Website', desc: 'See live site', href: 'https://the-orange-fox-web.vercel.app', icon: Globe, external: true },
  ];

  return (
    <div className="space-y-8 relative">
      {/* Subtle background orbs like the real website */}
      <div className="fixed top-20 right-10 w-[400px] h-[400px] rounded-full pointer-events-none opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(212,105,42,0.4) 0%, transparent 70%)', animation: 'orbFloat 40s ease-in-out infinite' }} />
      <div className="fixed bottom-20 left-10 w-[300px] h-[300px] rounded-full pointer-events-none opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(212,105,42,0.3) 0%, transparent 70%)', animation: 'orbFloat 30s ease-in-out infinite reverse' }} />

      {/* ─── Hero Header ─── */}
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#141414] via-[#1a1a1a] to-[#222222] p-8 lg:p-10">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-10" style={{ background: 'radial-gradient(circle, rgba(212,105,42,0.5) 0%, transparent 70%)', animation: 'orbFloat 25s ease-in-out infinite' }} />
          <div className="absolute top-4 right-4 w-12 h-12 pointer-events-none opacity-10 border-r border-t border-orange/40" style={{ animation: 'heroCornerPulse 7s ease-in-out infinite' }} />
          <div className="absolute bottom-4 left-4 w-12 h-12 pointer-events-none opacity-10 border-l border-b border-orange/40" style={{ animation: 'heroCornerPulse 7s ease-in-out infinite 3.5s' }} />

          <div className="relative z-10 flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="The Orange Fox"
                  width={56}
                  height={56}
                  className="rounded-xl"
                  style={{ animation: 'heroFloat 7s ease-in-out infinite' }}
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#141414]" style={{ animation: 'pulse-orange 2s infinite' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-[1.5px] bg-orange" />
                  <span className="text-[0.6rem] uppercase tracking-[3px] text-white/40 font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                    Admin Dashboard
                  </span>
                </div>
                <h1 className="text-xl lg:text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                  {getGreeting()}
                </h1>
                <p className="text-sm text-white/40 mt-0.5 flex items-center gap-1.5">
                  <Clock size={12} />
                  {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <a
              href="https://the-orange-fox-web.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-orange text-white rounded-xl font-semibold text-sm tracking-wider uppercase overflow-hidden transition-all duration-300 hover:bg-orange-600 hover:-translate-y-0.5 hover:shadow-[0_4px_24px_rgba(212,105,42,0.4)]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Eye size={16} className="relative" />
              <span className="relative">View Live Site</span>
            </a>
          </div>
        </div>
      </Reveal>

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-enter">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Reveal key={card.label} delay={i * 0.08}>
              <a
                href={card.href}
                className="group block relative bg-white rounded-2xl border border-border-light p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(212,105,42,0.08)] hover:border-orange/20 overflow-hidden"
              >
                {/* Gradient accent top bar */}
                <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-[#f5f2ef] flex items-center justify-center text-orange group-hover:bg-orange/10 transition-colors duration-300">
                    <Icon size={20} strokeWidth={1.8} />
                  </div>
                  {card.badge && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange/10 text-orange text-[0.65rem] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse-orange" />
                      {card.badge}
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold text-text-primary mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                  {loading ? (
                    <span className="inline-block w-12 h-8 bg-light-bg rounded-lg animate-pulse" />
                  ) : (
                    <AnimatedNumber value={card.value} />
                  )}
                </div>
                <div className="text-xs text-text-muted uppercase tracking-wider font-medium" style={{ fontFamily: 'var(--font-heading)' }}>
                  {card.label}
                </div>
                {/* Hover arrow */}
                <ArrowRight size={14} className="absolute bottom-5 right-5 text-orange opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </a>
            </Reveal>
          );
        })}
      </div>

      {/* ─── Quick Actions + SEO Score ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions — takes 2 cols */}
        <Reveal className="lg:col-span-2" delay={0.1}>
          <div className="bg-white rounded-2xl border border-border-light p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-5 h-[1.5px] bg-orange" />
              <h3 className="text-xs uppercase tracking-[3px] text-orange font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                Quick Actions
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                const Tag = action.external ? 'a' : 'a';
                return (
                  <a
                    key={action.label}
                    href={action.href}
                    {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="group flex items-center gap-4 p-4 rounded-xl border border-transparent hover:border-border-light hover:bg-[#fafafa] transition-all duration-300"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#f5f2ef] flex items-center justify-center flex-shrink-0 group-hover:bg-orange/10 transition-colors duration-300">
                      <Icon size={18} className="text-text-muted group-hover:text-orange transition-colors duration-300" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary group-hover:text-orange transition-colors duration-200" style={{ fontFamily: 'var(--font-heading)' }}>
                        {action.label}
                      </p>
                      <p className="text-xs text-text-muted truncate">{action.desc}</p>
                    </div>
                    <ArrowRight size={14} className="text-text-muted opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex-shrink-0" />
                  </a>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* SEO Score */}
        <Reveal delay={0.2}>
          <div className="bg-white rounded-2xl border border-border-light p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] h-full flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-5 h-[1.5px] bg-orange" />
              <h3 className="text-xs uppercase tracking-[3px] text-orange font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                SEO Health
              </h3>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              {loading || seoScore === null ? (
                <div className="w-28 h-28 bg-light-bg rounded-full animate-pulse" />
              ) : (
                <>
                  <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" stroke="#f0ece8" strokeWidth="6" fill="none" />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke={seoScore >= 80 ? '#10b981' : seoScore >= 50 ? '#eab308' : '#ef4444'}
                        strokeWidth="6"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${seoScore * 3.14} 314`}
                        className="transition-all duration-[1.5s] ease-out"
                        style={{ animation: 'heroSlideUp 1s ease-out' }}
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className={`text-3xl font-bold ${seoScore >= 80 ? 'text-emerald-500' : seoScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`} style={{ fontFamily: 'var(--font-heading)' }}>
                        {seoScore}
                      </span>
                      <span className="block text-[0.6rem] text-text-muted uppercase tracking-wider">Score</span>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary text-center mb-3">
                    {seoScore >= 80
                      ? 'Looking great — your homepage is well optimised.'
                      : seoScore >= 50
                      ? 'Decent, but a few tags could be improved.'
                      : 'Some key meta tags are missing.'}
                  </p>
                  <a
                    href="/dashboard/seo"
                    className="inline-flex items-center gap-1.5 text-xs text-orange font-medium hover:text-orange-700 transition-colors group"
                  >
                    Manage SEO <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* ─── Content Coverage ─── */}
      <Reveal delay={0.1}>
        <div className="bg-white rounded-2xl border border-border-light p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-5 h-[1.5px] bg-orange" />
              <h3 className="text-xs uppercase tracking-[3px] text-orange font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                Content Coverage
              </h3>
            </div>
            {!loading && (
              <span className="text-sm text-text-secondary font-medium">
                {stats.contentItems} total items
              </span>
            )}
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-16 bg-light-bg rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PAGES.map((p, i) => {
                const count = pageCounts[p] || 0;
                const maxCount = Math.max(...Object.values(pageCounts), 1);
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <a
                    key={p}
                    href="/dashboard/content"
                    className="group relative bg-[#fafafa] rounded-xl border border-transparent hover:border-orange/20 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(212,105,42,0.06)] overflow-hidden"
                  >
                    {/* Progress bar at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border-light">
                      <div
                        className="h-full bg-gradient-to-r from-orange to-orange-400 transition-all duration-700 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-muted uppercase tracking-wider font-medium mb-1 group-hover:text-orange transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>
                      {p}
                    </p>
                    <p className="text-xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                      <AnimatedNumber value={count} duration={600 + i * 100} />
                    </p>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}

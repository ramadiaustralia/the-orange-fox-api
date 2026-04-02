"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Save,
  Sparkles,
  Search,
  AlertCircle,
  CheckCircle2,
  Globe,
  Info,
  Zap,
  Target,
  Lightbulb,
  X,
  Gauge,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronUp,
  FileCode2,
  RefreshCw,
  Copy,
} from "lucide-react";

const PAGES = ["home", "about", "services", "process", "pricing", "contact", "faq", "global"];

interface SeoData {
  id?: string;
  page: string;
  title: string;
  description: string;
  keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
  canonical_url: string;
  robots: string;
  schema_markup: string;
}

const emptySeo = (page: string): SeoData => ({
  page,
  title: "",
  description: "",
  keywords: "",
  og_title: "",
  og_description: "",
  og_image: "",
  canonical_url: "",
  robots: "index, follow",
  schema_markup: "",
});

// Page-specific SEO optimization data
const PAGE_SEO_CONTEXT: Record<string, { focus: string; keywords: string[]; titleTemplate: string; descTemplate: string; ogTitleTemplate: string; ogDescTemplate: string; tips: string[] }> = {
  home: {
    focus: "main value proposition and brand identity",
    keywords: ["premium web design", "web development agency", "digital solutions", "The Orange Fox", "UI/UX design", "custom websites"],
    titleTemplate: "The Orange Fox — Premium Web Design & Development Agency",
    descTemplate: "The Orange Fox crafts premium digital experiences. Custom web design, development, and branding solutions for businesses that demand excellence. Start your project today.",
    ogTitleTemplate: "The Orange Fox — Where Digital Excellence Meets Creative Design",
    ogDescTemplate: "Transform your online presence with The Orange Fox. Premium web design and development agency delivering exceptional digital experiences.",
    tips: [
      "Include your primary brand name in the title",
      "Highlight your unique value proposition in the first 50 characters",
      "Use action-oriented language in the description",
      "Set a high-quality hero image as OG image (1200×630px)",
    ],
  },
  about: {
    focus: "company story, team expertise, and values",
    keywords: ["about The Orange Fox", "web agency team", "company values", "digital expertise", "creative agency", "our story"],
    titleTemplate: "About Us — The Orange Fox | Our Story & Expertise",
    descTemplate: "Meet the team behind The Orange Fox. We're a passionate web agency committed to quality, innovation, and transparency. Discover our mission and the values that drive us.",
    ogTitleTemplate: "About The Orange Fox — Passionate Digital Craftsmen",
    ogDescTemplate: "Learn about our mission, values, and the talented team building premium digital experiences at The Orange Fox.",
    tips: [
      "Include team expertise keywords (e.g., 'experienced developers')",
      "Mention your company values to build trust",
      "Use a team photo or office image for OG image",
      "Include your location if targeting local clients",
    ],
  },
  services: {
    focus: "service offerings and capabilities",
    keywords: ["web design services", "web development", "SEO services", "domain hosting", "admin panel", "training support"],
    titleTemplate: "Services — The Orange Fox | Web Design, Development & More",
    descTemplate: "Explore our comprehensive web services: custom design, full-stack development, SEO optimization, domain hosting, admin panels, and ongoing support. Get a free consultation.",
    ogTitleTemplate: "Our Services — Full-Stack Web Solutions by The Orange Fox",
    ogDescTemplate: "From design to deployment and beyond. Discover the full range of web services offered by The Orange Fox.",
    tips: [
      "List your primary services in the meta description",
      "Use service-specific keywords naturally",
      "Mention free consultation or project starter offers",
      "Include structured data for services (Schema.org)",
    ],
  },
  pricing: {
    focus: "pricing packages, value, and affordability",
    keywords: ["web design pricing", "web development packages", "affordable web design", "premium packages", "app development cost"],
    titleTemplate: "Pricing — The Orange Fox | Premium Web & App Packages",
    descTemplate: "Transparent pricing for premium web and app development. Choose from 5 packages starting at $1,250. Premium Web, Exclusive Web, Premium App, Exclusive App, or Ultimate bundle.",
    ogTitleTemplate: "Pricing Plans — Find Your Perfect Package | The Orange Fox",
    ogDescTemplate: "View our transparent pricing packages for web and app development. Premium quality starting at $1,250.",
    tips: [
      "Include starting price in the description for rich snippets",
      "Mention the number of packages available",
      "Use pricing-related keywords (affordable, value, investment)",
      "Add PriceSpecification schema markup for each package",
    ],
  },
  contact: {
    focus: "getting in touch and free consultation",
    keywords: ["contact us", "free consultation", "get a quote", "web design inquiry", "project discussion", "The Orange Fox contact"],
    titleTemplate: "Contact Us — The Orange Fox | Start Your Project Today",
    descTemplate: "Ready to start your project? Contact The Orange Fox for a free consultation. Fill out our simple form or reach us directly. We respond within 24 hours.",
    ogTitleTemplate: "Get In Touch — Start Your Project with The Orange Fox",
    ogDescTemplate: "Contact The Orange Fox to discuss your web project. Free consultation, fast response, and expert guidance.",
    tips: [
      "Include a call-to-action in the meta description",
      "Mention response time to set expectations",
      "Use 'free consultation' as a key phrase",
      "Add LocalBusiness schema with contact details",
    ],
  },
  faq: {
    focus: "common questions and helpful answers",
    keywords: ["FAQ", "frequently asked questions", "web design questions", "development process", "pricing questions", "support"],
    titleTemplate: "FAQ — The Orange Fox | Common Questions Answered",
    descTemplate: "Find answers to frequently asked questions about The Orange Fox's web design services, development process, pricing, and support. Everything you need to know.",
    ogTitleTemplate: "Frequently Asked Questions — The Orange Fox",
    ogDescTemplate: "Get answers to common questions about our services, pricing, process, and support at The Orange Fox.",
    tips: [
      "Use FAQPage schema markup for rich snippets in Google",
      "Include the word 'FAQ' or 'Questions' in the title",
      "Mention the categories of questions covered",
      "This page has high potential for featured snippets",
    ],
  },
  process: {
    focus: "development methodology and workflow",
    keywords: ["development process", "how we work", "project phases", "web development workflow", "agile development", "project methodology"],
    titleTemplate: "Our Process — The Orange Fox | How We Build Your Project",
    descTemplate: "Discover our proven 6-phase development process: Discovery, Design, Development, Testing, Launch, and Support. See how The Orange Fox brings your vision to life.",
    ogTitleTemplate: "How We Work — The Orange Fox Development Process",
    ogDescTemplate: "From discovery to launch and beyond. Learn about our structured 6-phase approach to building premium digital experiences.",
    tips: [
      "Mention the number of phases to set clear expectations",
      "Use process-related keywords (methodology, phases, workflow)",
      "Include a process diagram as OG image",
      "Add HowTo schema markup for the development steps",
    ],
  },
  global: {
    focus: "general site-wide SEO defaults",
    keywords: ["The Orange Fox", "web agency", "digital solutions", "premium web design", "web development"],
    titleTemplate: "The Orange Fox — Premium Digital Agency",
    descTemplate: "The Orange Fox is a premium web agency specializing in custom web design, development, and digital solutions for businesses worldwide.",
    ogTitleTemplate: "The Orange Fox — Digital Excellence",
    ogDescTemplate: "Premium web design and development agency crafting exceptional digital experiences.",
    tips: [
      "These are fallback/default SEO settings for the whole site",
      "Keep them general but brand-focused",
      "Ensure the site name is consistent across all pages",
      "Set a default OG image that represents your brand",
    ],
  },
};

export default function SeoPage() {
  const [activePage, setActivePage] = useState("home");
  const [seo, setSeo] = useState<SeoData>(emptySeo("home"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [optimizeReport, setOptimizeReport] = useState<string[] | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkOptimizing, setBulkOptimizing] = useState(false);
  const [allSeoData, setAllSeoData] = useState<Record<string, SeoData>>({});

  // PageSpeed Insights state
  const [pageSpeedOpen, setPageSpeedOpen] = useState(true);
  const [pageSpeedLoading, setPageSpeedLoading] = useState(false);
  const [pageSpeedStrategy, setPageSpeedStrategy] = useState<"mobile" | "desktop">("mobile");
  const [pageSpeedUrl, setPageSpeedUrl] = useState("https://the-orange-fox-web.vercel.app");
  const [pageSpeedData, setPageSpeedData] = useState<{
    scores: { performance: number; seo: number; accessibility: number; bestPractices: number };
    coreWebVitals: { lcp: string; fid: string; cls: string; fcp: string; tbt: string; si: string };
    strategy: string;
    url: string;
    fetchedAt: string;
  } | null>(null);
  const [pageSpeedError, setPageSpeedError] = useState("");

  // Sitemap state
  const [sitemapXml, setSitemapXml] = useState("");
  const [sitemapLoading, setSitemapLoading] = useState(false);
  const [sitemapVisible, setSitemapVisible] = useState(false);

  const loadSeo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seo?page=${activePage}`);
      const json = await res.json();
      if (json.data) {
        const empty = emptySeo(activePage);
        const raw = json.data as Record<string, unknown>;
        const sanitized: SeoData = {
          ...empty,
          id: (raw.id as string) ?? empty.id,
          page: (raw.page as string) ?? empty.page,
          title: (raw.title as string) ?? "",
          description: (raw.description as string) ?? "",
          keywords: (raw.keywords as string) ?? "",
          og_title: (raw.og_title as string) ?? "",
          og_description: (raw.og_description as string) ?? "",
          og_image: (raw.og_image as string) ?? "",
          canonical_url: (raw.canonical_url as string) ?? "",
          robots: (raw.robots as string) ?? "index, follow",
          schema_markup: (raw.schema_markup as string) ?? "",
        };
        setSeo(sanitized);
      } else {
        setSeo(emptySeo(activePage));
      }
    } catch {
      setSeo(emptySeo(activePage));
    } finally {
      setLoading(false);
    }
  }, [activePage]);

  // Load all SEO data for sitemap status
  const loadAllSeo = useCallback(async () => {
    const data: Record<string, SeoData> = {};
    for (const page of PAGES) {
      try {
        const res = await fetch(`/api/seo?page=${page}`);
        const json = await res.json();
        if (json.data) {
          data[page] = json.data as SeoData;
        }
      } catch {
        // skip
      }
    }
    setAllSeoData(data);
  }, []);

  const fetchPageSpeed = useCallback(async () => {
    setPageSpeedLoading(true);
    setPageSpeedError("");
    setPageSpeedData(null);
    try {
      const res = await fetch(`/api/pagespeed?url=${encodeURIComponent(pageSpeedUrl)}&strategy=${pageSpeedStrategy}`);
      const json = await res.json();
      if (json.error) {
        setPageSpeedError(json.error);
      } else {
        setPageSpeedData(json.data);
      }
    } catch {
      setPageSpeedError("Failed to fetch PageSpeed data. Please try again.");
    } finally {
      setPageSpeedLoading(false);
    }
  }, [pageSpeedUrl, pageSpeedStrategy]);

  const generateSitemap = async () => {
    setSitemapLoading(true);
    try {
      const res = await fetch("/api/generate-sitemap");
      const xml = await res.text();
      setSitemapXml(xml);
      setSitemapVisible(true);
    } catch {
      setSitemapXml("<!-- Failed to generate sitemap -->");
      setSitemapVisible(true);
    } finally {
      setSitemapLoading(false);
    }
  };

  useEffect(() => {
    loadSeo();
  }, [loadSeo]);

  useEffect(() => {
    loadAllSeo();
  }, [loadAllSeo]);

  // Auto-load PageSpeed on mount
  useEffect(() => {
    fetchPageSpeed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSeo = async () => {
    setSaving(true);
    try {
      await fetch("/api/seo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(seo),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadSeo();
    } finally {
      setSaving(false);
    }
  };

  // Enhanced SEO Score calculation with 10 checks
  const calculateScore = () => {
    let score = 0;
    const checks: { label: string; passed: boolean; tip: string }[] = [];

    // 1. Title check (50-60 chars ideal)
    const titleLen = (seo.title ?? "").length;
    const titleGood = titleLen >= 50 && titleLen <= 60;
    const titleOk = titleLen >= 30 && titleLen <= 70;
    if (titleGood) {
      score += 12;
      checks.push({ label: "Title length", passed: true, tip: `${titleLen} chars — perfect!` });
    } else if (titleOk) {
      score += 6;
      checks.push({ label: "Title length", passed: false, tip: `${titleLen} chars — aim for 50-60` });
    } else {
      checks.push({ label: "Title length", passed: false, tip: titleLen === 0 ? "Missing title" : `${titleLen} chars — should be 50-60` });
    }

    // 2. Description check (150-160 chars ideal)
    const descLen = (seo.description ?? "").length;
    const descGood = descLen >= 150 && descLen <= 160;
    const descOk = descLen >= 120 && descLen <= 180;
    if (descGood) {
      score += 12;
      checks.push({ label: "Meta description", passed: true, tip: `${descLen} chars — perfect!` });
    } else if (descOk) {
      score += 6;
      checks.push({ label: "Meta description", passed: false, tip: `${descLen} chars — aim for 150-160` });
    } else {
      checks.push({ label: "Meta description", passed: false, tip: descLen === 0 ? "Missing description" : `${descLen} chars — should be 150-160` });
    }

    // 3. Keywords
    if ((seo.keywords ?? "").length > 0) {
      score += 10;
      checks.push({ label: "Keywords", passed: true, tip: "Keywords defined" });
    } else {
      checks.push({ label: "Keywords", passed: false, tip: "Add target keywords" });
    }

    // 4. OG Title
    if ((seo.og_title ?? "").length > 0) {
      score += 10;
      checks.push({ label: "OG Title", passed: true, tip: "Open Graph title set" });
    } else {
      checks.push({ label: "OG Title", passed: false, tip: "Add Open Graph title" });
    }

    // 5. OG Description
    if ((seo.og_description ?? "").length > 0) {
      score += 8;
      checks.push({ label: "OG Description", passed: true, tip: "Open Graph description set" });
    } else {
      checks.push({ label: "OG Description", passed: false, tip: "Add Open Graph description" });
    }

    // 6. OG Image
    if ((seo.og_image ?? "").length > 0) {
      score += 8;
      checks.push({ label: "OG Image", passed: true, tip: "Open Graph image set" });
    } else {
      checks.push({ label: "OG Image", passed: false, tip: "Add social sharing image" });
    }

    // 7. Robots
    if ((seo.robots ?? "").length > 0) {
      score += 8;
      checks.push({ label: "Robots directive", passed: true, tip: seo.robots ?? "" });
    } else {
      checks.push({ label: "Robots directive", passed: false, tip: "Set robots meta tag" });
    }

    // 8. Schema markup
    if ((seo.schema_markup ?? "").length > 10) {
      score += 12;
      checks.push({ label: "Schema markup", passed: true, tip: "Structured data present" });
    } else {
      checks.push({ label: "Schema markup", passed: false, tip: "Add JSON-LD schema markup for rich snippets" });
    }

    // 9. Keyword in title
    const keywords = (seo.keywords ?? "").toLowerCase().split(",").map((k) => k.trim()).filter(Boolean);
    const titleLower = (seo.title ?? "").toLowerCase();
    const keywordInTitle = keywords.some((k) => titleLower.includes(k));
    if (keywords.length > 0 && keywordInTitle) {
      score += 10;
      checks.push({ label: "Keyword in title", passed: true, tip: "Primary keyword found in title" });
    } else if (keywords.length > 0) {
      checks.push({ label: "Keyword in title", passed: false, tip: "Include a target keyword in your title" });
    } else {
      checks.push({ label: "Keyword in title", passed: false, tip: "Set keywords first, then include one in title" });
    }

    // 10. Canonical URL
    if ((seo.canonical_url ?? "").length > 0) {
      score += 10;
      checks.push({ label: "Canonical URL", passed: true, tip: "Canonical URL set — prevents duplicate content" });
    } else {
      checks.push({ label: "Canonical URL", passed: false, tip: "Set canonical URL to prevent duplicate content" });
    }

    return { score: Math.min(score, 100), checks };
  };

  // Smart AI Optimize with page-specific content
  const aiOptimize = async () => {
    setOptimizing(true);
    setOptimizeReport(null);
    await new Promise((r) => setTimeout(r, 1200));

    const ctx = PAGE_SEO_CONTEXT[activePage] || PAGE_SEO_CONTEXT.global;
    const report: string[] = [];

    const optimized: Partial<SeoData> = {};

    if (!(seo.title ?? "").trim()) {
      optimized.title = ctx.titleTemplate;
      report.push(`✅ Generated title optimized for ${ctx.focus}`);
    } else if ((seo.title ?? "").length < 30) {
      report.push(`⚠️ Title is too short (${(seo.title ?? "").length} chars) — consider expanding`);
    } else {
      report.push(`✓ Title already set (${(seo.title ?? "").length} chars)`);
    }

    if (!(seo.description ?? "").trim()) {
      optimized.description = ctx.descTemplate;
      report.push(`✅ Generated meta description focusing on ${ctx.focus}`);
    } else if ((seo.description ?? "").length < 120) {
      report.push(`⚠️ Description is short (${(seo.description ?? "").length} chars) — aim for 150-160`);
    } else {
      report.push(`✓ Description already set (${(seo.description ?? "").length} chars)`);
    }

    if (!(seo.keywords ?? "").trim()) {
      optimized.keywords = ctx.keywords.join(", ");
      report.push(`✅ Added ${ctx.keywords.length} relevant keywords`);
    } else {
      report.push(`✓ Keywords already set`);
    }

    if (!(seo.og_title ?? "").trim()) {
      optimized.og_title = ctx.ogTitleTemplate;
      report.push(`✅ Generated unique OG title (different from meta title)`);
    } else {
      report.push(`✓ OG title already set`);
    }

    if (!(seo.og_description ?? "").trim()) {
      optimized.og_description = ctx.ogDescTemplate;
      report.push(`✅ Generated OG description for social sharing`);
    } else {
      report.push(`✓ OG description already set`);
    }

    if (!(seo.robots ?? "").trim()) {
      optimized.robots = "index, follow";
      report.push(`✅ Set robots to "index, follow"`);
    }

    if (!(seo.canonical_url ?? "").trim()) {
      const slug = activePage === "home" ? "" : activePage;
      optimized.canonical_url = `https://the-orange-fox-web.vercel.app/${slug}`;
      report.push(`✅ Set canonical URL`);
    }

    setSeo((prev) => ({ ...prev, ...optimized }));
    setOptimizeReport(report);
    setOptimizing(false);
  };

  const handleBulkOptimize = async () => {
    setBulkOptimizing(true);
    for (const page of PAGES) {
      const ctx = PAGE_SEO_CONTEXT[page] || PAGE_SEO_CONTEXT.global;
      const slug = page === "home" ? "" : page;

      try {
        const res = await fetch(`/api/seo?page=${page}`);
        const json = await res.json();
        const existing = json.data || {};

        const updates: Partial<SeoData> = {
          page,
          title: (existing.title as string) || ctx.titleTemplate,
          description: (existing.description as string) || ctx.descTemplate,
          keywords: (existing.keywords as string) || ctx.keywords.join(", "),
          og_title: (existing.og_title as string) || ctx.ogTitleTemplate,
          og_description: (existing.og_description as string) || ctx.ogDescTemplate,
          robots: (existing.robots as string) || "index, follow",
          canonical_url: (existing.canonical_url as string) || `https://the-orange-fox-web.vercel.app/${slug}`,
          og_image: (existing.og_image as string) || "",
          schema_markup: (existing.schema_markup as string) || "",
        };

        if (existing.id) {
          updates.id = existing.id as string;
        }

        await fetch("/api/seo", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
      } catch {
        // continue
      }
    }
    setBulkOptimizing(false);
    setShowBulkModal(false);
    loadSeo();
    loadAllSeo();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Sitemap status
  const pagesWithCanonical = PAGES.filter((p) => (allSeoData[p]?.canonical_url ?? "").length > 0);
  const sitemapComplete = pagesWithCanonical.length === PAGES.length;

  const { score, checks } = calculateScore();
  const scoreColor = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-yellow-400" : "text-red-400";

  // SERP Preview
  const serpTitle = (seo.title ?? "") || "Page Title";
  const serpDesc = (seo.description ?? "") || "No meta description set. Search engines will auto-generate a snippet from page content.";
  const serpUrl = (seo.canonical_url ?? "") || `https://the-orange-fox-web.vercel.app/${activePage === "home" ? "" : activePage}`;

  const currentTips = PAGE_SEO_CONTEXT[activePage]?.tips || PAGE_SEO_CONTEXT.global.tips;

  return (
    <div className="space-y-6">
      {/* Save Success Toast */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm animate-fade-in shadow-xl">
          <CheckCircle2 size={16} />
          SEO settings saved successfully!
        </div>
      )}

      {/* Bulk Optimize Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBulkModal(false)} />
          <div className="relative z-50 bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Optimize All Pages</h3>
              <button onClick={() => setShowBulkModal(false)} className="p-1 rounded-lg hover:bg-gray-50 text-gray-500">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              This will fill in missing SEO fields for all {PAGES.length} pages with AI-generated, page-specific content. Existing values will not be overwritten.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleBulkOptimize}
                disabled={bulkOptimizing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                <Sparkles size={14} className={bulkOptimizing ? "animate-spin" : ""} />
                {bulkOptimizing ? "Optimizing..." : "Optimize All"}
              </button>
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2.5 text-sm rounded-xl bg-gray-50 text-gray-500 hover:text-gray-900 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">SEO Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Optimize your website for search engines</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-200 transition-all"
          >
            <Zap size={14} />
            Bulk Optimize
          </button>
          <button
            onClick={aiOptimize}
            disabled={optimizing}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            <Sparkles size={14} className={optimizing ? "animate-spin" : ""} />
            {optimizing ? "Optimizing..." : "AI Optimize"}
          </button>
          <button
            onClick={saveSeo}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-orange text-white hover:bg-orange-600 transition-all disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl px-5 py-3 flex items-start gap-3">
        <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-300/80">
          These settings control the meta tags on the live website at{" "}
          <a
            href="https://the-orange-fox-web.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline hover:text-blue-300"
          >
            the-orange-fox-web.vercel.app
          </a>
        </p>
      </div>

      {/* PageSpeed Insights Section */}
      <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 overflow-hidden">
        <button
          onClick={() => setPageSpeedOpen(!pageSpeedOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
              <Gauge size={16} className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-heading text-sm font-semibold text-gray-900">Google PageSpeed Insights</h3>
              <p className="text-[11px] text-gray-500">Real performance, SEO, and accessibility scores from Google</p>
            </div>
          </div>
          {pageSpeedOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </button>

        {pageSpeedOpen && (
          <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
            {/* Controls */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Page URL</label>
                <input
                  value={pageSpeedUrl}
                  onChange={(e) => setPageSpeedUrl(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-orange transition-all"
                  placeholder="https://the-orange-fox-web.vercel.app"
                />
              </div>
              <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
                <button
                  onClick={() => setPageSpeedStrategy("mobile")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-all ${
                    pageSpeedStrategy === "mobile" ? "bg-orange/20 text-orange" : "text-gray-500 hover:text-white"
                  }`}
                >
                  <Smartphone size={12} /> Mobile
                </button>
                <button
                  onClick={() => setPageSpeedStrategy("desktop")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-all ${
                    pageSpeedStrategy === "desktop" ? "bg-orange/20 text-orange" : "text-gray-500 hover:text-white"
                  }`}
                >
                  <Monitor size={12} /> Desktop
                </button>
              </div>
              <button
                onClick={fetchPageSpeed}
                disabled={pageSpeedLoading}
                className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 text-white hover:from-emerald-700 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                <RefreshCw size={14} className={pageSpeedLoading ? "animate-spin" : ""} />
                {pageSpeedLoading ? "Testing..." : "Test Page Speed"}
              </button>
            </div>

            {/* Error */}
            {pageSpeedError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={14} />
                {pageSpeedError}
              </div>
            )}

            {/* Loading */}
            {pageSpeedLoading && !pageSpeedData && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <RefreshCw size={16} className="animate-spin" />
                  Analyzing page with Google Lighthouse... This may take 15-30 seconds.
                </div>
              </div>
            )}

            {/* Results */}
            {pageSpeedData && (
              <div className="space-y-4 animate-fade-in">
                {/* Score Circles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Performance", score: pageSpeedData.scores.performance },
                    { label: "SEO", score: pageSpeedData.scores.seo },
                    { label: "Accessibility", score: pageSpeedData.scores.accessibility },
                    { label: "Best Practices", score: pageSpeedData.scores.bestPractices },
                  ].map((item) => {
                    const color = item.score >= 90 ? "#10b981" : item.score >= 50 ? "#eab308" : "#ef4444";
                    const textColor = item.score >= 90 ? "text-emerald-400" : item.score >= 50 ? "text-yellow-400" : "text-red-400";
                    const bgColor = item.score >= 90 ? "bg-emerald-500/5 border-emerald-500/20" : item.score >= 50 ? "bg-yellow-500/5 border-yellow-500/20" : "bg-red-500/5 border-red-500/20";
                    return (
                      <div key={item.label} className={`flex flex-col items-center p-4 rounded-xl border ${bgColor}`}>
                        <div className="relative w-16 h-16 mb-2">
                          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="52" stroke="#222" strokeWidth="8" fill="none" />
                            <circle
                              cx="60" cy="60" r="52"
                              stroke={color}
                              strokeWidth="8" fill="none" strokeLinecap="round"
                              strokeDasharray={`${item.score * 3.27} 327`}
                              className="transition-all duration-1000"
                            />
                          </svg>
                          <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${textColor}`}>
                            {item.score}
                          </span>
                        </div>
                        <span className="font-heading text-xs font-medium text-gray-500">{item.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Core Web Vitals */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-heading text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Core Web Vitals</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "LCP", value: pageSpeedData.coreWebVitals.lcp, desc: "Largest Contentful Paint" },
                      { label: "FID", value: pageSpeedData.coreWebVitals.fid, desc: "Max Potential FID" },
                      { label: "CLS", value: pageSpeedData.coreWebVitals.cls, desc: "Cumulative Layout Shift" },
                      { label: "FCP", value: pageSpeedData.coreWebVitals.fcp, desc: "First Contentful Paint" },
                      { label: "TBT", value: pageSpeedData.coreWebVitals.tbt, desc: "Total Blocking Time" },
                      { label: "SI", value: pageSpeedData.coreWebVitals.si, desc: "Speed Index" },
                    ].map((metric) => (
                      <div key={metric.label} className="bg-gray-50/50 rounded-lg p-3">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-xs font-semibold text-orange">{metric.label}</span>
                          <span className="text-sm font-bold text-gray-900">{metric.value}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">{metric.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex items-center justify-between text-[10px] text-gray-600">
                  <span>Strategy: {pageSpeedData.strategy} · URL: {pageSpeedData.url}</span>
                  <span>Tested: {new Date(pageSpeedData.fetchedAt).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Optimize Report */}
      {optimizeReport && (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-purple-400" />
              <h4 className="text-sm font-semibold text-gray-900">Optimization Report</h4>
            </div>
            <button onClick={() => setOptimizeReport(null)} className="text-gray-500 hover:text-gray-500">
              <X size={14} />
            </button>
          </div>
          <ul className="space-y-1">
            {optimizeReport.map((line, i) => (
              <li key={i} className="text-xs text-gray-500">{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Page Tabs */}
      <div className="flex flex-wrap gap-2">
        {PAGES.map((p) => (
          <button
            key={p}
            onClick={() => { setActivePage(p); setOptimizeReport(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all capitalize ${
              activePage === p
                ? "bg-orange/10 text-orange border border-orange/20"
                : "bg-white text-gray-500 border border-gray-200 hover:text-gray-900 hover:border-gray-200"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-80 bg-white rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SEO Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* SERP Preview */}
            <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={14} className="text-gray-500" />
                <h3 className="font-heading text-sm font-semibold text-gray-900 uppercase tracking-wider">Google Search Preview</h3>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="text-[13px] text-green-700 truncate font-normal">
                  {serpUrl}
                </p>
                <h4 className="text-lg text-blue-700 hover:underline cursor-pointer truncate font-medium mt-0.5">
                  {serpTitle.length > 60 ? serpTitle.substring(0, 60) + "..." : serpTitle}
                </h4>
                <p className="text-[13px] text-gray-600 mt-1 line-clamp-2">
                  {serpDesc.length > 160 ? serpDesc.substring(0, 160) + "..." : serpDesc}
                </p>
              </div>
            </div>

            {/* Basic SEO */}
            <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-6 space-y-5">
              <h3 className="font-heading text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Search size={14} className="text-orange" />
                Basic SEO
              </h3>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-500">Meta Title</label>
                  <span className={`text-xs ${(seo.title ?? "").length >= 50 && (seo.title ?? "").length <= 60 ? "text-emerald-400" : "text-gray-500"}`}>
                    {(seo.title ?? "").length}/60
                  </span>
                </div>
                <input
                  value={seo.title ?? ""}
                  onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                  placeholder="Page title for search engines"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-500">Meta Description</label>
                  <span className={`text-xs ${(seo.description ?? "").length >= 150 && (seo.description ?? "").length <= 160 ? "text-emerald-400" : "text-gray-500"}`}>
                    {(seo.description ?? "").length}/160
                  </span>
                </div>
                <textarea
                  value={seo.description ?? ""}
                  onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all min-h-[80px] resize-y"
                  placeholder="Page description for search results"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Keywords</label>
                <input
                  value={seo.keywords ?? ""}
                  onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Robots</label>
                <select
                  value={seo.robots ?? "index, follow"}
                  onChange={(e) => setSeo({ ...seo, robots: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                >
                  <option value="index, follow">index, follow</option>
                  <option value="noindex, follow">noindex, follow</option>
                  <option value="index, nofollow">index, nofollow</option>
                  <option value="noindex, nofollow">noindex, nofollow</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Canonical URL</label>
                <input
                  value={seo.canonical_url ?? ""}
                  onChange={(e) => setSeo({ ...seo, canonical_url: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                  placeholder="https://the-orange-fox-web.vercel.app/page"
                />
              </div>
            </div>

            {/* Open Graph */}
            <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-6 space-y-5">
              <h3 className="font-heading text-sm font-semibold text-gray-900 uppercase tracking-wider">Open Graph</h3>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">OG Title</label>
                <input
                  value={seo.og_title ?? ""}
                  onChange={(e) => setSeo({ ...seo, og_title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                  placeholder="Title for social sharing"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">OG Description</label>
                <textarea
                  value={seo.og_description ?? ""}
                  onChange={(e) => setSeo({ ...seo, og_description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all min-h-[60px] resize-y"
                  placeholder="Description for social sharing"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">OG Image URL</label>
                <input
                  value={seo.og_image ?? ""}
                  onChange={(e) => setSeo({ ...seo, og_image: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                  placeholder="https://example.com/og-image.jpg"
                />
                {(seo.og_image ?? "").length > 0 && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                    <p className="text-[10px] text-gray-500 mb-1">Preview</p>
                    <img
                      src={seo.og_image ?? ""}
                      alt="OG Preview"
                      className="max-h-24 rounded object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Schema Markup */}
            <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-6 space-y-5">
              <h3 className="font-heading text-sm font-semibold text-gray-900 uppercase tracking-wider">Schema Markup</h3>
              <textarea
                value={seo.schema_markup ?? ""}
                onChange={(e) => setSeo({ ...seo, schema_markup: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all min-h-[150px] resize-y font-mono"
                placeholder='{"@context": "https://schema.org", ...}'
              />
            </div>
          </div>

          {/* SEO Score Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-6 sticky top-20">
              <h3 className="font-heading text-sm font-semibold text-gray-900 mb-4">SEO Score</h3>

              {/* Score Gauge */}
              <div className="text-center mb-6">
                <div className="relative inline-flex items-center justify-center w-32 h-32">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" stroke="#222" strokeWidth="8" fill="none" />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      stroke="url(#scoreGrad)"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${score * 3.27} 327`}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%">
                        <stop offset="0%" stopColor={score >= 80 ? "#10b981" : score >= 50 ? "#eab308" : "#ef4444"} />
                        <stop offset="100%" stopColor={score >= 80 ? "#34d399" : score >= 50 ? "#facc15" : "#f87171"} />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className={`absolute text-3xl font-bold ${scoreColor}`}>{score}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {score >= 80 ? "Excellent" : score >= 50 ? "Needs improvement" : "Poor — optimize now"}
                </p>
              </div>

              {/* Checks */}
              <div className="space-y-2">
                {checks.map((check, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50">
                    {check.passed ? (
                      <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-500">{check.label}</p>
                      <p className="text-[10px] text-gray-500">{check.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sitemap Status */}
            <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-6">
              <h3 className="font-heading text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Globe size={14} className="text-orange" />
                Sitemap Status
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${sitemapComplete ? "bg-emerald-400" : "bg-yellow-400"}`} />
                <span className="text-xs text-gray-500">
                  {pagesWithCanonical.length}/{PAGES.length} pages with canonical URLs
                </span>
              </div>
              <div className="space-y-1">
                {PAGES.map((p) => (
                  <div key={p} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 capitalize">{p}</span>
                    {(allSeoData[p]?.canonical_url ?? "").length > 0 ? (
                      <CheckCircle2 size={12} className="text-emerald-400" />
                    ) : (
                      <AlertCircle size={12} className="text-gray-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Sitemap */}
            <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-6">
              <h3 className="font-heading text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileCode2 size={14} className="text-orange" />
                Generate Sitemap
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Generate a sitemap.xml from your SEO settings with proper canonical URLs and priorities.
              </p>
              <button
                onClick={generateSitemap}
                disabled={sitemapLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-orange/10 border border-orange/20 text-orange hover:bg-orange/20 transition-all disabled:opacity-50"
              >
                <FileCode2 size={14} className={sitemapLoading ? "animate-spin" : ""} />
                {sitemapLoading ? "Generating..." : "Generate Sitemap"}
              </button>
              {sitemapVisible && sitemapXml && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">sitemap.xml</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(sitemapXml); }}
                      className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      <Copy size={10} /> Copy
                    </button>
                  </div>
                  <pre className="bg-gray-50 rounded-lg p-3 text-[10px] text-gray-500 overflow-x-auto max-h-48 overflow-y-auto font-mono whitespace-pre">
                    {sitemapXml}
                  </pre>
                </div>
              )}
            </div>

            {/* Page-Specific Tips */}
            <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-6">
              <h3 className="font-heading text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Lightbulb size={14} className="text-orange" />
                Tips for &ldquo;{activePage}&rdquo;
              </h3>
              <ul className="space-y-2 text-xs text-gray-500">
                {currentTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-orange mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

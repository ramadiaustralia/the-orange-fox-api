"use client";
import { useEffect, useState, useCallback } from "react";
import { Save, Sparkles, Search, RefreshCw, AlertCircle, CheckCircle2, Globe, Info } from "lucide-react";

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

export default function SeoPage() {
  const [activePage, setActivePage] = useState("home");
  const [seo, setSeo] = useState<SeoData>(emptySeo("home"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  useEffect(() => {
    loadSeo();
  }, [loadSeo]);

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

  // SEO Score calculation
  const calculateScore = () => {
    let score = 0;
    const checks: { label: string; passed: boolean; tip: string }[] = [];

    // Title check (50-60 chars ideal)
    const titleLen = (seo.title ?? "").length;
    const titleGood = titleLen >= 50 && titleLen <= 60;
    const titleOk = titleLen >= 30 && titleLen <= 70;
    if (titleGood) {
      score += 20;
      checks.push({ label: "Title length", passed: true, tip: `${titleLen} chars — perfect!` });
    } else if (titleOk) {
      score += 10;
      checks.push({ label: "Title length", passed: false, tip: `${titleLen} chars — aim for 50-60` });
    } else {
      checks.push({ label: "Title length", passed: false, tip: titleLen === 0 ? "Missing title" : `${titleLen} chars — should be 50-60` });
    }

    // Description check (150-160 chars ideal)
    const descLen = (seo.description ?? "").length;
    const descGood = descLen >= 150 && descLen <= 160;
    const descOk = descLen >= 120 && descLen <= 180;
    if (descGood) {
      score += 20;
      checks.push({ label: "Meta description", passed: true, tip: `${descLen} chars — perfect!` });
    } else if (descOk) {
      score += 10;
      checks.push({ label: "Meta description", passed: false, tip: `${descLen} chars — aim for 150-160` });
    } else {
      checks.push({ label: "Meta description", passed: false, tip: descLen === 0 ? "Missing description" : `${descLen} chars — should be 150-160` });
    }

    // Keywords
    if ((seo.keywords ?? "").length > 0) {
      score += 15;
      checks.push({ label: "Keywords", passed: true, tip: "Keywords defined" });
    } else {
      checks.push({ label: "Keywords", passed: false, tip: "Add target keywords" });
    }

    // OG Title
    if ((seo.og_title ?? "").length > 0) {
      score += 15;
      checks.push({ label: "OG Title", passed: true, tip: "Open Graph title set" });
    } else {
      checks.push({ label: "OG Title", passed: false, tip: "Add Open Graph title" });
    }

    // OG Description
    if ((seo.og_description ?? "").length > 0) {
      score += 10;
      checks.push({ label: "OG Description", passed: true, tip: "Open Graph description set" });
    } else {
      checks.push({ label: "OG Description", passed: false, tip: "Add Open Graph description" });
    }

    // OG Image
    if ((seo.og_image ?? "").length > 0) {
      score += 10;
      checks.push({ label: "OG Image", passed: true, tip: "Open Graph image set" });
    } else {
      checks.push({ label: "OG Image", passed: false, tip: "Add social sharing image" });
    }

    // Robots
    if ((seo.robots ?? "").length > 0) {
      score += 10;
      checks.push({ label: "Robots directive", passed: true, tip: seo.robots ?? "" });
    } else {
      checks.push({ label: "Robots directive", passed: false, tip: "Set robots meta tag" });
    }

    return { score: Math.min(score, 100), checks };
  };

  const aiOptimize = async () => {
    setOptimizing(true);
    await new Promise((r) => setTimeout(r, 1500));

    const pageTitle = activePage.charAt(0).toUpperCase() + activePage.slice(1);
    const optimized: Partial<SeoData> = {
      title: (seo.title ?? "") || `${pageTitle} — The Orange Fox | Premium Web Design & Development Agency`,
      description: (seo.description ?? "") || `Discover ${pageTitle.toLowerCase()} at The Orange Fox. We craft premium digital experiences with cutting-edge web design, development, and branding solutions. Get started today.`,
      keywords: (seo.keywords ?? "") || `web design, web development, digital agency, ${activePage}, the orange fox, UI/UX, branding`,
      og_title: (seo.og_title ?? "") || `${pageTitle} | The Orange Fox — Digital Excellence`,
      og_description: (seo.og_description ?? "") || `Explore our ${activePage} page. The Orange Fox delivers premium web solutions for businesses that demand the best.`,
      robots: (seo.robots ?? "") || "index, follow",
    };
    setSeo((prev) => ({ ...prev, ...optimized }));
    setOptimizing(false);
  };

  const { score, checks } = calculateScore();
  const scoreColor = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-yellow-400" : "text-red-400";

  // SERP Preview
  const serpTitle = (seo.title ?? "") || "Page Title";
  const serpDesc = (seo.description ?? "") || "No meta description set. Search engines will auto-generate a snippet from page content.";
  const serpUrl = (seo.canonical_url ?? "") || `https://the-orange-fox-web.vercel.app/${activePage === "home" ? "" : activePage}`;

  return (
    <div className="space-y-6">
      {/* Save Success Toast */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm animate-fade-in shadow-xl">
          <CheckCircle2 size={16} />
          SEO settings saved successfully!
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">SEO Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Optimize your website for search engines</p>
        </div>
        <div className="flex gap-2">
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

      {/* Page Tabs */}
      <div className="flex flex-wrap gap-2">
        {PAGES.map((p) => (
          <button
            key={p}
            onClick={() => setActivePage(p)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all capitalize ${
              activePage === p
                ? "bg-orange/10 text-orange border border-orange/20"
                : "bg-dark-400 text-gray-400 border border-dark-50/50 hover:text-white hover:border-dark-50"
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
              <div key={i} className="h-20 bg-dark-400 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-80 bg-dark-400 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SEO Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* SERP Preview */}
            <div className="bg-dark-400 border border-dark-50/50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={14} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Google Search Preview</h3>
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
            <div className="bg-dark-400 border border-dark-50/50 rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Search size={14} className="text-orange" />
                Basic SEO
              </h3>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-400">Meta Title</label>
                  <span className={`text-xs ${(seo.title ?? "").length >= 50 && (seo.title ?? "").length <= 60 ? "text-emerald-400" : "text-gray-500"}`}>
                    {(seo.title ?? "").length}/60
                  </span>
                </div>
                <input
                  value={seo.title ?? ""}
                  onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                  className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                  placeholder="Page title for search engines"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-400">Meta Description</label>
                  <span className={`text-xs ${(seo.description ?? "").length >= 150 && (seo.description ?? "").length <= 160 ? "text-emerald-400" : "text-gray-500"}`}>
                    {(seo.description ?? "").length}/160
                  </span>
                </div>
                <textarea
                  value={seo.description ?? ""}
                  onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                  className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all min-h-[80px] resize-y"
                  placeholder="Page description for search results"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Keywords</label>
                <input
                  value={seo.keywords ?? ""}
                  onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
                  className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Robots</label>
                <select
                  value={seo.robots ?? "index, follow"}
                  onChange={(e) => setSeo({ ...seo, robots: e.target.value })}
                  className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                >
                  <option value="index, follow">index, follow</option>
                  <option value="noindex, follow">noindex, follow</option>
                  <option value="index, nofollow">index, nofollow</option>
                  <option value="noindex, nofollow">noindex, nofollow</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Canonical URL</label>
                <input
                  value={seo.canonical_url ?? ""}
                  onChange={(e) => setSeo({ ...seo, canonical_url: e.target.value })}
                  className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                  placeholder="https://the-orange-fox-web.vercel.app/page"
                />
              </div>
            </div>

            {/* Open Graph */}
            <div className="bg-dark-400 border border-dark-50/50 rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Open Graph</h3>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">OG Title</label>
                <input
                  value={seo.og_title ?? ""}
                  onChange={(e) => setSeo({ ...seo, og_title: e.target.value })}
                  className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                  placeholder="Title for social sharing"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">OG Description</label>
                <textarea
                  value={seo.og_description ?? ""}
                  onChange={(e) => setSeo({ ...seo, og_description: e.target.value })}
                  className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all min-h-[60px] resize-y"
                  placeholder="Description for social sharing"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">OG Image URL</label>
                <input
                  value={seo.og_image ?? ""}
                  onChange={(e) => setSeo({ ...seo, og_image: e.target.value })}
                  className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                  placeholder="https://example.com/og-image.jpg"
                />
                {(seo.og_image ?? "").length > 0 && (
                  <div className="mt-2 p-2 bg-dark-200/50 rounded-lg">
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
            <div className="bg-dark-400 border border-dark-50/50 rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Schema Markup</h3>
              <textarea
                value={seo.schema_markup ?? ""}
                onChange={(e) => setSeo({ ...seo, schema_markup: e.target.value })}
                className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all min-h-[150px] resize-y font-mono"
                placeholder='{"@context": "https://schema.org", ...}'
              />
            </div>
          </div>

          {/* SEO Score Sidebar */}
          <div className="space-y-4">
            <div className="bg-dark-400 border border-dark-50/50 rounded-2xl p-6 sticky top-20">
              <h3 className="text-sm font-semibold text-white mb-4">SEO Score</h3>

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
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-dark-200/50">
                    {check.passed ? (
                      <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-300">{check.label}</p>
                      <p className="text-[10px] text-gray-500">{check.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-dark-400 border border-dark-50/50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-3">Quick Tips</h3>
              <ul className="space-y-2 text-xs text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-orange mt-0.5">•</span>
                  Keep titles between 50-60 characters
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange mt-0.5">•</span>
                  Meta descriptions should be 150-160 characters
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange mt-0.5">•</span>
                  Use unique titles and descriptions for each page
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange mt-0.5">•</span>
                  OG images should be 1200×630px for best display
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange mt-0.5">•</span>
                  Add schema markup to improve rich snippets
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

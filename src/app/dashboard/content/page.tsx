"use client";
import { useEffect, useState, useCallback } from "react";
import ContentEditor from "@/components/ContentEditor";
import { RefreshCw } from "lucide-react";
import { PAGE_INFO } from "@/lib/contentLabels";

const PAGES = ["home", "about", "services", "process", "pricing", "contact", "faq", "global"];

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

export default function ContentPage() {
  const [activePage, setActivePage] = useState("home");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [allCounts, setAllCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content?page=${activePage}`);
      const data = await res.json();
      setItems(data.data || []);
    } catch (e) {
      console.error("Failed to load content", e);
    } finally {
      setLoading(false);
    }
  }, [activePage]);

  // Load counts for all pages on mount
  useEffect(() => {
    async function loadCounts() {
      try {
        const res = await fetch("/api/content");
        const data = await res.json();
        const allItems: ContentItem[] = data.data || [];
        const counts: Record<string, number> = {};
        PAGES.forEach((p) => {
          counts[p] = allItems.filter((item) => item.page === p).length;
        });
        setAllCounts(counts);
      } catch (e) {
        console.error("Failed to load counts", e);
      }
    }
    loadCounts();
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Update count for active page when items change
  useEffect(() => {
    if (items.length > 0 || !loading) {
      setAllCounts((prev) => ({ ...prev, [activePage]: items.length }));
    }
  }, [items, activePage, loading]);

  const pageInfo = PAGE_INFO[activePage];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[#1a1a1a] flex items-center gap-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Content Editor
          </h1>
          <p className="text-sm text-[#999999] mt-1">Edit website content across all pages and languages</p>
        </div>
        <button
          onClick={loadContent}
          className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] text-[#555555] hover:text-[#D4692A] hover:border-[#D4692A]/30 bg-[#fafafa] transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Page Tabs */}
      <div className="flex flex-wrap gap-2">
        {PAGES.map((p) => {
          const info = PAGE_INFO[p];
          const count = allCounts[p] || 0;
          return (
            <button
              key={p}
              onClick={() => setActivePage(p)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                activePage === p
                  ? "bg-[#D4692A]/10 text-[#D4692A] border border-[#D4692A]/20"
                  : "bg-[#fafafa] text-[#999999] border border-[#f0ece8] hover:text-[#1a1a1a] hover:border-[#e8e4e0]"
              }`}
            >
              <span>{info?.title || p}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                  activePage === p
                    ? "bg-[#D4692A]/20 text-[#D4692A]"
                    : "bg-[#f0ece8] text-[#999999]"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Page Info Banner */}
      {pageInfo && (
        <div className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,105,42,0.06)] hover:border-[#D4692A]/30 px-6 py-4">
          <p className="text-sm text-[#555555]">{pageInfo.description}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm p-6">
              <div className="h-4 w-32 bg-[#f0ece8] rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-16 bg-[#f0ece8] rounded-xl animate-pulse" />
                <div className="h-16 bg-[#f0ece8] rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ContentEditor page={activePage} items={items} onRefresh={loadContent} />
      )}
    </div>
  );
}

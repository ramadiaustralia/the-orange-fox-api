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
          <h1 className="font-heading text-2xl font-bold text-gray-900">Content Editor</h1>
          <p className="text-sm text-gray-500 mt-1">Edit website content across all pages and languages</p>
        </div>
        <button
          onClick={loadContent}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-orange/30 transition-all"
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
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                activePage === p
                  ? "bg-orange/10 text-orange border border-orange/20"
                  : "bg-white text-gray-500 border border-gray-200 hover:text-gray-900 hover:border-gray-200"
              }`}
            >
              <span>{info?.title || p}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                  activePage === p
                    ? "bg-orange/20 text-orange"
                    : "bg-gray-50 text-gray-500"
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
        <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4">
          <p className="text-sm text-gray-500">{pageInfo.description}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="h-4 w-32 bg-gray-50 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
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

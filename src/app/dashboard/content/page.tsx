"use client";
import { useEffect, useState, useCallback } from "react";
import ContentEditor from "@/components/ContentEditor";
import { RefreshCw } from "lucide-react";

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

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Editor</h1>
          <p className="text-sm text-gray-500 mt-1">Edit website content across all pages and languages</p>
        </div>
        <button
          onClick={loadContent}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-dark-200 border border-dark-50/50 text-gray-400 hover:text-white hover:border-orange/30 transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Page Tabs */}
      <div className="flex flex-wrap gap-2">
        {PAGES.map((page) => (
          <button
            key={page}
            onClick={() => setActivePage(page)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 capitalize ${
              activePage === page
                ? "bg-orange/10 text-orange border border-orange/20"
                : "bg-dark-400 text-gray-400 border border-dark-50/50 hover:text-white hover:border-dark-50"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-dark-400 border border-dark-50/50 rounded-2xl p-6">
              <div className="h-4 w-32 bg-dark-200 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-20 bg-dark-200 rounded-xl animate-pulse" />
                <div className="h-20 bg-dark-200 rounded-xl animate-pulse" />
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

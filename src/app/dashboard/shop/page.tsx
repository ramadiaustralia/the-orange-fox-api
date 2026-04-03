"use client";
import { useEffect, useState } from "react";
import { ShoppingBag, Save, CheckCircle2, AlertCircle, Loader2, ExternalLink, FileText, Monitor, Search, BarChart3, Shield, CreditCard } from "lucide-react";

interface ContentItem {
  id: string;
  page: string;
  section: string;
  content_key: string;
  content_value: string;
  locale: string;
  updated_at: string;
}

interface ModuleConfig {
  key: string;
  number: number;
  name: string;
  icon: React.ElementType;
  featureCount: number;
}

const MODULES: ModuleConfig[] = [
  { key: "shop_module_1", number: 1, name: "Landing Page / Add-on", icon: FileText, featureCount: 4 },
  { key: "shop_module_2", number: 2, name: "CMS System", icon: Monitor, featureCount: 4 },
  { key: "shop_module_3", number: 3, name: "SEO Engine", icon: Search, featureCount: 4 },
  { key: "shop_module_4", number: 4, name: "Analytics Dashboard", icon: BarChart3, featureCount: 3 },
  { key: "shop_module_5", number: 5, name: "Authentication System", icon: Shield, featureCount: 3 },
  { key: "shop_module_6", number: 6, name: "Payment Integration", icon: CreditCard, featureCount: 3 },
];

export default function ShopPage() {
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingModule, setSavingModule] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  async function loadContent() {
    setLoading(true);
    try {
      const res = await fetch("/api/content?page=shop");
      const json = await res.json();
      const items: ContentItem[] = json.data || [];
      setAllContent(items);

      const values: Record<string, string> = {};
      items.forEach((item) => {
        values[`${item.content_key}_${item.locale}`] = item.content_value;
      });
      setEditValues(values);
    } catch (e) {
      console.error("Failed to load shop content", e);
    } finally {
      setLoading(false);
    }
  }

  const getContentId = (key: string, locale: string) => {
    return allContent.find((c) => c.content_key === key && c.locale === locale)?.id;
  };

  const getValue = (key: string, locale: string) => {
    return editValues[`${key}_${locale}`] || "";
  };

  const setValue = (key: string, locale: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [`${key}_${locale}`]: value }));
  };

  const handleSaveModule = async (moduleKey: string, mod: ModuleConfig) => {
    setSavingModule(moduleKey);
    try {
      const keysToSave = [
        `${moduleKey}_name`,
        `${moduleKey}_desc`,
        `${moduleKey}_price`,
        `${moduleKey}_paypal`,
        ...Array.from({ length: mod.featureCount }, (_, i) => `${moduleKey}_f${i + 1}`),
      ];

      for (const key of keysToSave) {
        for (const locale of ["en", "id"]) {
          const id = getContentId(key, locale);
          const newValue = editValues[`${key}_${locale}`];
          if (id && newValue !== undefined) {
            await fetch("/api/content", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, content_value: newValue }),
            });
          }
        }
      }
      showToast("success", `${mod.name} updated successfully!`);
      await loadContent();
    } catch (e) {
      console.error(e);
      showToast("error", "Failed to save. Please try again.");
    } finally {
      setSavingModule(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>Shop Management</h1>
          <p className="text-sm text-[#555555] mt-1">Manage product modules, prices, and PayPal links</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm p-6">
              <div className="h-6 w-40 bg-[#f0ece8] rounded animate-pulse mb-4" />
              <div className="h-10 w-24 bg-[#f0ece8] rounded animate-pulse mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-4 bg-[#f0ece8] rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-fade-in shadow-xl ${
            toast.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <ShoppingBag size={24} className="text-[#D4692A]" />
          Shop Management
        </h1>
        <p className="text-sm text-[#555555] mt-1">Manage product modules, prices, and PayPal payment links</p>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const moduleName = getValue(`${mod.key}_name`, "en") || mod.name;
          const priceEn = getValue(`${mod.key}_price`, "en");
          const paypalEn = getValue(`${mod.key}_paypal`, "en");
          const isSaving = savingModule === mod.key;
          const isExpanded = expandedModule === mod.key;

          return (
            <div
              key={mod.key}
              className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,105,42,0.06)] hover:border-[#D4692A]/30 overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4692A] to-[#b85520] flex items-center justify-center">
                      <Icon size={18} className="text-white" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#D4692A] uppercase tracking-wider">Module {mod.number}</span>
                      <h3 className="text-base font-semibold text-[#1a1a1a]">{moduleName}</h3>
                    </div>
                  </div>
                  {priceEn && (
                    <span className="text-lg font-bold text-[#D4692A]">{priceEn}</span>
                  )}
                </div>

                {/* Quick Price + PayPal */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-[#999999] mb-1 uppercase tracking-wider">Price (EN)</label>
                      <input
                        value={getValue(`${mod.key}_price`, "en")}
                        onChange={(e) => setValue(`${mod.key}_price`, "en", e.target.value)}
                        className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                        placeholder="$90"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-[#999999] mb-1 uppercase tracking-wider">Price (ID)</label>
                      <input
                        value={getValue(`${mod.key}_price`, "id")}
                        onChange={(e) => setValue(`${mod.key}_price`, "id", e.target.value)}
                        className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                        placeholder="Rp ..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-[#999999] mb-1 uppercase tracking-wider">
                      PayPal Link (EN)
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={getValue(`${mod.key}_paypal`, "en")}
                        onChange={(e) => setValue(`${mod.key}_paypal`, "en", e.target.value)}
                        className="flex-1 bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                        placeholder="https://paypal.me/..."
                      />
                      {paypalEn && (
                        <a href={paypalEn} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#D4692A]/10 text-[#D4692A] hover:bg-[#D4692A]/20 transition-colors">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-[#999999] mb-1 uppercase tracking-wider">
                      PayPal Link (ID)
                    </label>
                    <input
                      value={getValue(`${mod.key}_paypal`, "id")}
                      onChange={(e) => setValue(`${mod.key}_paypal`, "id", e.target.value)}
                      className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                      placeholder="https://paypal.me/..."
                    />
                  </div>
                </div>
              </div>

              {/* Expand Toggle */}
              <button
                onClick={() => setExpandedModule(isExpanded ? null : mod.key)}
                className="w-full px-6 py-2.5 text-xs font-medium text-[#999999] hover:text-[#D4692A] bg-[#fafafa] border-t border-[#f0ece8] hover:bg-[#D4692A]/5 transition-all"
              >
                {isExpanded ? "▲ Hide Details" : "▼ Edit Name, Description & Features"}
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-6 pb-4 pt-3 space-y-3 border-t border-[#f0ece8] bg-[#fafafa]/50">
                  {/* Module Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-[#999999] mb-1 uppercase tracking-wider">Name (EN)</label>
                      <input
                        value={getValue(`${mod.key}_name`, "en")}
                        onChange={(e) => setValue(`${mod.key}_name`, "en", e.target.value)}
                        className="w-full bg-white border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-[#999999] mb-1 uppercase tracking-wider">Name (ID)</label>
                      <input
                        value={getValue(`${mod.key}_name`, "id")}
                        onChange={(e) => setValue(`${mod.key}_name`, "id", e.target.value)}
                        className="w-full bg-white border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-[#999999] mb-1 uppercase tracking-wider">Description (EN)</label>
                      <textarea
                        value={getValue(`${mod.key}_desc`, "en")}
                        onChange={(e) => setValue(`${mod.key}_desc`, "en", e.target.value)}
                        rows={2}
                        className="w-full bg-white border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-[#999999] mb-1 uppercase tracking-wider">Description (ID)</label>
                      <textarea
                        value={getValue(`${mod.key}_desc`, "id")}
                        onChange={(e) => setValue(`${mod.key}_desc`, "id", e.target.value)}
                        rows={2}
                        className="w-full bg-white border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <label className="block text-[10px] font-medium text-[#999999] mb-2 uppercase tracking-wider">Features</label>
                    <div className="space-y-2">
                      {Array.from({ length: mod.featureCount }, (_, i) => (
                        <div key={i} className="grid grid-cols-2 gap-3">
                          <input
                            value={getValue(`${mod.key}_f${i + 1}`, "en")}
                            onChange={(e) => setValue(`${mod.key}_f${i + 1}`, "en", e.target.value)}
                            placeholder={`Feature ${i + 1} (EN)`}
                            className="w-full bg-white border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#cccccc]"
                          />
                          <input
                            value={getValue(`${mod.key}_f${i + 1}`, "id")}
                            onChange={(e) => setValue(`${mod.key}_f${i + 1}`, "id", e.target.value)}
                            placeholder={`Feature ${i + 1} (ID)`}
                            className="w-full bg-white border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-3 py-2 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#cccccc]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="px-6 pb-6 pt-3">
                <button
                  onClick={() => handleSaveModule(mod.key, mod)}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(212,105,42,0.3)] disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {isSaving ? "Saving..." : "Save Module"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

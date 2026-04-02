"use client";
import { useEffect, useState } from "react";
import { DollarSign, Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ContentItem {
  id: string;
  page: string;
  section: string;
  content_key: string;
  content_value: string;
  locale: string;
  updated_at: string;
}

interface PackageConfig {
  key: string;
  name: string;
  defaultPrice: string;
  highlight?: boolean;
}

const PACKAGES: PackageConfig[] = [
  { key: "pkg_premium_web", name: "Premium Web", defaultPrice: "$1,250" },
  { key: "pkg_exclusive_web", name: "Exclusive Web", defaultPrice: "$2,000" },
  { key: "pkg_premium_app", name: "Premium App", defaultPrice: "$1,750" },
  { key: "pkg_exclusive_app", name: "Exclusive App", defaultPrice: "$3,000" },
  { key: "pkg_ultimate", name: "Ultimate", defaultPrice: "$4,000", highlight: true },
];

const FEATURE_KEYS = ["f1", "f2", "f3", "f4", "f5", "f6", "f7"];

export default function PricingPage() {
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [savingPkg, setSavingPkg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
      const res = await fetch("/api/content");
      const json = await res.json();
      const items: ContentItem[] = json.data || [];
      const pricingItems = items.filter((item) => item.page === "pricing");
      setAllContent(pricingItems);

      // Initialize price state from content
      const priceMap: Record<string, string> = {};
      PACKAGES.forEach((pkg) => {
        const priceKey = `${pkg.key}_price`;
        ["en", "id"].forEach((locale) => {
          const item = pricingItems.find(
            (c) => c.content_key === priceKey && c.locale === locale
          );
          priceMap[`${priceKey}_${locale}`] = item?.content_value || "";
        });
      });
      setPrices(priceMap);
    } catch (e) {
      console.error("Failed to load pricing content", e);
    } finally {
      setLoading(false);
    }
  }

  const getContentValue = (key: string, locale: string = "en") => {
    const item = allContent.find((c) => c.content_key === key && c.locale === locale);
    return item?.content_value || "";
  };

  const getContentId = (key: string, locale: string = "en") => {
    const item = allContent.find((c) => c.content_key === key && c.locale === locale);
    return item?.id;
  };

  const handleSavePackage = async (pkgKey: string) => {
    setSavingPkg(pkgKey);
    try {
      const priceKey = `${pkgKey}_price`;
      for (const locale of ["en", "id"]) {
        const id = getContentId(priceKey, locale);
        const newValue = prices[`${priceKey}_${locale}`];
        if (id && newValue !== undefined) {
          await fetch("/api/content", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, content_value: newValue }),
          });
        }
      }
      showToast("success", `${PACKAGES.find((p) => p.key === pkgKey)?.name} price updated!`);
      await loadContent();
    } catch (e) {
      console.error(e);
      showToast("error", "Failed to save price. Please try again.");
    } finally {
      setSavingPkg(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Pricing Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage package prices and details</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-dark-400 border border-dark-50/50 rounded-2xl p-6">
              <div className="h-6 w-32 bg-dark-200 rounded animate-pulse mb-4" />
              <div className="h-10 w-24 bg-dark-200 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-4 bg-dark-200 rounded animate-pulse" />
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
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign size={24} className="text-orange" />
          Pricing Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage package prices and details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {PACKAGES.map((pkg) => {
          const pkgName = getContentValue(pkg.key, "en") || pkg.name;
          const pkgDesc = getContentValue(`${pkg.key}_desc`, "en");
          const features = FEATURE_KEYS.map((fk) =>
            getContentValue(`${pkg.key}_${fk}`, "en")
          ).filter(Boolean);

          const priceKeyEn = `${pkg.key}_price_en`;
          const priceKeyId = `${pkg.key}_price_id`;
          const isSaving = savingPkg === pkg.key;

          return (
            <div
              key={pkg.key}
              className={`bg-dark-400 border rounded-2xl p-6 transition-all duration-200 ${
                pkg.highlight
                  ? "border-orange/40 shadow-lg shadow-orange/10"
                  : "border-dark-50/50 hover:border-dark-50"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{pkgName}</h3>
                  {pkg.highlight && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-orange/10 text-orange border border-orange/20">
                      Best Value
                    </span>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange to-orange-700 flex items-center justify-center">
                  <DollarSign size={18} className="text-white" />
                </div>
              </div>

              {/* Description */}
              {pkgDesc && (
                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{pkgDesc}</p>
              )}

              {/* Price Inputs */}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Price (EN)
                  </label>
                  <input
                    value={prices[priceKeyEn] || ""}
                    onChange={(e) =>
                      setPrices((prev) => ({ ...prev, [priceKeyEn]: e.target.value }))
                    }
                    className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                    placeholder={pkg.defaultPrice}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Price (ID)
                  </label>
                  <input
                    value={prices[priceKeyId] || ""}
                    onChange={(e) =>
                      setPrices((prev) => ({ ...prev, [priceKeyId]: e.target.value }))
                    }
                    className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                    placeholder="Rp ..."
                  />
                </div>
              </div>

              {/* Features */}
              {features.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-400 mb-2">Features</p>
                  <ul className="space-y-1">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                        <span className="text-orange mt-0.5">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={() => handleSavePackage(pkg.key)}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-orange text-white hover:bg-orange-600 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {isSaving ? "Saving..." : "Save Price"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

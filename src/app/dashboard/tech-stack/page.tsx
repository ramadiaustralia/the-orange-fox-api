"use client";
import { useEffect, useState } from "react";
import {
  Layers,
  Plus,
  X,
  Save,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PackageOpen,
} from "lucide-react";

interface TechItem {
  name: string;
  category: string;
}

export default function TechStackPage() {
  const [items, setItems] = useState<TechItem[]>([]);
  const [contentId, setContentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<TechItem>({ name: "", category: "" });
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    loadTechStack();
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  async function loadTechStack() {
    setLoading(true);
    try {
      const res = await fetch("/api/content");
      const json = await res.json();
      const allItems = json.data || [];
      const techRow = allItems.find(
        (item: { content_key: string; page: string; section: string }) =>
          item.content_key === "tech_stack_data" &&
          item.page === "about" &&
          item.section === "tech"
      );
      if (techRow) {
        setContentId(techRow.id);
        try {
          const parsed = JSON.parse(techRow.content_value);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        } catch {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error("Failed to load tech stack", e);
    } finally {
      setLoading(false);
    }
  }

  const categories = Array.from(new Set(items.map((item) => item.category))).filter(Boolean);

  const filteredItems =
    activeFilter === "all" ? items : items.filter((item) => item.category === activeFilter);

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      Frontend: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      Backend: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      Database: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      DevOps: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      Design: "bg-pink-500/10 text-pink-400 border-pink-500/20",
      Tools: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      Mobile: "bg-[#D4692A]/10 text-[#D4692A] border-[#D4692A]/20",
    };
    return colors[cat] || "bg-[#999999]/10 text-[#999999] border-[#999999]/20";
  };

  const handleDelete = (index: number) => {
    // Find the real index in the full items array
    const item = filteredItems[index];
    const realIndex = items.indexOf(item);
    if (realIndex !== -1) {
      setItems((prev) => prev.filter((_, i) => i !== realIndex));
    }
  };

  const handleMoveUp = (index: number) => {
    const item = filteredItems[index];
    const realIndex = items.indexOf(item);
    if (realIndex > 0) {
      const newItems = [...items];
      [newItems[realIndex - 1], newItems[realIndex]] = [newItems[realIndex], newItems[realIndex - 1]];
      setItems(newItems);
    }
  };

  const handleMoveDown = (index: number) => {
    const item = filteredItems[index];
    const realIndex = items.indexOf(item);
    if (realIndex < items.length - 1) {
      const newItems = [...items];
      [newItems[realIndex], newItems[realIndex + 1]] = [newItems[realIndex + 1], newItems[realIndex]];
      setItems(newItems);
    }
  };

  const handleEditName = (index: number, name: string) => {
    const item = filteredItems[index];
    const realIndex = items.indexOf(item);
    if (realIndex !== -1) {
      const newItems = [...items];
      newItems[realIndex] = { ...newItems[realIndex], name };
      setItems(newItems);
    }
  };

  const handleEditCategory = (index: number, category: string) => {
    const item = filteredItems[index];
    const realIndex = items.indexOf(item);
    if (realIndex !== -1) {
      const newItems = [...items];
      newItems[realIndex] = { ...newItems[realIndex], category };
      setItems(newItems);
    }
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) return;
    setItems((prev) => [...prev, { name: newItem.name.trim(), category: newItem.category.trim() || "Other" }]);
    setNewItem({ name: "", category: "" });
    setShowAddForm(false);
  };

  const handleSave = async () => {
    if (!contentId) {
      showToast("error", "No tech stack content row found. Create the row first.");
      return;
    }
    setSaving(true);
    try {
      await fetch("/api/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: contentId,
          content_value: JSON.stringify(items),
        }),
      });
      showToast("success", "Tech stack saved successfully!");
    } catch (e) {
      console.error(e);
      showToast("error", "Failed to save tech stack.");
    } finally {
      setSaving(false);
    }
  };

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

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
            <Layers size={24} className="text-[#D4692A]" />
            Tech Stack
          </h1>
          <p className="text-sm text-[#555555] mt-1">
            Manage technologies displayed on the About page
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] text-[#555555] hover:text-[#D4692A] hover:border-[#D4692A]/30 bg-white transition-all"
          >
            <Plus size={14} />
            Add Tech
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(212,105,42,0.3)] disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white border border-[#D4692A]/20 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-[#1a1a1a] mb-4">Add New Technology</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">Name</label>
              <input
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                placeholder="e.g. React, Node.js"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">Category</label>
              <input
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                list="category-suggestions"
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                placeholder="e.g. Frontend, Backend"
              />
              <datalist id="category-suggestions">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddItem}
              disabled={!newItem.name.trim()}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(212,105,42,0.3)] disabled:opacity-50"
            >
              <Plus size={14} />
              Add
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewItem({ name: "", category: "" });
              }}
              className="px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] text-[#555555] hover:text-[#D4692A] hover:border-[#D4692A]/30 bg-white transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
              activeFilter === "all"
                ? "bg-[#D4692A]/10 text-[#D4692A] border border-[#D4692A]/20"
                : "bg-[#fafafa] text-[#999999] border border-[#f0ece8] hover:text-[#1a1a1a]"
            }`}
          >
            All ({items.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
                activeFilter === cat
                  ? "bg-[#D4692A]/10 text-[#D4692A] border border-[#D4692A]/20"
                  : "bg-[#fafafa] text-[#999999] border border-[#f0ece8] hover:text-[#1a1a1a]"
              }`}
            >
              {cat} ({items.filter((i) => i.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm p-5">
              <div className="h-5 w-24 bg-[#f0ece8] rounded animate-pulse mb-3" />
              <div className="h-4 w-16 bg-[#f0ece8] rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm p-12 text-center">
          <PackageOpen size={48} className="text-[#999999]/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">No technologies found</h3>
          <p className="text-sm text-[#999999] mb-4">
            {activeFilter !== "all"
              ? `No items in "${activeFilter}" category. Try a different filter.`
              : "Start building your tech stack by adding technologies above."}
          </p>
          {activeFilter !== "all" && (
            <button
              onClick={() => setActiveFilter("all")}
              className="text-sm text-[#D4692A] hover:text-[#e8853a] transition-colors"
            >
              Show all items
            </button>
          )}
        </div>
      ) : (
        /* Tech Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-enter">
          {filteredItems.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm p-5 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,105,42,0.06)] hover:border-[#D4692A]/30 transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-3">
                <input
                  value={item.name}
                  onChange={(e) => handleEditName(index, e.target.value)}
                  className="bg-transparent text-[#1a1a1a] text-sm font-medium outline-none border-b border-transparent focus:border-[#D4692A] transition-all w-full mr-2"
                />
                <button
                  onClick={() => handleDelete(index)}
                  className="p-1 rounded-lg text-[#999999] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <input
                  value={item.category}
                  onChange={(e) => handleEditCategory(index, e.target.value)}
                  list="category-suggestions"
                  className="bg-transparent text-xs text-[#555555] outline-none border-b border-transparent focus:border-[#D4692A] transition-all w-full"
                  placeholder="Category"
                />
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-md border ${getCategoryColor(
                    item.category
                  )}`}
                >
                  {item.category || "Uncategorized"}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleMoveUp(index)}
                    className="p-1 rounded text-[#999999] hover:text-[#1a1a1a] hover:bg-[#fafafa] transition-all"
                    title="Move up"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    className="p-1 rounded text-[#999999] hover:text-[#1a1a1a] hover:bg-[#fafafa] transition-all"
                    title="Move down"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

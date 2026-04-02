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
      Mobile: "bg-orange/10 text-orange border-orange/20",
    };
    return colors[cat] || "bg-gray-500/10 text-gray-500 border-gray-500/20";
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
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers size={24} className="text-orange" />
            Tech Stack
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage technologies displayed on the About page
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-200 transition-all"
          >
            <Plus size={14} />
            Add Tech
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-orange text-white hover:bg-orange-600 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white border border-orange/20 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Add New Technology</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Name</label>
              <input
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                placeholder="e.g. React, Node.js"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
              <input
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                list="category-suggestions"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
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
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-orange text-white hover:bg-orange-600 transition-all disabled:opacity-50"
            >
              <Plus size={14} />
              Add
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewItem({ name: "", category: "" });
              }}
              className="px-4 py-2 text-sm rounded-xl bg-gray-50 text-gray-500 hover:text-gray-900 transition-all"
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
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeFilter === "all"
                ? "bg-orange/10 text-orange border border-orange/20"
                : "bg-white text-gray-500 border border-gray-200 hover:text-gray-900"
            }`}
          >
            All ({items.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeFilter === cat
                  ? "bg-orange/10 text-orange border border-orange/20"
                  : "bg-white text-gray-500 border border-gray-200 hover:text-gray-900"
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
            <div key={i} className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-5">
              <div className="h-5 w-24 bg-gray-50 rounded animate-pulse mb-3" />
              <div className="h-4 w-16 bg-gray-50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-12 text-center">
          <PackageOpen size={48} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No technologies found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {activeFilter !== "all"
              ? `No items in "${activeFilter}" category. Try a different filter.`
              : "Start building your tech stack by adding technologies above."}
          </p>
          {activeFilter !== "all" && (
            <button
              onClick={() => setActiveFilter("all")}
              className="text-sm text-orange hover:text-orange-400 transition-colors"
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
              className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 p-5 hover:border-gray-200 transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-3">
                <input
                  value={item.name}
                  onChange={(e) => handleEditName(index, e.target.value)}
                  className="bg-transparent text-gray-900 text-sm font-medium outline-none border-b border-transparent focus:border-orange transition-all w-full mr-2"
                />
                <button
                  onClick={() => handleDelete(index)}
                  className="p-1 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <input
                  value={item.category}
                  onChange={(e) => handleEditCategory(index, e.target.value)}
                  list="category-suggestions"
                  className="bg-transparent text-xs text-gray-500 outline-none border-b border-transparent focus:border-orange transition-all w-full"
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
                    className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                    title="Move up"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
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

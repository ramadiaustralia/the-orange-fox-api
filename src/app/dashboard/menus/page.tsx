"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Save, X, GripVertical } from "lucide-react";

interface MenuItem {
  id: string;
  location: string;
  label: string;
  href: string;
  parent_id: string | null;
  sort_order: number;
  is_visible: boolean;
  locale: string;
  created_at: string;
}

const LOCATIONS = [
  { key: "header", label: "Header Navigation" },
  { key: "footer_framework", label: "Footer — Framework" },
  { key: "footer_main", label: "Footer — Main Links" },
];

export default function MenusPage() {
  const [activeLocation, setActiveLocation] = useState("header");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: "", href: "", locale: "en" });
  const [newForm, setNewForm] = useState({ label: "", href: "", locale: "en" });
  const [saving, setSaving] = useState(false);

  const loadMenus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/menus?location=${activeLocation}`);
      const data = await res.json();
      setItems(data.data || []);
    } catch (e) {
      console.error("Failed to load menus", e);
    } finally {
      setLoading(false);
    }
  }, [activeLocation]);

  useEffect(() => { loadMenus(); }, [loadMenus]);

  const addItem = async () => {
    if (!newForm.label || !newForm.href) return;
    setSaving(true);
    try {
      await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: activeLocation,
          label: newForm.label,
          href: newForm.href,
          locale: newForm.locale,
          sort_order: items.length,
          is_visible: true,
        }),
      });
      setNewForm({ label: "", href: "", locale: "en" });
      setShowAdd(false);
      loadMenus();
    } finally { setSaving(false); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;
    await fetch(`/api/menus?id=${id}`, { method: "DELETE" });
    loadMenus();
  };

  const toggleVisibility = async (item: MenuItem) => {
    await fetch("/api/menus", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_visible: !item.is_visible }),
    });
    loadMenus();
  };

  const moveItem = async (item: MenuItem, direction: "up" | "down") => {
    const idx = items.findIndex((i) => i.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const other = items[swapIdx];
    await Promise.all([
      fetch("/api/menus", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, sort_order: other.sort_order }),
      }),
      fetch("/api/menus", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: other.id, sort_order: item.sort_order }),
      }),
    ]);
    loadMenus();
  };

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditForm({ label: item.label, href: item.href, locale: item.locale });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await fetch("/api/menus", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
      setEditingId(null);
      loadMenus();
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Menu Manager</h1>
        <p className="text-sm text-gray-500 mt-1">Manage navigation menus for header and footer</p>
      </div>

      {/* Location Tabs */}
      <div className="flex flex-wrap gap-2">
        {LOCATIONS.map((loc) => (
          <button
            key={loc.key}
            onClick={() => { setActiveLocation(loc.key); setShowAdd(false); setEditingId(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              activeLocation === loc.key
                ? "bg-orange/10 text-orange border border-orange/20"
                : "bg-white text-gray-500 border border-gray-200 hover:text-gray-900 hover:border-gray-200"
            }`}
          >
            {loc.label}
          </button>
        ))}
      </div>

      {/* Menu Items */}
      <div className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-orange/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {LOCATIONS.find((l) => l.key === activeLocation)?.label}
            <span className="ml-2 text-xs text-gray-500">({items.length} items)</span>
          </h3>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-orange text-white hover:bg-orange-600 transition-all"
          >
            <Plus size={12} /> Add Item
          </button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <div className="px-6 py-4 border-b border-orange/20 bg-orange/5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                value={newForm.label}
                onChange={(e) => setNewForm({ ...newForm, label: e.target.value })}
                placeholder="Label"
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-2 outline-none focus:border-orange"
              />
              <input
                value={newForm.href}
                onChange={(e) => setNewForm({ ...newForm, href: e.target.value })}
                placeholder="URL (e.g. /about)"
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-2 outline-none focus:border-orange"
              />
              <select
                value={newForm.locale}
                onChange={(e) => setNewForm({ ...newForm, locale: e.target.value })}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-2 outline-none focus:border-orange"
              >
                <option value="en">English</option>
                <option value="id">Indonesian</option>
              </select>
              <div className="flex gap-2">
                <button onClick={addItem} disabled={saving} className="flex-1 px-3 py-2 text-xs rounded-lg bg-orange text-white hover:bg-orange-600 disabled:opacity-50">
                  {saving ? "Adding..." : "Add"}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-3 py-2 text-xs rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50">
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-sm">No menu items in this location</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <div key={item.id} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50/20 transition-colors group">
                <GripVertical size={14} className="text-gray-600 flex-shrink-0" />

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => moveItem(item, "up")}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-gray-50 text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-all"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveItem(item, "down")}
                    disabled={idx === items.length - 1}
                    className="p-1 rounded hover:bg-gray-50 text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-all"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {editingId === item.id ? (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      value={editForm.label}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-orange"
                    />
                    <input
                      value={editForm.href}
                      onChange={(e) => setEditForm({ ...editForm, href: e.target.value })}
                      className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-orange"
                    />
                    <select
                      value={editForm.locale}
                      onChange={(e) => setEditForm({ ...editForm, locale: e.target.value })}
                      className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-orange"
                    >
                      <option value="en">English</option>
                      <option value="id">Indonesian</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} disabled={saving} className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-orange text-white hover:bg-orange-600 disabled:opacity-50">
                        <Save size={12} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0" onClick={() => startEdit(item)}>
                      <span className="text-sm font-medium text-gray-900 cursor-pointer hover:text-orange transition-colors">{item.label}</span>
                      <span className="ml-2 text-xs text-gray-500">{item.href}</span>
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 uppercase">{item.locale}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleVisibility(item)}
                        className={`p-1.5 rounded-lg transition-all ${item.is_visible ? "text-emerald-400 hover:bg-emerald-500/10" : "text-gray-600 hover:bg-gray-50"}`}
                        title={item.is_visible ? "Visible" : "Hidden"}
                      >
                        {item.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

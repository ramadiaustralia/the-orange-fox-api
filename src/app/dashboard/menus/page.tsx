"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Save, X, GripVertical } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import AccessDenied from "@/components/AccessDenied";


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
  const { hasAccess, isOwner } = usePermission("menus");
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

  if (hasAccess === false) return <AccessDenied section="Menus" />;


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
        <h1 className="text-2xl font-bold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>Menu Manager</h1>
        <p className="text-sm text-[#555555] mt-1">Manage navigation menus for header and footer</p>
      </div>

      {/* Location Tabs */}
      <div className="flex flex-wrap gap-2">
        {LOCATIONS.map((loc) => (
          <button
            key={loc.key}
            onClick={() => { setActiveLocation(loc.key); setShowAdd(false); setEditingId(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              activeLocation === loc.key
                ? "bg-[#D4692A]/10 text-[#D4692A] border border-[#D4692A]/20"
                : "bg-[#fafafa] text-[#999999] border border-[#f0ece8] hover:text-[#1a1a1a]"
            }`}
          >
            {loc.label}
          </button>
        ))}
      </div>

      {/* Menu Items */}
      <div className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0ece8] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1a1a1a]">
            {LOCATIONS.find((l) => l.key === activeLocation)?.label}
            <span className="ml-2 text-xs text-[#999999]">({items.length} items)</span>
          </h3>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(212,105,42,0.3)]"
          >
            <Plus size={12} /> Add Item
          </button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <div className="px-6 py-4 border-b border-[#D4692A]/20 bg-[#D4692A]/5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                value={newForm.label}
                onChange={(e) => setNewForm({ ...newForm, label: e.target.value })}
                placeholder="Label"
                className="bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
              />
              <input
                value={newForm.href}
                onChange={(e) => setNewForm({ ...newForm, href: e.target.value })}
                placeholder="URL (e.g. /about)"
                className="bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
              />
              <select
                value={newForm.locale}
                onChange={(e) => setNewForm({ ...newForm, locale: e.target.value })}
                className="bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all"
              >
                <option value="en">English</option>
                <option value="id">Indonesian</option>
              </select>
              <div className="flex gap-2">
                <button onClick={addItem} disabled={saving} className="flex-1 px-4 py-2.5 text-xs font-medium rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all duration-200 disabled:opacity-50">
                  {saving ? "Adding..." : "Add"}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-3 py-2.5 text-xs rounded-xl text-[#555555] hover:text-[#D4692A] hover:bg-[#fafafa] transition-all">
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-[#f0ece8] rounded-xl animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-[#999999]">No menu items in this location</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0ece8]">
            {items.map((item, idx) => (
              <div key={item.id} className="px-6 py-3 flex items-center gap-3 hover:bg-[#fafafa]/50 transition-colors group">
                <GripVertical size={14} className="text-[#999999] flex-shrink-0" />

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => moveItem(item, "up")}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-[#fafafa] text-[#999999] hover:text-[#1a1a1a] disabled:opacity-30 transition-all"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveItem(item, "down")}
                    disabled={idx === items.length - 1}
                    className="p-1 rounded hover:bg-[#fafafa] text-[#999999] hover:text-[#1a1a1a] disabled:opacity-30 transition-all"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {editingId === item.id ? (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      value={editForm.label}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      className="bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-3 py-1.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all"
                    />
                    <input
                      value={editForm.href}
                      onChange={(e) => setEditForm({ ...editForm, href: e.target.value })}
                      className="bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-3 py-1.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all"
                    />
                    <select
                      value={editForm.locale}
                      onChange={(e) => setEditForm({ ...editForm, locale: e.target.value })}
                      className="bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-3 py-1.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all"
                    >
                      <option value="en">English</option>
                      <option value="id">Indonesian</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} disabled={saving} className="flex-1 px-3 py-1.5 text-xs font-medium rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all disabled:opacity-50">
                        <Save size={12} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs rounded-xl text-[#555555] hover:text-[#D4692A] hover:bg-[#fafafa] transition-all">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0" onClick={() => startEdit(item)}>
                      <span className="text-sm font-medium text-[#1a1a1a] cursor-pointer hover:text-[#D4692A] transition-colors">{item.label}</span>
                      <span className="ml-2 text-xs text-[#555555]">{item.href}</span>
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#fafafa] text-[#999999] uppercase border border-[#f0ece8]">{item.locale}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleVisibility(item)}
                        className={`p-1.5 rounded-lg transition-all ${item.is_visible ? "text-[#D4692A] hover:bg-[#D4692A]/10" : "text-[#999999] hover:bg-[#fafafa]"}`}
                        title={item.is_visible ? "Visible" : "Hidden"}
                      >
                        {item.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1.5 rounded-lg text-[#999999] hover:text-red-400 hover:bg-red-500/10 transition-all"
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

"use client";
import { useState } from "react";
import { Save, Languages, Clock, User, Plus, FileEdit } from "lucide-react";
import { getLabel, getType, getSectionGroup, SECTION_INFO, CONTENT_LABELS } from "@/lib/contentLabels";

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

interface GroupedBySection {
  [sectionGroup: string]: {
    [key: string]: { en?: ContentItem; id?: ContentItem };
  };
}

interface ContentEditorProps {
  page: string;
  items: ContentItem[];
  onRefresh: () => void;
}

export default function ContentEditor({ page, items, onRefresh }: ContentEditorProps) {
  const [editing, setEditing] = useState<Record<string, { en: string; id: string }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const [newItem, setNewItem] = useState({ section: "", content_key: "", en: "", id: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [addSaving, setAddSaving] = useState(false);

  // Group by logical section (from contentLabels) then by content_key
  const grouped: GroupedBySection = {};
  items.forEach((item) => {
    const sectionGroup = getSectionGroup(item.content_key, item.section);
    if (!grouped[sectionGroup]) grouped[sectionGroup] = {};
    if (!grouped[sectionGroup][item.content_key]) grouped[sectionGroup][item.content_key] = {};
    grouped[sectionGroup][item.content_key][item.locale as "en" | "id"] = item;
  });

  const startEdit = (sectionGroup: string, key: string, en: string, id: string) => {
    const k = `${sectionGroup}::${key}`;
    setEditing((prev) => ({ ...prev, [k]: { en, id } }));
  };

  const updateEdit = (sectionGroup: string, key: string, locale: "en" | "id", value: string) => {
    const k = `${sectionGroup}::${key}`;
    setEditing((prev) => ({
      ...prev,
      [k]: { ...prev[k], [locale]: value },
    }));
  };

  const cancelEdit = (sectionGroup: string, key: string) => {
    const k = `${sectionGroup}::${key}`;
    setEditing((prev) => {
      const n = { ...prev };
      delete n[k];
      return n;
    });
  };

  const saveItem = async (sectionGroup: string, key: string) => {
    const k = `${sectionGroup}::${key}`;
    const vals = editing[k];
    if (!vals) return;
    setSaving((prev) => ({ ...prev, [k]: true }));

    try {
      const pair = grouped[sectionGroup]?.[key];
      // Save EN
      if (pair?.en) {
        await fetch("/api/content", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: pair.en.id, content_value: vals.en }),
        });
      }
      // Save ID
      if (pair?.id) {
        await fetch("/api/content", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: pair.id.id, content_value: vals.id }),
        });
      }
      cancelEdit(sectionGroup, key);
      onRefresh();
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setSaving((prev) => ({ ...prev, [k]: false }));
    }
  };

  const autoTranslate = async (sectionGroup: string, key: string, from: "en" | "id") => {
    const k = `${sectionGroup}::${key}`;
    const vals = editing[k];
    const sourceText = vals ? vals[from] : grouped[sectionGroup]?.[key]?.[from]?.content_value;
    if (!sourceText) return;

    setTranslating((prev) => ({ ...prev, [k]: true }));
    try {
      const to = from === "en" ? "id" : "en";
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText, from, to }),
      });
      const data = await res.json();
      if (data.translated) {
        const pair = grouped[sectionGroup]?.[key];
        const currentEn = vals?.en ?? pair?.en?.content_value ?? "";
        const currentId = vals?.id ?? pair?.id?.content_value ?? "";
        const newVals = {
          en: to === "en" ? data.translated : currentEn,
          id: to === "id" ? data.translated : currentId,
        };
        setEditing((prev) => ({ ...prev, [k]: newVals }));
      }
    } catch (e) {
      console.error("Translation failed", e);
    } finally {
      setTranslating((prev) => ({ ...prev, [k]: false }));
    }
  };

  const addNewItem = async () => {
    if (!newItem.section || !newItem.content_key) return;
    setAddSaving(true);
    try {
      // Add EN version
      if (newItem.en) {
        await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page,
            section: newItem.section,
            content_key: newItem.content_key,
            content_value: newItem.en,
            locale: "en",
          }),
        });
      }
      // Add ID version
      if (newItem.id) {
        await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page,
            section: newItem.section,
            content_key: newItem.content_key,
            content_value: newItem.id,
            locale: "id",
          }),
        });
      }
      setNewItem({ section: "", content_key: "", en: "", id: "" });
      setShowAdd(false);
      onRefresh();
    } catch (e) {
      console.error("Add failed", e);
    } finally {
      setAddSaving(false);
    }
  };

  // Determine textarea rows based on type
  const getRows = (type: "short" | "long" | "multiline"): number => {
    if (type === "multiline") return 4;
    if (type === "long") return 2;
    return 1;
  };

  const sections = Object.keys(grouped).sort((a, b) => {
    // Sort sections by the order they appear in SECTION_INFO
    const sectionKeys = Object.keys(SECTION_INFO);
    const ai = sectionKeys.indexOf(a);
    const bi = sectionKeys.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div className="space-y-6">
      {sections.length === 0 && (
        <div className="text-center py-16">
          <FileEdit size={40} className="mx-auto mb-3 text-[#999999]/40" />
          <p className="text-lg font-semibold text-[#1a1a1a] mb-2">No content items yet</p>
          <p className="text-sm text-[#999999]">
            Add your first content item for the <span className="text-[#D4692A] font-medium">{page}</span> page
          </p>
        </div>
      )}

      {sections.map((sectionGroup) => {
        const info = SECTION_INFO[sectionGroup];
        return (
          <div key={sectionGroup} className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,105,42,0.06)] hover:border-[#D4692A]/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f0ece8] bg-[#fafafa]/50">
              <h3
                className="text-sm font-semibold text-[#1a1a1a] tracking-wider"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {info?.title || sectionGroup.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </h3>
              {info?.description && (
                <p className="text-xs text-[#999999] mt-0.5">{info.description}</p>
              )}
            </div>
            <div className="divide-y divide-[#f0ece8]">
              {Object.entries(grouped[sectionGroup]).map(([contentKey, pair]) => {
                const k = `${sectionGroup}::${contentKey}`;
                const isEditing = !!editing[k];
                const isSaving = saving[k];
                const isTranslating = translating[k];
                const enVal = isEditing ? editing[k].en : (pair.en?.content_value ?? "");
                const idVal = isEditing ? editing[k].id : (pair.id?.content_value ?? "");
                const lastUpdate = pair.en?.updated_at || pair.id?.updated_at;
                const updatedBy = pair.en?.updated_by || pair.id?.updated_by;
                const inputType = getType(contentKey);
                const rows = getRows(inputType);
                const labelInfo = CONTENT_LABELS[contentKey];

                return (
                  <div key={contentKey} className="p-6 hover:bg-[#fafafa]/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-sm font-semibold text-[#D4692A]">{getLabel(contentKey)}</span>
                        {labelInfo?.description && (
                          <p className="text-xs text-[#999999] mt-0.5">{labelInfo.description}</p>
                        )}
                        <p className="text-[10px] text-[#999999] mt-0.5 font-mono">{contentKey}</p>
                        {lastUpdate && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-[#999999]">
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {new Date(lastUpdate).toLocaleDateString()}
                            </span>
                            {updatedBy && (
                              <span className="flex items-center gap-1">
                                <User size={10} /> {updatedBy}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing && (
                          <>
                            <button
                              onClick={() => cancelEdit(sectionGroup, contentKey)}
                              className="px-3 py-1.5 text-xs rounded-xl border border-[#e8e4e0] text-[#555555] hover:text-[#1a1a1a] hover:border-[#D4692A]/30 transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveItem(sectionGroup, contentKey)}
                              disabled={isSaving}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(212,105,42,0.3)] disabled:opacity-50"
                            >
                              <Save size={12} />
                              {isSaving ? "Saving..." : "Save"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* English */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-[#555555] flex items-center gap-1.5">
                            🇬🇧 English
                          </label>
                          {isEditing && (
                            <button
                              onClick={() => autoTranslate(sectionGroup, contentKey, "en")}
                              disabled={isTranslating}
                              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-[#D4692A]/10 text-[#D4692A] hover:bg-[#D4692A]/20 transition-all disabled:opacity-50"
                            >
                              <Languages size={10} />
                              {isTranslating ? "..." : "EN → ID"}
                            </button>
                          )}
                        </div>
                        {isEditing ? (
                          inputType === "short" ? (
                            <input
                              type="text"
                              value={enVal}
                              onChange={(e) => updateEdit(sectionGroup, contentKey, "en", e.target.value)}
                              className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                            />
                          ) : (
                            <textarea
                              value={enVal}
                              onChange={(e) => updateEdit(sectionGroup, contentKey, "en", e.target.value)}
                              rows={rows}
                              className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all resize-y placeholder:text-[#999999]"
                            />
                          )
                        ) : (
                          <div
                            onClick={() => startEdit(sectionGroup, contentKey, enVal, idVal)}
                            className="bg-[#fafafa] border border-[#f0ece8] rounded-xl px-4 py-2.5 text-sm text-[#555555] cursor-pointer hover:border-[#D4692A]/30 hover:bg-[#fafafa] transition-all min-h-[48px]"
                          >
                            {enVal || <span className="text-[#999999] italic">Click to edit...</span>}
                          </div>
                        )}
                      </div>

                      {/* Indonesian */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-[#555555] flex items-center gap-1.5">
                            🇮🇩 Indonesian
                          </label>
                          {isEditing && (
                            <button
                              onClick={() => autoTranslate(sectionGroup, contentKey, "id")}
                              disabled={isTranslating}
                              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-[#D4692A]/10 text-[#D4692A] hover:bg-[#D4692A]/20 transition-all disabled:opacity-50"
                            >
                              <Languages size={10} />
                              {isTranslating ? "..." : "ID → EN"}
                            </button>
                          )}
                        </div>
                        {isEditing ? (
                          inputType === "short" ? (
                            <input
                              type="text"
                              value={idVal}
                              onChange={(e) => updateEdit(sectionGroup, contentKey, "id", e.target.value)}
                              className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                            />
                          ) : (
                            <textarea
                              value={idVal}
                              onChange={(e) => updateEdit(sectionGroup, contentKey, "id", e.target.value)}
                              rows={rows}
                              className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all resize-y placeholder:text-[#999999]"
                            />
                          )
                        ) : (
                          <div
                            onClick={() => startEdit(sectionGroup, contentKey, enVal, idVal)}
                            className="bg-[#fafafa] border border-[#f0ece8] rounded-xl px-4 py-2.5 text-sm text-[#555555] cursor-pointer hover:border-[#D4692A]/30 hover:bg-[#fafafa] transition-all min-h-[48px]"
                          >
                            {idVal || <span className="text-[#999999] italic">Click to edit...</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Add New Content */}
      {showAdd ? (
        <div className="bg-white border border-[#D4692A]/20 rounded-2xl shadow-sm p-6 animate-fade-in">
          <h3
            className="text-sm font-semibold text-[#1a1a1a] mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Add New Content Item
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">Section</label>
              <input
                value={newItem.section}
                onChange={(e) => setNewItem({ ...newItem, section: e.target.value })}
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                placeholder="e.g. hero, features, cta"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">Content Key</label>
              <input
                value={newItem.content_key}
                onChange={(e) => setNewItem({ ...newItem, content_key: e.target.value })}
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                placeholder="e.g. title, description, button_text"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">🇬🇧 English Value</label>
              <textarea
                value={newItem.en}
                onChange={(e) => setNewItem({ ...newItem, en: e.target.value })}
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 min-h-[80px] resize-y transition-all placeholder:text-[#999999]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">🇮🇩 Indonesian Value</label>
              <textarea
                value={newItem.id}
                onChange={(e) => setNewItem({ ...newItem, id: e.target.value })}
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 min-h-[80px] resize-y transition-all placeholder:text-[#999999]"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addNewItem}
              disabled={addSaving || !newItem.section || !newItem.content_key}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(212,105,42,0.3)] hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Plus size={14} /> {addSaving ? "Adding..." : "Add Item"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] text-[#555555] hover:text-[#D4692A] hover:border-[#D4692A]/30 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-4 border-2 border-dashed border-[#e8e4e0] rounded-2xl text-[#999999] hover:text-[#D4692A] hover:border-[#D4692A]/30 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={16} /> Add New Content Item
        </button>
      )}
    </div>
  );
}

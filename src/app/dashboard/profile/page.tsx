"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  UserCircle, Camera, Save, X, Plus, Trash2, Shield, Lock,
  Eye, EyeOff, ChevronDown, ChevronUp, Check, AlertCircle,
} from "lucide-react";

/* ── Types ── */
interface TeamMember {
  id: string;
  email: string;
  display_name: string;
  position: string;
  role: string;
  permissions: { can_edit?: string[]; profile_editable?: boolean };
  profile_pic_url: string | null;
  plain_password: string | null;
  is_frozen: boolean;
  created_at: string;
}

const DASHBOARD_SECTIONS = [
  { key: "content", label: "Content Editor" },
  { key: "seo", label: "SEO & Analytics" },
  { key: "shop", label: "Shop" },
  { key: "orders", label: "Orders" },
  { key: "menus", label: "Menus" },
  { key: "pricing", label: "Pricing" },
  { key: "contact", label: "Contact" },
  { key: "tech-stack", label: "Tech Stack" },
  { key: "messages", label: "Customer Project Request" },
  { key: "settings", label: "Settings" },
];

/* ── Reveal hook ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add("visible"); obs.unobserve(el); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useReveal();
  return <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}s` }}>{children}</div>;
}

/* ── Toast ── */
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border ${
      type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
    }`} style={{ animation: "heroSlideUp 0.3s ease-out" }}>
      {type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  /* ── Profile state ── */
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: "", position: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  /* ── Password state ── */
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  /* ── Team state ── */
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ email: "", password: "", display_name: "", position: "" });
  const [showAddPw, setShowAddPw] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);

  const isOwner = user?.role === "owner";
  const canEditProfile = isOwner || user?.permissions?.profile_editable;

  /* ── Load team ── */
  const loadTeam = useCallback(async () => {
    if (!isOwner) return;
    setLoadingTeam(true);
    try {
      const res = await fetch("/api/auth/users");
      const data = await res.json();
      if (data.users) setTeam(data.users);
    } catch { /* ignore */ }
    setLoadingTeam(false);
  }, [isOwner]);

  useEffect(() => {
    if (user) {
      setProfileForm({ display_name: user.display_name || "", position: user.position || "" });
    }
    loadTeam();
  }, [user, loadTeam]);

  /* ── Profile handlers ── */
  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: "Profile updated", type: "success" });
        setEditingProfile(false);
        refreshUser();
      } else {
        setToast({ message: data.error || "Failed to update", type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    }
    setSavingProfile(false);
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>, userId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    if (userId) form.append("userId", userId);
    try {
      const res = await fetch("/api/upload/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (data.success) {
        setToast({ message: "Avatar updated", type: "success" });
        refreshUser();
        if (userId) loadTeam();
      } else {
        setToast({ message: data.error || "Upload failed", type: "error" });
      }
    } catch {
      setToast({ message: "Upload failed", type: "error" });
    }
  };

  /* ── Password handler ── */
  const changePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm) {
      setToast({ message: "Passwords don't match", type: "error" });
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setToast({ message: "Password must be at least 6 characters", type: "error" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: "Password changed", type: "success" });
        setShowPassword(false);
        setPasswordForm({ current_password: "", new_password: "", confirm: "" });
      } else {
        setToast({ message: data.error || "Failed", type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    }
    setSavingPassword(false);
  };

  /* ── Team handlers ── */
  const addMember = async () => {
    if (!addForm.email || !addForm.password) {
      setToast({ message: "Email and password are required", type: "error" });
      return;
    }
    setSavingAdd(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: "Team member added", type: "success" });
        setShowAddModal(false);
        setAddForm({ email: "", password: "", display_name: "", position: "" });
        loadTeam();
      } else {
        setToast({ message: data.error || "Failed", type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    }
    setSavingAdd(false);
  };

  const updateMember = async (id: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/auth/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: "Member updated", type: "success" });
        loadTeam();
      } else {
        setToast({ message: data.error || "Failed", type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    }
  };

  const deleteMember = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/auth/users?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setToast({ message: "Member removed", type: "success" });
        loadTeam();
      } else {
        setToast({ message: data.error || "Failed", type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    }
  };

  const togglePermission = (member: TeamMember, key: string) => {
    const current = member.permissions?.can_edit || [];
    const updated = current.includes(key)
      ? current.filter((k: string) => k !== key)
      : [...current, key];
    updateMember(member.id, {
      permissions: { ...member.permissions, can_edit: updated },
    });
  };

  const toggleProfileEditable = (member: TeamMember) => {
    updateMember(member.id, {
      permissions: {
        ...member.permissions,
        profile_editable: !member.permissions?.profile_editable,
      },
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Page Header ── */}
      <Reveal>
        <div className="flex items-center gap-3">
          <div className="w-6 h-[2px] bg-orange" />
          <h1 className="text-2xl font-bold text-text-primary" style={{ fontFamily: "var(--font-heading)" }}>
            My Profile
          </h1>
        </div>
      </Reveal>

      {/* ── Profile Card ── */}
      <Reveal delay={0.1}>
        <div className="bg-white rounded-2xl border border-border-custom p-8 shadow-sm">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              {user.profile_pic_url ? (
                <img
                  src={user.profile_pic_url}
                  alt={user.display_name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-border-custom"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange/10 to-orange/5 border-2 border-border-custom flex items-center justify-center">
                  <UserCircle size={40} className="text-orange/40" />
                </div>
              )}
              {canEditProfile && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera size={20} className="text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadAvatar(e)} />
                </label>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              {editingProfile ? (
                <div className="space-y-3">
                  <input
                    value={profileForm.display_name}
                    onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                    className="w-full text-lg font-bold border border-border-custom rounded-xl px-4 py-2 focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none"
                    placeholder="Full name"
                  />
                  <input
                    value={profileForm.position}
                    onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })}
                    className="w-full text-sm border border-border-custom rounded-xl px-4 py-2 focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none"
                    placeholder="Position (e.g. CEO)"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveProfile}
                      disabled={savingProfile}
                      className="flex items-center gap-2 px-4 py-2 bg-orange text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      <Save size={14} /> {savingProfile ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingProfile(false)}
                      className="flex items-center gap-2 px-4 py-2 border border-border-custom rounded-xl text-sm text-text-secondary hover:bg-gray-50 transition-colors"
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                    {user.display_name || "No name set"}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    {user.position && (
                      <span className="text-sm font-medium text-orange bg-orange/10 px-3 py-0.5 rounded-full">
                        {user.position}
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                      user.role === "owner" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {user.role === "owner" ? "Owner" : "Team Member"}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-2">{user.email}</p>
                  {canEditProfile && (
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="mt-3 text-sm text-orange hover:text-orange-600 font-medium transition-colors"
                    >
                      Edit Profile
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── Security ── */}
      <Reveal delay={0.2}>
        <div className="bg-white rounded-2xl border border-border-custom p-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-text-secondary" />
              <h3 className="font-bold text-text-primary" style={{ fontFamily: "var(--font-heading)" }}>Security</h3>
            </div>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="text-sm text-orange hover:text-orange-600 font-medium transition-colors"
            >
              {showPassword ? "Cancel" : "Change Password"}
            </button>
          </div>

          {showPassword && (
            <div className="space-y-3 mt-4 pt-4 border-t border-border-light">
              <div className="relative">
                <input
                  type={showCurrentPw ? "text" : "password"}
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className="w-full border border-border-custom rounded-xl px-4 py-2.5 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none pr-10"
                  placeholder="Current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="w-full border border-border-custom rounded-xl px-4 py-2.5 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none pr-10"
                  placeholder="New password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  className="w-full border border-border-custom rounded-xl px-4 py-2.5 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none pr-10"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                onClick={changePassword}
                disabled={savingPassword}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                <Save size={14} /> {savingPassword ? "Saving..." : "Update Password"}
              </button>
            </div>
          )}
        </div>
      </Reveal>

      {/* ── Team Management (Owner only) ── */}
      {isOwner && (
        <Reveal delay={0.3}>
          <div className="bg-white rounded-2xl border border-border-custom p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Shield size={18} className="text-text-secondary" />
                <h3 className="font-bold text-text-primary" style={{ fontFamily: "var(--font-heading)" }}>Team Management</h3>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                <Plus size={14} /> Add Member
              </button>
            </div>

            {loadingTeam ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-orange border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {team.filter((m) => m.id !== user.id).map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    expanded={editingMember === member.id}
                    onToggle={() => setEditingMember(editingMember === member.id ? null : member.id)}
                    onUpdate={updateMember}
                    onDelete={deleteMember}
                    onTogglePermission={togglePermission}
                    onToggleProfileEditable={toggleProfileEditable}
                    onUploadAvatar={uploadAvatar}
                  />
                ))}
                {team.filter((m) => m.id !== user.id).length === 0 && (
                  <div className="text-center py-8 text-text-muted text-sm">
                    No team members yet. Click &quot;Add Member&quot; to invite someone.
                  </div>
                )}
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* ── Add Member Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div
            className="bg-white rounded-2xl border border-border-custom shadow-2xl w-full max-w-md p-6"
            style={{ animation: "heroSlideUp 0.3s ease-out" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-text-primary text-lg" style={{ fontFamily: "var(--font-heading)" }}>
                Add Team Member
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                className="w-full border border-border-custom rounded-xl px-4 py-2.5 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none"
                placeholder="Email address"
                type="email"
              />
              <div className="relative">
                <input
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full border border-border-custom rounded-xl px-4 py-2.5 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none pr-10"
                  placeholder="Password (min 6 characters)"
                  type={showAddPw ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowAddPw(!showAddPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showAddPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <input
                value={addForm.display_name}
                onChange={(e) => setAddForm({ ...addForm, display_name: e.target.value })}
                className="w-full border border-border-custom rounded-xl px-4 py-2.5 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none"
                placeholder="Full name (optional)"
              />
              <input
                value={addForm.position}
                onChange={(e) => setAddForm({ ...addForm, position: e.target.value })}
                className="w-full border border-border-custom rounded-xl px-4 py-2.5 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none"
                placeholder="Position (optional)"
              />
              <button
                onClick={addMember}
                disabled={savingAdd}
                className="w-full px-5 py-2.5 bg-orange text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {savingAdd ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Member Card Component ── */
function MemberCard({
  member,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onTogglePermission,
  onToggleProfileEditable,
  onUploadAvatar,
}: {
  member: TeamMember;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onDelete: (id: string, name: string) => void;
  onTogglePermission: (member: TeamMember, key: string) => void;
  onToggleProfileEditable: (member: TeamMember) => void;
  onUploadAvatar: (e: React.ChangeEvent<HTMLInputElement>, userId: string) => void;
}) {
  const [showMemberPw, setShowMemberPw] = useState(false);
  const [showEditPw, setShowEditPw] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: member.display_name || "",
    email: member.email || "",
    position: member.position || "",
    password: "",
  });

  const permCount = member.permissions?.can_edit?.length || 0;

  return (
    <div className="border border-border-custom rounded-xl overflow-hidden transition-all">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {member.profile_pic_url ? (
            <img src={member.profile_pic_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-orange/10 flex items-center justify-center">
              <UserCircle size={20} className="text-orange/40" />
            </div>
          )}
          <div className="text-left">
            <p className="font-semibold text-sm text-text-primary">{member.display_name || "No name"}</p>
            <p className="text-xs text-text-muted">
              {member.email || "No email"} {member.position && `· ${member.position}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {member.is_frozen && (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
              Frozen
            </span>
          )}
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
            permCount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
          }`}>
            {permCount} permission{permCount !== 1 ? "s" : ""}
          </span>
          {expanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border-light">
          {/* Avatar upload */}
          <div className="flex items-center gap-3 pt-4">
            <div className="relative group">
              {member.profile_pic_url ? (
                <img src={member.profile_pic_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-border-custom" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-orange/10 border border-border-custom flex items-center justify-center">
                  <UserCircle size={24} className="text-orange/40" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={14} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onUploadAvatar(e, member.id)} />
              </label>
            </div>
            <span className="text-xs text-text-muted">Hover to change photo</span>
          </div>

          {/* Edit fields */}
          <div className="grid grid-cols-2 gap-3">
            <input
              value={editForm.display_name}
              onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
              onBlur={() => {
                if (editForm.display_name !== member.display_name) {
                  onUpdate(member.id, { display_name: editForm.display_name });
                }
              }}
              className="border border-border-custom rounded-xl px-3 py-2 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none"
              placeholder="Full name"
            />
            <input
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              onBlur={() => {
                if (editForm.email !== (member.email || "")) {
                  onUpdate(member.id, { email: editForm.email });
                }
              }}
              className="border border-border-custom rounded-xl px-3 py-2 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none"
              placeholder="Email"
            />
            <input
              value={editForm.position}
              onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
              onBlur={() => {
                if (editForm.position !== (member.position || "")) {
                  onUpdate(member.id, { position: editForm.position });
                }
              }}
              className="border border-border-custom rounded-xl px-3 py-2 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none"
              placeholder="Position"
            />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full border border-border-custom rounded-xl px-3 py-2 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none pr-9"
                  placeholder="New password"
                  type={showEditPw ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPw(!showEditPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showEditPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {editForm.password && (
                <button
                  onClick={() => {
                    onUpdate(member.id, { password: editForm.password });
                    setEditForm({ ...editForm, password: "" });
                  }}
                  className="px-3 py-2 bg-orange text-white rounded-xl text-xs font-medium hover:bg-orange-600 transition-colors"
                >
                  Set
                </button>
              )}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Dashboard Permissions
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DASHBOARD_SECTIONS.map((section) => {
                const active = member.permissions?.can_edit?.includes(section.key);
                return (
                  <button
                    key={section.key}
                    onClick={() => onTogglePermission(member, section.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                      active
                        ? "bg-orange/10 border-orange/30 text-orange"
                        : "bg-gray-50 border-border-custom text-text-muted hover:border-orange/30"
                    }`}
                  >
                    {section.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Password (visible to owner) */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-text-muted" />
                <span className="text-sm text-text-secondary">Current Password</span>
              </div>
              {member.plain_password ? (
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded-lg">
                    {showMemberPw ? member.plain_password : "••••••••"}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowMemberPw(!showMemberPw)}
                    className="text-text-muted hover:text-text-secondary"
                  >
                    {showMemberPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              ) : (
                <span className="text-xs text-amber-500 italic">Will be captured on next login</span>
              )}
            </div>

          {/* Freeze / Activate Account */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Shield size={14} className={member.is_frozen ? "text-red-500" : "text-text-muted"} />
              <span className="text-sm text-text-secondary">
                {member.is_frozen ? "Account is frozen" : "Account is active"}
              </span>
            </div>
            <button
              onClick={() => onUpdate(member.id, { is_frozen: !member.is_frozen })}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                member.is_frozen
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-red-100 text-red-600 hover:bg-red-200"
              }`}
            >
              {member.is_frozen ? "Activate" : "Freeze"}
            </button>
          </div>

          {/* Profile editable toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-secondary">Allow member to edit their own profile</span>
            <button
              onClick={() => onToggleProfileEditable(member)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                member.permissions?.profile_editable ? "bg-orange" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  member.permissions?.profile_editable ? "left-5" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Delete */}
          <div className="pt-2 border-t border-border-light">
            <button
              onClick={() => onDelete(member.id, member.display_name || member.email || "this member")}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              <Trash2 size={14} /> Remove Member
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

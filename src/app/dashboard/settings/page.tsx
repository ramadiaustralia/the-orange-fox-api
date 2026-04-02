"use client";
import { useState, useEffect } from "react";
import { Save, User, Lock, Globe, Shield, CheckCircle2, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const [admin, setAdmin] = useState({ username: "", display_name: "" });
  const [password, setPassword] = useState({ current: "", new_password: "", confirm: "" });
  const [siteSettings, setSiteSettings] = useState({
    site_name: "The Orange Fox",
    site_url: "https://the-orange-fox-web.vercel.app",
    logo_url: "",
    contact_email: "hello@theorangefox.com",
    default_locale: "en",
  });
  const [changingPw, setChangingPw] = useState(false);
  const [savingSiteSettings, setSavingSiteSettings] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadAdmin() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.admin) {
            setAdmin({
              username: data.admin.username || "",
              display_name: data.admin.display_name || "",
            });
          }
        }
      } catch (e) {
        console.error("Failed to load admin info", e);
      }
    }
    loadAdmin();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg("");
    setTimeout(() => setErrorMsg(""), 5000);
  };

  const handlePasswordChange = async () => {
    if (!password.current || !password.new_password) {
      showError("Please fill in both current and new password.");
      return;
    }
    if (password.new_password !== password.confirm) {
      showError("New passwords don't match.");
      return;
    }
    if (password.new_password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }

    setChangingPw(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: password.current,
          new_password: password.new_password,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showSuccess("Password changed successfully!");
        setPassword({ current: "", new_password: "", confirm: "" });
      } else {
        showError(data.error || "Failed to change password.");
      }
    } catch (e) {
      console.error(e);
      showError("Failed to change password. Please try again.");
    } finally {
      setChangingPw(false);
    }
  };

  const handleSaveSiteSettings = async () => {
    setSavingSiteSettings(true);
    try {
      const settings = [
        { key: "site_name", value: siteSettings.site_name },
        { key: "site_url", value: siteSettings.site_url },
        { key: "logo_url", value: siteSettings.logo_url },
        { key: "contact_email", value: siteSettings.contact_email },
        { key: "default_locale", value: siteSettings.default_locale },
      ];

      for (const s of settings) {
        await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: "global",
            section: "site_settings",
            content_key: s.key,
            content_value: s.value,
            locale: "en",
          }),
        });
      }
      showSuccess("Site settings saved successfully!");
    } catch (e) {
      console.error(e);
      showError("Failed to save site settings.");
    } finally {
      setSavingSiteSettings(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and site settings</p>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm animate-fade-in shadow-xl">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      {/* Error Toast */}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm animate-fade-in shadow-xl">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Admin Profile */}
      <div className="bg-dark-400 border border-dark-50/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-50/50 flex items-center gap-2">
          <User size={16} className="text-orange" />
          <h3 className="text-sm font-semibold text-white">Admin Profile</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange to-orange-700 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-orange/20">
              {admin.display_name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white">{admin.display_name || "Admin"}</h4>
              <p className="text-sm text-gray-500">@{admin.username || "admin"}</p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-[10px] rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield size={10} /> Administrator
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
              <input
                value={admin.username}
                disabled
                className="w-full bg-dark-200/50 border border-dark-50/50 text-gray-500 text-sm rounded-xl px-4 py-3 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Display Name</label>
              <input
                value={admin.display_name}
                disabled
                className="w-full bg-dark-200/50 border border-dark-50/50 text-gray-500 text-sm rounded-xl px-4 py-3 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-dark-400 border border-dark-50/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-50/50 flex items-center gap-2">
          <Lock size={16} className="text-orange" />
          <h3 className="text-sm font-semibold text-white">Change Password</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Current Password</label>
            <input
              type="password"
              value={password.current}
              onChange={(e) => setPassword({ ...password, current: e.target.value })}
              className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
              placeholder="Enter current password"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">New Password</label>
              <input
                type="password"
                value={password.new_password}
                onChange={(e) => setPassword({ ...password, new_password: e.target.value })}
                className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={password.confirm}
                onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={changingPw || !password.current || !password.new_password}
            className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-orange text-white hover:bg-orange-600 transition-all disabled:opacity-50"
          >
            <Lock size={14} />
            {changingPw ? "Changing..." : "Change Password"}
          </button>
        </div>
      </div>

      {/* Site Settings */}
      <div className="bg-dark-400 border border-dark-50/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-50/50 flex items-center gap-2">
          <Globe size={16} className="text-orange" />
          <h3 className="text-sm font-semibold text-white">Site Settings</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Site Name</label>
              <input
                value={siteSettings.site_name}
                onChange={(e) => setSiteSettings({ ...siteSettings, site_name: e.target.value })}
                className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Site URL</label>
              <input
                value={siteSettings.site_url}
                onChange={(e) => setSiteSettings({ ...siteSettings, site_url: e.target.value })}
                className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Logo URL</label>
              <input
                value={siteSettings.logo_url}
                onChange={(e) => setSiteSettings({ ...siteSettings, logo_url: e.target.value })}
                className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Contact Email</label>
              <input
                value={siteSettings.contact_email}
                onChange={(e) => setSiteSettings({ ...siteSettings, contact_email: e.target.value })}
                className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Default Locale</label>
            <select
              value={siteSettings.default_locale}
              onChange={(e) => setSiteSettings({ ...siteSettings, default_locale: e.target.value })}
              className="w-full bg-dark-200 border border-dark-50 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-orange transition-all max-w-xs"
            >
              <option value="en">English</option>
              <option value="id">Indonesian</option>
            </select>
          </div>
          <button
            onClick={handleSaveSiteSettings}
            disabled={savingSiteSettings}
            className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-orange text-white hover:bg-orange-600 transition-all disabled:opacity-50"
          >
            <Save size={14} />
            {savingSiteSettings ? "Saving..." : "Save Site Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

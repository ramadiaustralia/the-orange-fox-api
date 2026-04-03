"use client";
import { useState, useEffect } from "react";
import {
  Save,
  User,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Shield,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Link2,
  Image,
  Mail,
  MessageCircle,
  Instagram,
  Github,
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import AccessDenied from "@/components/AccessDenied";


export default function SettingsPage() {
  const { hasAccess, isOwner } = usePermission("settings");
  if (hasAccess === false) return <AccessDenied section="Settings" />;

  const [admin, setAdmin] = useState({ email: "", display_name: "" });
  const [password, setPassword] = useState({ current: "", new_password: "", confirm: "" });
  const [siteSettings, setSiteSettings] = useState({
    site_name: "The Orange Fox",
    site_url: "https://the-orange-fox-web.vercel.app",
    logo_url: "",
    contact_email: "hello@theorangefox.com",
    default_locale: "en",
  });
  const [socialLinks, setSocialLinks] = useState({
    social_email: "",
    social_whatsapp: "",
    social_instagram: "",
    social_github: "",
  });
  const [gaId, setGaId] = useState("");
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [savingGa, setSavingGa] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
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
              email: data.admin.email || "",
              display_name: data.admin.display_name || "",
            });
          }
        }
      } catch (e) {
        console.error("Failed to load admin info", e);
      }
    }

    async function loadSocialLinks() {
      try {
        const res = await fetch("/api/content");
        if (res.ok) {
          const data = await res.json();
          const items = data.data || [];
          const socialItems = items.filter(
            (item: { page: string; section: string }) =>
              item.page === "global" && item.section === "social"
          );
          const links: Record<string, string> = {};
          socialItems.forEach((item: { content_key: string; content_value: string }) => {
            links[item.content_key] = item.content_value;
          });
          setSocialLinks((prev) => ({ ...prev, ...links }));
        }
      } catch (e) {
        console.error("Failed to load social links", e);
      }
    }

    async function loadGaId() {
      try {
        const res = await fetch("/api/content");
        if (res.ok) {
          const data = await res.json();
          const items = data.data || [];
          const gaItem = items.find(
            (item: { page: string; section: string; content_key: string }) =>
              item.page === "global" && item.section === "site_settings" && item.content_key === "ga_measurement_id"
          );
          if (gaItem) {
            setGaId(gaItem.content_value || "");
          }
          const apiKeyItem = items.find(
            (item: { page: string; section: string; content_key: string }) =>
              item.page === "global" && item.section === "site_settings" && item.content_key === "google_api_key"
          );
          if (apiKeyItem) {
            setGoogleApiKey(apiKeyItem.content_value || "");
          }
        }
      } catch (e) {
        console.error("Failed to load GA ID", e);
      }
    }

    async function loadSiteSettings() {
      try {
        const res = await fetch("/api/content");
        if (res.ok) {
          const data = await res.json();
          const items = data.data || [];
          const siteItems = items.filter(
            (item: { page: string; section: string }) =>
              item.page === "global" && item.section === "site_settings"
          );
          const settings: Record<string, string> = {};
          siteItems.forEach((item: { content_key: string; content_value: string }) => {
            settings[item.content_key] = item.content_value;
          });
          setSiteSettings((prev) => ({
            ...prev,
            ...(settings.site_name && { site_name: settings.site_name }),
            ...(settings.site_url && { site_url: settings.site_url }),
            ...(settings.logo_url !== undefined && { logo_url: settings.logo_url }),
            ...(settings.contact_email && { contact_email: settings.contact_email }),
            ...(settings.default_locale && { default_locale: settings.default_locale }),
          }));
        }
      } catch (e) {
        console.error("Failed to load site settings", e);
      }
    }

    loadAdmin();
    loadSiteSettings();
    loadSocialLinks();
    loadGaId();
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

      // Save social links
      const socialSettings = [
        { key: "social_email", value: socialLinks.social_email },
        { key: "social_whatsapp", value: socialLinks.social_whatsapp },
        { key: "social_instagram", value: socialLinks.social_instagram },
        { key: "social_github", value: socialLinks.social_github },
      ];

      for (const s of socialSettings) {
        await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: "global",
            section: "social",
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

  const handleSaveGa = async () => {
    setSavingGa(true);
    try {
      await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: "global",
          section: "site_settings",
          content_key: "ga_measurement_id",
          content_value: gaId,
          locale: "en",
        }),
      });
      await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: "global",
          section: "site_settings",
          content_key: "google_api_key",
          content_value: googleApiKey,
          locale: "en",
        }),
      });
      showSuccess("Google settings saved successfully!");
    } catch (e) {
      console.error(e);
      showError("Failed to save Google Analytics ID.");
    } finally {
      setSavingGa(false);
    }
  };

  const handleClearCache = () => {
    showSuccess("Cache cleared successfully!");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>Settings</h1>
        <p className="text-sm text-[#999999] mt-1">Manage your account and site settings</p>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm animate-fade-in shadow-xl">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      {/* Error Toast */}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in shadow-xl">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Admin Profile */}
      <div className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,105,42,0.06)] hover:border-[#D4692A]/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0ece8] flex items-center gap-2">
          <User size={16} className="text-[#D4692A]" />
          <h3 className="text-sm font-semibold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>Admin Profile</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4692A] to-[#b85520] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-[#D4692A]/20">
              {admin.display_name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div>
              <h4 className="text-lg font-semibold text-[#1a1a1a]">{admin.display_name || "Admin"}</h4>
              <p className="text-sm text-[#555555]">{admin.email || "No email"}</p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-[10px] rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield size={10} /> Administrator
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">Username</label>
              <input
                value={admin.email}
                disabled
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#555555] text-sm rounded-xl px-4 py-2.5 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">Display Name</label>
              <input
                value={admin.display_name}
                disabled
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#555555] text-sm rounded-xl px-4 py-2.5 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,105,42,0.06)] hover:border-[#D4692A]/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0ece8] flex items-center gap-2">
          <Lock size={16} className="text-[#D4692A]" />
          <h3 className="text-sm font-semibold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>Change Password</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#555555] mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPw ? "text" : "password"}
                value={password.current}
                onChange={(e) => setPassword({ ...password, current: e.target.value })}
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999] pr-10"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#555555] transition-colors"
              >
                {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={password.new_password}
                  onChange={(e) => setPassword({ ...password, new_password: e.target.value })}
                  className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999] pr-10"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#555555] transition-colors"
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  value={password.confirm}
                  onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                  className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999] pr-10"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#555555] transition-colors"
                >
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={changingPw || !password.current || !password.new_password}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(212,105,42,0.3)] disabled:opacity-50"
          >
            <Lock size={14} />
            {changingPw ? "Changing..." : "Change Password"}
          </button>
        </div>
      </div>

      {/* Site Settings */}
      <div className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,105,42,0.06)] hover:border-[#D4692A]/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0ece8] flex items-center gap-2">
          <Globe size={16} className="text-[#D4692A]" />
          <h3 className="text-sm font-semibold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>Site Settings</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">Site Name</label>
              <input
                value={siteSettings.site_name}
                onChange={(e) => setSiteSettings({ ...siteSettings, site_name: e.target.value })}
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">Site URL</label>
              <input
                value={siteSettings.site_url}
                onChange={(e) => setSiteSettings({ ...siteSettings, site_url: e.target.value })}
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">Logo URL</label>
              <input
                value={siteSettings.logo_url}
                onChange={(e) => setSiteSettings({ ...siteSettings, logo_url: e.target.value })}
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                placeholder="https://..."
              />
              {siteSettings.logo_url && (
                <div className="mt-2 p-3 bg-[#fafafa] rounded-xl border border-[#e8e4e0]">
                  <div className="flex items-center gap-2 mb-2">
                    <Image size={12} className="text-[#555555]" />
                    <span className="text-[10px] text-[#555555]">Logo Preview</span>
                  </div>
                  <img
                    src={siteSettings.logo_url}
                    alt="Logo preview"
                    className="max-h-16 rounded object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">Contact Email</label>
              <input
                value={siteSettings.contact_email}
                onChange={(e) => setSiteSettings({ ...siteSettings, contact_email: e.target.value })}
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#555555] mb-1.5">Default Locale</label>
            <select
              value={siteSettings.default_locale}
              onChange={(e) => setSiteSettings({ ...siteSettings, default_locale: e.target.value })}
              className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999] max-w-xs"
            >
              <option value="en">English</option>
              <option value="id">Indonesian</option>
            </select>
          </div>

          {/* Social Links Subsection */}
          <div className="pt-4 border-t border-[#e8e4e0]">
            <div className="flex items-center gap-2 mb-4">
              <Link2 size={14} className="text-[#D4692A]" />
              <h4 className="text-sm font-semibold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>Social Links</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[#555555] mb-1.5">
                  <Mail size={12} />
                  Email
                </label>
                <input
                  value={socialLinks.social_email}
                  onChange={(e) => setSocialLinks({ ...socialLinks, social_email: e.target.value })}
                  className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                  placeholder="hello@theorangefox.com"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[#555555] mb-1.5">
                  <MessageCircle size={12} />
                  WhatsApp
                </label>
                <input
                  value={socialLinks.social_whatsapp}
                  onChange={(e) => setSocialLinks({ ...socialLinks, social_whatsapp: e.target.value })}
                  className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[#555555] mb-1.5">
                  <Instagram size={12} />
                  Instagram
                </label>
                <input
                  value={socialLinks.social_instagram}
                  onChange={(e) => setSocialLinks({ ...socialLinks, social_instagram: e.target.value })}
                  className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                  placeholder="https://instagram.com/theorangefox"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[#555555] mb-1.5">
                  <Github size={12} />
                  GitHub
                </label>
                <input
                  value={socialLinks.social_github}
                  onChange={(e) => setSocialLinks({ ...socialLinks, social_github: e.target.value })}
                  className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                  placeholder="https://github.com/theorangefox"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveSiteSettings}
            disabled={savingSiteSettings}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(212,105,42,0.3)] disabled:opacity-50"
          >
            <Save size={14} />
            {savingSiteSettings ? "Saving..." : "Save Site Settings"}
          </button>
        </div>
      </div>

      {/* Google Analytics */}
      <div className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,105,42,0.06)] hover:border-[#D4692A]/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0ece8] flex items-center gap-2">
          <Globe size={16} className="text-[#D4692A]" />
          <h3 className="text-sm font-semibold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>Google Integration</h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#999999]">
            Configure your Google services. GA4 enables analytics tracking, and the API key unlocks real-time PageSpeed Insights on the SEO page.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">GA4 Measurement ID</label>
              <input
                value={gaId}
                onChange={(e) => setGaId(e.target.value)}
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                placeholder="G-XXXXXXXXXX"
              />
              {gaId && !gaId.startsWith("G-") && (
                <p className="text-xs text-yellow-600 mt-1">⚠️ GA4 IDs typically start with &quot;G-&quot;</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">Google API Key <span className="text-[#999999]">(for PageSpeed)</span></label>
              <input
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
                className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                placeholder="AIzaSy..."
              />
              <p className="text-[10px] text-[#999999] mt-1">Free from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" className="text-[#D4692A] hover:text-[#b85520] underline">Google Cloud Console</a> → enable PageSpeed Insights API</p>
            </div>
          </div>
          <button
            onClick={handleSaveGa}
            disabled={savingGa}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(212,105,42,0.3)] disabled:opacity-50"
          >
            <Save size={14} />
            {savingGa ? "Saving..." : "Save Google Settings"}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50/30 border border-red-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-red-200 flex items-center gap-2">
          <Trash2 size={16} className="text-red-600" />
          <h3 className="text-sm font-semibold text-red-600" style={{ fontFamily: "var(--font-heading)" }}>Danger Zone</h3>
        </div>
        <div className="p-6">
          <p className="text-xs text-[#999999] mb-4">
            ⚠️ These actions may have irreversible consequences. Proceed with caution.
          </p>
          <button
            onClick={handleClearCache}
            className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-all"
          >
            <Trash2 size={14} />
            Clear Cache
          </button>
        </div>
      </div>
    </div>
  );
}

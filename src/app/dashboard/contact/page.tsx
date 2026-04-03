"use client";
import { useState, useEffect } from "react";
import {
  Save,
  Mail,
  Instagram,
  MessageCircle,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Globe,
} from "lucide-react";

interface ContactField {
  key: string;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  type?: string;
  description?: string;
}

const contactFields: ContactField[] = [
  {
    key: "social_email",
    label: "Email Address",
    icon: Mail,
    placeholder: "hello@yourdomain.com",
    description: "Displayed on the Contact page and footer",
  },
  {
    key: "social_instagram",
    label: "Instagram",
    icon: Instagram,
    placeholder: "https://instagram.com/yourusername",
    description: "Instagram profile link",
  },
  {
    key: "social_whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    placeholder: "+1234567890",
    description: "WhatsApp number for direct messaging",
  },
  {
    key: "social_phone",
    label: "Phone Number",
    icon: Phone,
    placeholder: "+1234567890",
    description: "Business phone number",
  },
  {
    key: "social_address",
    label: "Address",
    icon: MapPin,
    placeholder: "123 Main Street, City, Country",
    description: "Business address",
  },
  {
    key: "social_website",
    label: "Website",
    icon: Globe,
    placeholder: "https://yourwebsite.com",
    description: "Main website URL",
  },
  {
    key: "social_business_hours",
    label: "Business Hours",
    icon: Clock,
    placeholder: "Mon-Fri 9:00 AM - 5:00 PM",
    description: "When you're available for contact",
  },
];

export default function ContactPage() {
  const [contactData, setContactData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadContactData() {
      try {
        const res = await fetch("/api/content");
        if (res.ok) {
          const data = await res.json();
          const items = data.data || [];
          const socialItems = items.filter(
            (item: { page: string; section: string }) =>
              item.page === "global" && item.section === "social"
          );
          const values: Record<string, string> = {};
          socialItems.forEach(
            (item: { content_key: string; content_value: string }) => {
              values[item.content_key] = item.content_value;
            }
          );
          setContactData(values);
        }
      } catch (e) {
        console.error("Failed to load contact data", e);
      } finally {
        setLoading(false);
      }
    }
    loadContactData();
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

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const field of contactFields) {
        const value = contactData[field.key] || "";
        await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: "global",
            section: "social",
            content_key: field.key,
            content_value: value,
            locale: "en",
          }),
        });
      }
      showSuccess("Contact information saved successfully!");
    } catch (e) {
      console.error(e);
      showError("Failed to save contact information.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setContactData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1
          className="text-2xl font-bold text-[#1a1a1a]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Contact Information
        </h1>
        <p className="text-sm text-[#999999] mt-1">
          Manage your contact details shown on the website. Changes are reflected on the Contact page automatically.
        </p>
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

      {/* Contact Fields */}
      <div className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,105,42,0.06)] hover:border-[#D4692A]/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0ece8] flex items-center gap-2">
          <Mail size={16} className="text-[#D4692A]" />
          <h3
            className="text-sm font-semibold text-[#1a1a1a]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Contact Details
          </h3>
        </div>
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#D4692A] border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-[#999999]">Loading...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {contactFields.map((field) => {
                  const Icon = field.icon;
                  return (
                    <div key={field.key}>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-[#555555] mb-1.5">
                        <Icon size={12} className="text-[#D4692A]" />
                        {field.label}
                      </label>
                      <input
                        type={field.type || "text"}
                        value={contactData[field.key] || ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all placeholder:text-[#999999]"
                        placeholder={field.placeholder}
                      />
                      {field.description && (
                        <p className="text-[10px] text-[#999999] mt-1">
                          {field.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-[#e8e4e0]">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(212,105,42,0.3)] disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? "Saving..." : "Save Contact Information"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-[#FFF8F3] border border-[#D4692A]/15 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D4692A]/10 flex items-center justify-center flex-shrink-0">
            <Globe size={14} className="text-[#D4692A]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              How it works
            </h4>
            <p className="text-xs text-[#555555] leading-relaxed">
              The <strong>Email</strong> and <strong>Instagram</strong> fields are displayed on the Contact page of your website.
              Changes you make here are saved to the CMS database and will be reflected on the live site automatically — no coding required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

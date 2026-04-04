"use client";

import { X, MessageCircle, Briefcase } from "lucide-react";
import { useEffect } from "react";

interface ProfileUser {
  id: string;
  display_name: string;
  position: string;
  email: string;
  profile_pic_url: string | null;
}

interface ProfilePopupProps {
  user: ProfileUser;
  onClose: () => void;
}

export default function ProfilePopup({ user, onClose }: ProfilePopupProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const initials = user.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ animation: "fadeIn 0.2s ease-out" }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeIn 0.3s ease-out" }}
      >
        {/* Orange banner top */}
        <div className="h-24 bg-gradient-to-br from-[#D4692A] to-[#B85A24] relative">
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-20"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors duration-200"
        >
          <X size={16} />
        </button>

        {/* Profile content */}
        <div className="px-6 pb-6 -mt-12 text-center">
          {/* Avatar */}
          <div className="inline-block relative mb-4">
            {user.profile_pic_url ? (
              <img
                src={user.profile_pic_url}
                alt={user.display_name}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-[#D4692A] flex items-center justify-center">
                <span
                  className="text-2xl font-bold text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {initials}
                </span>
              </div>
            )}
          </div>

          {/* Name */}
          <h2
            className="text-xl font-bold text-text-primary mb-1"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {user.display_name}
          </h2>

          {/* Position badge */}
          {user.position && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4692A]/10 text-[#D4692A] text-xs font-semibold mb-4">
              <Briefcase size={12} />
              {user.position}
            </div>
          )}

          {/* Chat button */}
          <button
            onClick={() => {
              onClose();
              window.location.href = `/dashboard/team-messages?user=${user.id}`;
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 mt-2 rounded-lg bg-[#D4692A] text-white text-sm font-medium hover:bg-[#B5551F] transition-colors"
          >
            <MessageCircle size={14} />
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
}

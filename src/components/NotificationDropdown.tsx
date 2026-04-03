"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import Image from "next/image";

interface NotificationDropdownProps {
  currentUserId: string;
}

interface NotificationActor {
  display_name: string;
  profile_pic_url: string | null;
}

interface Notification {
  id: string;
  type: string;
  is_read: boolean;
  created_at: string;
  actor: NotificationActor;
  post_id: string | null;
  comment_id: string | null;
}

function playBing() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(830, ctx.currentTime);
    osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* ignore audio errors */
  }
}

function relativeTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

function getNotificationText(n: Notification): string {
  switch (n.type) {
    case "like_post":
      return `liked your post`;
    case "comment_post":
      return `commented on your post`;
    case "like_comment":
      return `liked your comment`;
    default:
      return `interacted with your content`;
  }
}

function ActorAvatar({ actor, size = 36 }: { actor: NotificationActor; size?: number }) {
  if (actor.profile_pic_url) {
    return (
      <Image
        src={actor.profile_pic_url}
        alt={actor.display_name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-[#D4692A]/10 flex items-center justify-center text-[#D4692A] font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {actor.display_name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}

export default function NotificationDropdown({ currentUserId }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(0);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const notifs: Notification[] = data.notifications || [];
        setNotifications(notifs);
        const newUnread = notifs.filter((n) => !n.is_read).length;
        if (newUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
          playBing();
        }
        prevUnreadRef.current = newUnread;
        setUnreadCount(newUnread);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Re-fetch when opened
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markAsRead = async (ids?: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids ? { ids } : {}),
      });
      await fetchNotifications();
    } catch {
      /* ignore */
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead([notification.id]);
    }
  };

  // Suppress unused variable warning
  void currentUserId;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-[#f5f2ef] text-[#999999] hover:text-[#1a1a1a] transition-all"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-96 max-h-[500px] bg-white rounded-2xl shadow-2xl border border-[#e8e4e0] overflow-hidden z-50 animate-fade-in flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#e8e4e0] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                className="text-xs text-[#D4692A] hover:text-[#c05e24] font-medium transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#999999]">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f5f2ef] ${
                    !n.is_read ? "bg-[#D4692A]/[0.04]" : ""
                  }`}
                >
                  <ActorAvatar actor={n.actor} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1a1a1a]">
                      <span className="font-medium">{n.actor.display_name}</span>{" "}
                      <span className="text-[#666]">{getNotificationText(n)}</span>
                    </p>
                    <p className="text-[11px] text-[#999999] mt-0.5">{relativeTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[#D4692A] flex-shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

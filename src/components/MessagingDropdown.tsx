"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, ArrowLeft, Send } from "lucide-react";
import type { UserProfile } from "@/context/AuthContext";

interface MessagingDropdownProps {
  currentUser: UserProfile;
}

interface TeamMember {
  id: string;
  display_name: string;
  position: string;
  email: string;
  profile_pic_url: string | null;
}

interface Conversation {
  user: TeamMember;
  last_message: string;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
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

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString();
}

function Avatar({ user, size = 36 }: { user: { display_name: string; profile_pic_url: string | null }; size?: number }) {
  if (user.profile_pic_url) {
    return (
      <img
        src={user.profile_pic_url}
        alt={user.display_name}
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
      {user.display_name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}

export default function MessagingDropdown({ currentUser }: MessagingDropdownProps) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<TeamMember | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(0);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveChat(null);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Fetch unread count (poll every 10s)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/internal-messages/unread-count");
      if (res.ok) {
        const data = await res.json();
        const newCount = data.count || 0;
        if (newCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
          playBing();
        }
        prevUnreadRef.current = newCount;
        setUnreadCount(newCount);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch conversations + team members when opened
  const fetchConversations = useCallback(async () => {
    try {
      const [convRes, usersRes] = await Promise.all([
        fetch("/api/internal-messages"),
        fetch("/api/auth/users"),
      ]);
      if (convRes.ok) {
        const data = await convRes.json();
        setConversations(data.conversations || []);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setTeamMembers((data.users || []).filter((u: TeamMember) => u.id !== currentUser.id));
      }
    } catch {
      /* ignore */
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (open) fetchConversations();
  }, [open, fetchConversations]);

  // Fetch messages for active chat (poll every 5s)
  const fetchMessages = useCallback(async () => {
    if (!activeChat) return;
    try {
      const res = await fetch(`/api/internal-messages/${activeChat.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      /* ignore */
    }
  }, [activeChat]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [activeChat, fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeChat || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/internal-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: activeChat.id, content: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage("");
        await fetchMessages();
        fetchUnreadCount();
      }
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Merge team members with conversations
  const getMemberList = () => {
    const convMap = new Map<string, Conversation>();
    conversations.forEach((c) => convMap.set(c.user.id, c));

    return teamMembers.map((member) => ({
      ...member,
      lastMessage: convMap.get(member.id)?.last_message || null,
      unreadCount: convMap.get(member.id)?.unread_count || 0,
    }));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => {
          setOpen(!open);
          if (open) setActiveChat(null);
        }}
        className="relative p-2 rounded-xl hover:bg-[#f5f2ef] text-[#999999] hover:text-[#1a1a1a] transition-all"
      >
        <MessageSquare size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-96 max-h-[500px] bg-white rounded-2xl shadow-2xl border border-[#e8e4e0] overflow-hidden z-50 animate-fade-in flex flex-col">
          {!activeChat ? (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-[#e8e4e0]">
                <h3 className="text-sm font-semibold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
                  Team Messages
                </h3>
              </div>

              {/* Member List */}
              <div className="flex-1 overflow-y-auto">
                {getMemberList().length === 0 ? (
                  <div className="p-8 text-center text-sm text-[#999999]">No team members found</div>
                ) : (
                  getMemberList().map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setActiveChat(member)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f2ef] transition-colors text-left"
                    >
                      <Avatar user={member} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#1a1a1a] truncate">{member.display_name}</span>
                          {member.unreadCount > 0 && (
                            <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-[#D4692A] text-white text-[10px] font-bold px-1.5">
                              {member.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#999999] truncate">{member.position || member.email}</p>
                        {member.lastMessage && (
                          <p className="text-xs text-[#777] truncate mt-0.5">{member.lastMessage}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-[#e8e4e0] flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveChat(null);
                    fetchConversations();
                    fetchUnreadCount();
                  }}
                  className="p-1 rounded-lg hover:bg-[#f5f2ef] text-[#999999] hover:text-[#1a1a1a] transition-all"
                >
                  <ArrowLeft size={18} />
                </button>
                <Avatar user={activeChat} size={32} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{activeChat.display_name}</p>
                  <p className="text-[11px] text-[#999999] truncate">{activeChat.position}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] max-h-[340px] bg-[#fafafa]">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-[#999999]">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSent = msg.sender_id === currentUser.id;
                    return (
                      <div key={msg.id} className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                            isSent
                              ? "bg-[#D4692A] text-white rounded-br-md"
                              : "bg-white border border-[#e8e4e0] text-[#1a1a1a] rounded-bl-md"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isSent ? "text-white/60" : "text-[#999]"}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-[#e8e4e0] flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] placeholder:text-[#999]"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="p-2 rounded-xl bg-[#D4692A] text-white hover:bg-[#c05e24] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

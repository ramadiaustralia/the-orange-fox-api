"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, ArrowLeft, Send, Paperclip, FileText, Download, X } from "lucide-react";
import { useRouter } from "next/navigation";
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
  last_active_at: string | null;
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
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
}

function isOnline(lastActive: string | null): boolean {
  if (!lastActive) return false;
  return Date.now() - new Date(lastActive).getTime() < 120000;
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

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Avatar({
  user,
  size = 36,
  showStatus = false,
}: {
  user: { display_name: string; profile_pic_url: string | null; last_active_at?: string | null };
  size?: number;
  showStatus?: boolean;
}) {
  const online = showStatus && isOnline(user.last_active_at || null);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {user.profile_pic_url ? (
        <img
          src={user.profile_pic_url}
          alt={user.display_name}
          className="rounded-full object-cover w-full h-full"
        />
      ) : (
        <div
          className="rounded-full bg-[#D4692A]/10 flex items-center justify-center text-[#D4692A] font-bold w-full h-full"
          style={{ fontSize: size * 0.38 }}
        >
          {user.display_name?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}
      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
            online ? "bg-emerald-400" : "bg-gray-300"
          }`}
        />
      )}
    </div>
  );
}

export default function MessagingDropdown({ currentUser }: MessagingDropdownProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<TeamMember | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(0);
  const lastTypingSentRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setTeamMembers(
          (data.users || []).filter((u: TeamMember) => u.id !== currentUser.id)
        );
      }
    } catch {
      /* ignore */
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (open) fetchConversations();
  }, [open, fetchConversations]);

  // Fetch messages for active chat (poll every 3s)
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
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [activeChat, fetchMessages]);

  // Typing indicator polling
  useEffect(() => {
    if (!activeChat) {
      setPartnerTyping(false);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/internal-messages/typing?partnerId=${activeChat.id}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setPartnerTyping(!!data.typing);
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeChat]);

  // Send typing indicator (throttled to once per 3s)
  const sendTypingIndicator = useCallback(() => {
    if (!activeChat) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 3000) return;
    lastTypingSentRef.current = now;
    fetch("/api/internal-messages/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId: activeChat.id }),
    }).catch(() => {});
  }, [activeChat]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  const handleSend = async () => {
    if ((!newMessage.trim() && !pendingFile) || !activeChat || sending) return;
    setSending(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      let attachmentType: string | null = null;
      let attachmentSize: number | null = null;

      if (pendingFile) {
        const formData = new FormData();
        formData.append("file", pendingFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          attachmentUrl = uploadData.url;
          attachmentName = pendingFile.name;
          attachmentType = pendingFile.type;
          attachmentSize = pendingFile.size;
        }
      }

      const res = await fetch("/api/internal-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: activeChat.id,
          content: newMessage.trim() || (attachmentName ? `Sent a file: ${attachmentName}` : ""),
          attachmentUrl,
          attachmentName,
          attachmentType,
          attachmentSize,
        }),
      });
      if (res.ok) {
        setNewMessage("");
        setPendingFile(null);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    sendTypingIndicator();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
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

  const isImageAttachment = (type: string | null) =>
    type?.startsWith("image/") || false;

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
              <div className="px-4 py-3 border-b border-[#e8e4e0] flex items-center justify-between">
                <h3
                  className="text-sm font-semibold text-[#1a1a1a]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Team Messages
                </h3>
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push("/dashboard/team-messages");
                  }}
                  className="text-xs text-[#D4692A] hover:text-[#c05e24] font-medium"
                >
                  Open Full Page
                </button>
              </div>

              {/* Member List */}
              <div className="flex-1 overflow-y-auto">
                {getMemberList().length === 0 ? (
                  <div className="p-8 text-center text-sm text-[#999999]">
                    No team members found
                  </div>
                ) : (
                  getMemberList().map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setActiveChat(member)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f2ef] transition-colors text-left"
                    >
                      <Avatar user={member} size={40} showStatus />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#1a1a1a] truncate">
                            {member.display_name}
                          </span>
                          {member.unreadCount > 0 && (
                            <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-[#D4692A] text-white text-[10px] font-bold px-1.5">
                              {member.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#999999] truncate">
                          {member.position || member.email}
                        </p>
                        {member.lastMessage && (
                          <p className="text-xs text-[#777] truncate mt-0.5">
                            {member.lastMessage}
                          </p>
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
                <Avatar user={activeChat} size={32} showStatus />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">
                    {activeChat.display_name}
                  </p>
                  <p
                    className={`text-[11px] truncate ${
                      isOnline(activeChat.last_active_at)
                        ? "text-emerald-500"
                        : "text-[#999999]"
                    }`}
                  >
                    {isOnline(activeChat.last_active_at) ? "Online" : activeChat.position}
                  </p>
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
                      <div
                        key={msg.id}
                        className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                            isSent
                              ? "bg-[#D4692A] text-white rounded-br-md"
                              : "bg-white border border-[#e8e4e0] text-[#1a1a1a] rounded-bl-md"
                          }`}
                        >
                          {/* Attachment */}
                          {msg.attachment_url && (
                            <div className="mb-1.5">
                              {isImageAttachment(msg.attachment_type) ? (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={msg.attachment_url}
                                    alt={msg.attachment_name || "Image"}
                                    className="rounded-lg max-w-full max-h-32 object-cover"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={msg.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded-lg ${
                                    isSent ? "bg-white/10" : "bg-gray-50 border border-gray-100"
                                  }`}
                                >
                                  <FileText size={16} className={isSent ? "text-white/70" : "text-gray-400"} />
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-xs font-medium truncate ${isSent ? "text-white" : "text-gray-700"}`}>
                                      {msg.attachment_name || "File"}
                                    </p>
                                    <p className={`text-[10px] ${isSent ? "text-white/50" : "text-gray-400"}`}>
                                      {formatFileSize(msg.attachment_size)}
                                    </p>
                                  </div>
                                  <Download size={14} className={isSent ? "text-white/60" : "text-gray-400"} />
                                </a>
                              )}
                            </div>
                          )}

                          {msg.content && (
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          )}
                          <div className={`flex items-center gap-1 mt-1 ${isSent ? "justify-end" : ""}`}>
                            <p className={`text-[10px] ${isSent ? "text-white/60" : "text-[#999]"}`}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                          {isSent && (
                            <span className={`text-[9px] ${msg.is_read ? "text-blue-200" : "text-white/40"}`}>
                              {msg.is_read ? "✓✓ Read" : "✓ Sent"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {partnerTyping && (
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pending file preview */}
              {pendingFile && (
                <div className="px-3 pt-2 flex items-center gap-2 bg-white border-t border-[#e8e4e0]">
                  <FileText size={14} className="text-[#D4692A]" />
                  <span className="text-xs text-[#1a1a1a] truncate flex-1">{pendingFile.name}</span>
                  <button
                    onClick={() => setPendingFile(null)}
                    className="p-0.5 rounded hover:bg-gray-100"
                  >
                    <X size={12} className="text-gray-400" />
                  </button>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-[#e8e4e0] flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl hover:bg-[#f5f2ef] text-[#999999] hover:text-[#1a1a1a] transition-all"
                >
                  <Paperclip size={16} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] placeholder:text-[#999]"
                />
                <button
                  onClick={handleSend}
                  disabled={(!newMessage.trim() && !pendingFile) || sending}
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

"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Send, Paperclip, FileText, Download, X, ArrowLeft, MessageSquare } from "lucide-react";

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

function lastSeenText(lastActive: string | null): string {
  if (!lastActive) return "Offline";
  if (isOnline(lastActive)) return "Online";
  const diff = Date.now() - new Date(lastActive).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Last seen ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `Last seen ${days}d ago`;
}

function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);

  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Yesterday ${time}`;
  if (diffDays < 7) return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
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
          className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white ${
            online ? "bg-emerald-400" : "bg-gray-300"
          }`}
          style={{ width: Math.max(10, size * 0.3), height: Math.max(10, size * 0.3) }}
        />
      )}
    </div>
  );
}

export default function TeamMessagesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<TeamMember | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastTypingSentRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialUserLoaded = useRef(false);

  // Fetch team members and conversations
  const fetchData = useCallback(async () => {
    if (!user) return;
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
        const members = (data.users || []).filter((u: TeamMember) => u.id !== user.id);
        setTeamMembers(members);
        return members;
      }
    } catch {
      /* ignore */
    }
    return null;
  }, [user]);

  // Initial data fetch and auto-open from URL param
  useEffect(() => {
    if (!user || initialUserLoaded.current) return;
    initialUserLoaded.current = true;

    fetchData().then((members) => {
      const targetUserId = searchParams.get("user");
      if (targetUserId && members) {
        const target = members.find((m: TeamMember) => m.id === targetUserId);
        if (target) {
          setActiveChat(target);
          setShowSidebar(false);
        }
      }
    });
  }, [user, searchParams, fetchData]);

  // Refresh conversations periodically
  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

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

  const handleSelectMember = (member: TeamMember) => {
    setActiveChat(member);
    setShowSidebar(false);
  };

  const handleBack = () => {
    setActiveChat(null);
    setShowSidebar(true);
    fetchData();
  };

  // Build member list with conversation data
  const getEnrichedMembers = () => {
    const convMap = new Map<string, Conversation>();
    conversations.forEach((c) => convMap.set(c.user.id, c));

    const filtered = teamMembers.filter((m) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.display_name.toLowerCase().includes(q) ||
        m.position.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    });

    return filtered.map((member) => ({
      ...member,
      lastMessage: convMap.get(member.id)?.last_message || null,
      unreadCount: convMap.get(member.id)?.unread_count || 0,
    }));
  };

  const isImageAttachment = (type: string | null) =>
    type?.startsWith("image/") || false;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse-orange w-4 h-4 rounded-full bg-[#D4692A]" />
      </div>
    );
  }

  const enrichedMembers = getEnrichedMembers();

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-[#e8e4e0] shadow-sm">
      {/* Left Panel - Team Members */}
      <div
        className={`w-full md:w-80 flex-shrink-0 bg-[#141414] flex flex-col ${
          !showSidebar ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <h2
            className="text-base font-bold text-white mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Team Messages
          </h2>
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team members..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white/[0.06] border border-white/[0.06] text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4692A]/50 focus:ring-1 focus:ring-[#D4692A]/20"
            />
          </div>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto">
          {enrichedMembers.length === 0 ? (
            <div className="p-8 text-center text-sm text-white/40">
              {searchQuery ? "No members match your search" : "No team members found"}
            </div>
          ) : (
            enrichedMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => handleSelectMember(member)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                  activeChat?.id === member.id
                    ? "bg-white/[0.08]"
                    : "hover:bg-white/[0.04]"
                }`}
              >
                <Avatar user={member} size={42} showStatus />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white truncate">
                      {member.display_name}
                    </span>
                    {member.unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-[#D4692A] text-white text-[10px] font-bold px-1.5">
                        {member.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 truncate">
                    {member.position || member.email}
                  </p>
                  {member.lastMessage && (
                    <p className="text-xs text-white/25 truncate mt-0.5">
                      {member.lastMessage}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div
        className={`flex-1 flex flex-col bg-white ${
          showSidebar ? "hidden md:flex" : "flex"
        }`}
      >
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-[#e8e4e0] flex items-center gap-4">
              <button
                onClick={handleBack}
                className="md:hidden p-1 rounded-lg hover:bg-[#f5f2ef] text-[#999999] hover:text-[#1a1a1a] transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar user={activeChat} showStatus size={40} />
              <div className="min-w-0">
                <p className="font-semibold text-[#1a1a1a] truncate">
                  {activeChat.display_name}
                </p>
                <p
                  className={`text-xs ${
                    isOnline(activeChat.last_active_at) ? "text-emerald-500" : "text-gray-400"
                  }`}
                >
                  {lastSeenText(activeChat.last_active_at)}
                </p>
              </div>
              {activeChat.position && (
                <span className="hidden sm:block ml-auto text-xs text-[#999] bg-[#f5f2ef] px-3 py-1 rounded-full">
                  {activeChat.position}
                </span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#fafafa]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#999999]">
                  <MessageSquare size={40} className="mb-3 text-[#ddd]" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSent = msg.sender_id === user.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                    >
                      {!isSent && (
                        <div className="flex-shrink-0 mr-2 mt-auto mb-1">
                          <Avatar user={activeChat} size={28} />
                        </div>
                      )}
                      <div
                        className={`max-w-[65%] px-4 py-2.5 rounded-2xl text-sm ${
                          isSent
                            ? "bg-[#D4692A] text-white rounded-br-md"
                            : "bg-white border border-[#e8e4e0] text-[#1a1a1a] rounded-bl-md shadow-sm"
                        }`}
                      >
                        {/* Attachment */}
                        {msg.attachment_url && (
                          <div className="mb-2">
                            {isImageAttachment(msg.attachment_type) ? (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={msg.attachment_url}
                                  alt={msg.attachment_name || "Image"}
                                  className="rounded-lg max-w-full max-h-48 object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2.5 rounded-lg ${
                                  isSent
                                    ? "bg-white/10"
                                    : "bg-gray-50 border border-gray-100"
                                }`}
                              >
                                <FileText
                                  size={18}
                                  className={isSent ? "text-white/70" : "text-gray-400"}
                                />
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`text-xs font-medium truncate ${
                                      isSent ? "text-white" : "text-gray-700"
                                    }`}
                                  >
                                    {msg.attachment_name || "File"}
                                  </p>
                                  <p
                                    className={`text-[10px] ${
                                      isSent ? "text-white/50" : "text-gray-400"
                                    }`}
                                  >
                                    {formatFileSize(msg.attachment_size)}
                                  </p>
                                </div>
                                <Download
                                  size={14}
                                  className={isSent ? "text-white/60" : "text-gray-400"}
                                />
                              </a>
                            )}
                          </div>
                        )}

                        {msg.content && (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                        <div
                          className={`flex items-center gap-1.5 mt-1.5 ${
                            isSent ? "justify-end" : ""
                          }`}
                        >
                          <p
                            className={`text-[10px] ${
                              isSent ? "text-white/50" : "text-[#999]"
                            }`}
                          >
                            {formatMessageTime(msg.created_at)}
                          </p>
                        </div>
                        {isSent && (
                          <span
                            className={`text-[9px] ${
                              msg.is_read ? "text-blue-200" : "text-white/40"
                            }`}
                          >
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
                  <Avatar user={activeChat} size={28} />
                  <div className="bg-white border border-[#e8e4e0] rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2">
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
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Pending file preview */}
            {pendingFile && (
              <div className="px-6 py-2 flex items-center gap-3 bg-[#f5f2ef] border-t border-[#e8e4e0]">
                <FileText size={16} className="text-[#D4692A]" />
                <span className="text-sm text-[#1a1a1a] truncate flex-1">
                  {pendingFile.name}
                </span>
                <span className="text-xs text-[#999]">
                  {formatFileSize(pendingFile.size)}
                </span>
                <button
                  onClick={() => setPendingFile(null)}
                  className="p-1 rounded-lg hover:bg-white"
                >
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-[#e8e4e0] bg-white">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl hover:bg-[#f5f2ef] text-[#999999] hover:text-[#1a1a1a] transition-all"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] placeholder:text-[#999]"
                />
                <button
                  onClick={handleSend}
                  disabled={(!newMessage.trim() && !pendingFile) || sending}
                  className="p-2.5 rounded-xl bg-[#D4692A] text-white hover:bg-[#c05e24] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#999999]">
            <div className="w-16 h-16 rounded-2xl bg-[#f5f2ef] flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-[#D4692A]" />
            </div>
            <p className="text-lg font-semibold text-[#1a1a1a] mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              Team Messages
            </p>
            <p className="text-sm">Select a team member to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

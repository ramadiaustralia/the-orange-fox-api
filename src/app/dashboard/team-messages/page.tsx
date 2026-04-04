"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Send,
  Paperclip,
  FileText,
  Download,
  X,
  ArrowLeft,
  MessageSquare,
  Trash2,
  RotateCcw,
  Pencil,
  SmilePlus,
  Reply,
  Share2,
  CornerDownRight,
} from "lucide-react";

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
  is_unsent?: boolean;
  edited_at?: string | null;
  created_at: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  reply_to_id?: string | null;
  forwarded_from_id?: string | null;
}

interface Reaction {
  emoji: string;
  count: number;
  users: { id: string; display_name: string }[];
  reacted: boolean;
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

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // New state for reactions, reply, and forward
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, Reaction[]>>({});
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);

  // Mobile: active message actions (shown via long-press)
  const [activeMessageActions, setActiveMessageActions] = useState<string | null>(null);
  // Read receipt popup
  const [readReceiptPopup, setReadReceiptPopup] = useState<string | null>(null);
  const msgTouchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const msgTouchMovedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastTypingSentRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialUserLoaded = useRef(false);
  const isInitialLoadRef = useRef(true);
  const userSentMessageRef = useRef(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const forwardModalRef = useRef<HTMLDivElement>(null);

  // Close emoji picker, forward modal, and mobile actions when clicking/tapping outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        showEmojiPickerFor &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPickerFor(null);
      }
      if (
        forwardingMessage &&
        forwardModalRef.current &&
        !forwardModalRef.current.contains(e.target as Node)
      ) {
        setForwardingMessage(null);
      }
    };
    const handleTouchOutside = (e: TouchEvent) => {
      if (activeMessageActions) {
        setActiveMessageActions(null);
      }
      if (readReceiptPopup) {
        setReadReceiptPopup(null);
      }
      handleClickOutside(e);
    };
    const handleMouseOutside = (e: MouseEvent) => {
      if (readReceiptPopup) {
        setReadReceiptPopup(null);
      }
      handleClickOutside(e);
    };
    document.addEventListener("mousedown", handleMouseOutside);
    document.addEventListener("touchstart", handleTouchOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleMouseOutside);
      document.removeEventListener("touchstart", handleTouchOutside);
    };
  }, [showEmojiPickerFor, forwardingMessage, activeMessageActions, readReceiptPopup]);

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

  // Fetch reactions for a set of message IDs
  const fetchReactions = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    try {
      const res = await fetch(
        `/api/internal-messages/reactions?message_ids=${messageIds.join(",")}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessageReactions((prev) => ({ ...prev, ...(data.reactions || {}) }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Fetch messages for active chat (poll every 3s)
  const fetchMessages = useCallback(async () => {
    if (!activeChat) return;
    try {
      const res = await fetch(`/api/internal-messages/${activeChat.id}`);
      if (res.ok) {
        const data = await res.json();
        const msgs: Message[] = data.messages || [];
        setMessages(msgs);
        // Fetch reactions for all messages
        if (msgs.length > 0) {
          const ids = msgs.map((m) => m.id);
          fetchReactions(ids);
        }
      }
    } catch {
      /* ignore */
    }
  }, [activeChat, fetchReactions]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    } else {
      isInitialLoadRef.current = true;
      setMessages([]);
      setMessageReactions({});
      setReplyingTo(null);
      setForwardingMessage(null);
      setShowEmojiPickerFor(null);
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

  // Smart auto-scroll: only scroll the chat container, never the page
  useEffect(() => {
    if (!messagesEndRef.current) return;

    const container = messagesEndRef.current.parentElement;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    if (isInitialLoadRef.current || userSentMessageRef.current || isNearBottom) {
      container.scrollTop = container.scrollHeight;
      isInitialLoadRef.current = false;
      userSentMessageRef.current = false;
    }
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
        try {
          // Step 1: Get signed upload URL
          const signedRes = await fetch("/api/upload/signed-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName: pendingFile.name, fileType: pendingFile.type }),
          });

          if (signedRes.ok) {
            const { signedUrl, publicUrl } = await signedRes.json();

            // Step 2: Upload directly to Supabase Storage
            const uploadRes = await fetch(signedUrl, {
              method: "PUT",
              headers: { "Content-Type": pendingFile.type },
              body: pendingFile,
            });

            if (uploadRes.ok) {
              attachmentUrl = publicUrl;
              attachmentName = pendingFile.name;
              attachmentType = pendingFile.type;
              attachmentSize = pendingFile.size;
            }
          }
        } catch {
          /* upload failed silently, message sends without attachment */
        }
      }

      userSentMessageRef.current = true;

      const body: Record<string, unknown> = {
        receiverId: activeChat.id,
        content: newMessage.trim() || (attachmentName ? `Sent a file: ${attachmentName}` : ""),
        attachmentUrl,
        attachmentName,
        attachmentType,
        attachmentSize,
      };

      // Include replyToId if replying
      if (replyingTo) {
        body.replyToId = replyingTo.id;
      }

      const res = await fetch("/api/internal-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNewMessage("");
        setPendingFile(null);
        setReplyingTo(null);
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

  const handleUnsend = async (messageId: string) => {
    try {
      const res = await fetch("/api/internal-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: messageId, action: "unsend" }),
      });
      if (res.ok) await fetchMessages();
    } catch {
      /* ignore */
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Delete this message permanently?")) return;
    try {
      const res = await fetch(`/api/internal-messages?id=${messageId}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchMessages();
    } catch {
      /* ignore */
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim() || editSaving) return;
    setEditSaving(true);
    try {
      const res = await fetch("/api/internal-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: messageId, action: "edit", content: editContent.trim() }),
      });
      if (res.ok) {
        setEditingMessageId(null);
        setEditContent("");
        await fetchMessages();
      }
    } catch {
      /* ignore */
    } finally {
      setEditSaving(false);
    }
  };

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleBack = () => {
    setActiveChat(null);
    setShowSidebar(true);
    setReplyingTo(null);
    setForwardingMessage(null);
    setShowEmojiPickerFor(null);
    fetchData();
  };

  // Toggle emoji reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch("/api/internal-messages/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId, emoji }),
      });
      setShowEmojiPickerFor(null);
      // Re-fetch reactions for this message
      fetchReactions([messageId]);
    } catch {
      /* ignore */
    }
  };

  // Forward message to another team member
  const handleForward = async (targetMember: TeamMember, msg: Message) => {
    try {
      const forwardContent = `📨 Forwarded:\n${msg.content}`;
      await fetch("/api/internal-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: targetMember.id,
          content: forwardContent,
          forwardedFromId: msg.id,
        }),
      });
      setForwardingMessage(null);
    } catch {
      /* ignore */
    }
  };

  // Find a message by ID in the messages array (for reply-to display)
  const findMessageById = (id: string): Message | undefined => {
    return messages.find((m) => m.id === id);
  };

  // Get sender display name
  const getSenderName = (senderId: string): string => {
    if (user && senderId === user.id) return "You";
    if (activeChat && senderId === activeChat.id) return activeChat.display_name;
    const member = teamMembers.find((m) => m.id === senderId);
    return member?.display_name || "Unknown";
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

  const isVideoAttachment = (type: string | null) =>
    type?.startsWith("video/") || false;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse-orange w-4 h-4 rounded-full bg-[#D4692A]" />
      </div>
    );
  }

  const enrichedMembers = getEnrichedMembers();

  return (
    <div className="flex h-[calc(100vh-7rem)] sm:h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-[#e8e4e0] shadow-sm max-w-full">
      {/* Left Panel - Team Members */}
      <div
        className={`w-full md:w-80 md:flex-shrink-0 min-w-0 bg-[#141414] flex flex-col ${
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
        className={`flex-1 min-w-0 flex flex-col bg-white ${
          showSidebar ? "hidden md:flex" : "flex"
        }`}
      >
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-[#e8e4e0] flex items-center gap-3 sm:gap-4 min-w-0">
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#fafafa]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#999999]">
                  <MessageSquare size={40} className="mb-3 text-[#ddd]" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSent = msg.sender_id === user.id;
                  const isUnsent = msg.is_unsent === true || msg.content === "__UNSENT__";
                  const isEditing = editingMessageId === msg.id;
                  const isEdited = msg.edited_at !== null && msg.edited_at !== undefined;
                  const reactions = messageReactions[msg.id] || [];
                  const repliedMessage = msg.reply_to_id ? findMessageById(msg.reply_to_id) : null;
                  const isForwarded = !!msg.forwarded_from_id;
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
                        className="relative group w-fit max-w-[80%] sm:max-w-[65%]"
                        style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
                        onTouchStart={(e) => {
                          if (isUnsent || isEditing) return;
                          msgTouchMovedRef.current = false;
                          msgTouchTimerRef.current = setTimeout(() => {
                            if (!msgTouchMovedRef.current) {
                              e.preventDefault();
                              setActiveMessageActions(activeMessageActions === msg.id ? null : msg.id);
                            }
                          }, 500);
                        }}
                        onTouchMove={() => {
                          msgTouchMovedRef.current = true;
                          if (msgTouchTimerRef.current) {
                            clearTimeout(msgTouchTimerRef.current);
                            msgTouchTimerRef.current = null;
                          }
                        }}
                        onTouchEnd={() => {
                          if (msgTouchTimerRef.current) {
                            clearTimeout(msgTouchTimerRef.current);
                            msgTouchTimerRef.current = null;
                          }
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {/* Hover Actions (desktop) + Long-press Actions (mobile) */}
                        {!isUnsent && !isEditing && (
                          <div
                            className={`${
                              activeMessageActions === msg.id
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            } transition-opacity absolute z-10
                            ${isSent
                              ? "bottom-full mb-1 right-0 sm:-left-[120px] sm:top-1/2 sm:bottom-auto sm:mb-0 sm:-translate-y-1/2 sm:right-auto"
                              : "bottom-full mb-1 left-0 sm:-right-[80px] sm:top-1/2 sm:bottom-auto sm:mb-0 sm:-translate-y-1/2 sm:left-auto"
                            } flex items-center gap-0.5 bg-white border border-[#e8e4e0] rounded-lg shadow-md px-1 py-0.5`}
                            onTouchStart={(e) => e.stopPropagation()}
                          >
                            {/* React */}
                            <button
                              onClick={() =>
                                setShowEmojiPickerFor(
                                  showEmojiPickerFor === msg.id ? null : msg.id
                                )
                              }
                              title="React"
                              className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-yellow-500 transition-colors"
                            >
                              <SmilePlus size={14} />
                            </button>
                            {/* Reply */}
                            <button
                              onClick={() => {
                                setReplyingTo(msg);
                                setShowEmojiPickerFor(null);
                              }}
                              title="Reply"
                              className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors"
                            >
                              <Reply size={14} />
                            </button>
                            {/* Forward */}
                            <button
                              onClick={() => {
                                setForwardingMessage(
                                  forwardingMessage?.id === msg.id ? null : msg
                                );
                                setShowEmojiPickerFor(null);
                              }}
                              title="Forward"
                              className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-green-500 transition-colors"
                            >
                              <Share2 size={14} />
                            </button>
                            {/* Sent-only actions */}
                            {isSent && (
                              <>
                                <div className="w-px h-4 bg-gray-200 mx-0.5" />
                                <button
                                  onClick={() => startEditing(msg)}
                                  title="Edit"
                                  className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleUnsend(msg.id)}
                                  title="Unsend"
                                  className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-orange-500 transition-colors"
                                >
                                  <RotateCcw size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  title="Delete"
                                  className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Emoji Picker Popup */}
                        {showEmojiPickerFor === msg.id && (
                          <div
                            ref={emojiPickerRef}
                            className={`absolute z-20 ${
                              isSent ? "right-0" : "left-0"
                            } bottom-full mb-1 bg-white border border-[#e8e4e0] rounded-xl shadow-lg px-2 py-1.5 flex items-center gap-1`}
                          >
                            {EMOJI_OPTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f2ef] transition-colors text-lg"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Forward Modal */}
                        {forwardingMessage?.id === msg.id && (
                          <div
                            ref={forwardModalRef}
                            className={`absolute z-20 ${
                              isSent ? "right-0" : "left-0"
                            } bottom-full mb-1 bg-white border border-[#e8e4e0] rounded-xl shadow-lg p-2 min-w-[180px] sm:min-w-[200px] max-h-[200px] overflow-y-auto`}
                          >
                            <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wide px-2 py-1">
                              Forward to...
                            </p>
                            {teamMembers
                              .filter((m) => m.id !== activeChat?.id)
                              .map((member) => (
                                <button
                                  key={member.id}
                                  onClick={() => handleForward(member, msg)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f5f2ef] transition-colors text-left"
                                >
                                  <Avatar user={member} size={24} />
                                  <span className="text-xs text-[#1a1a1a] truncate">
                                    {member.display_name}
                                  </span>
                                </button>
                              ))}
                            {teamMembers.filter((m) => m.id !== activeChat?.id).length === 0 && (
                              <p className="text-xs text-[#999] px-2 py-1">No other members</p>
                            )}
                          </div>
                        )}

                        {isEditing ? (
                          <div className="bg-white border border-[#D4692A]/40 rounded-2xl p-3 shadow-sm min-w-[220px]">
                            <input
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleEditMessage(msg.id);
                                }
                                if (e.key === "Escape") cancelEditing();
                              }}
                              autoFocus
                              className="w-full px-3 py-1.5 text-sm rounded-lg border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a]"
                            />
                            <div className="flex items-center justify-end gap-2 mt-2">
                              <button
                                onClick={cancelEditing}
                                className="px-3 py-1 text-xs rounded-lg text-[#999] hover:bg-gray-100 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditMessage(msg.id)}
                                disabled={!editContent.trim() || editSaving}
                                className="px-3 py-1 text-xs rounded-lg bg-[#D4692A] text-white hover:bg-[#c05e24] disabled:opacity-40 transition-colors"
                              >
                                {editSaving ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm ${
                              isUnsent
                                ? "bg-gray-100 border border-gray-200 text-gray-400 italic"
                                : isSent
                                  ? "bg-[#D4692A] text-white rounded-br-md"
                                  : "bg-white border border-[#e8e4e0] text-[#1a1a1a] rounded-bl-md shadow-sm"
                            }`}
                          >
                            {isUnsent ? (
                              <p className="text-sm italic text-gray-400">🚫 This message was unsent</p>
                            ) : (
                              <>
                                {/* Forwarded label */}
                                {isForwarded && (
                                  <p
                                    className={`text-[10px] italic mb-1.5 flex items-center gap-1 ${
                                      isSent ? "text-white/50" : "text-[#999]"
                                    }`}
                                  >
                                    <Share2 size={10} />
                                    Forwarded
                                  </p>
                                )}

                                {/* Reply-to quoted block */}
                                {repliedMessage && (
                                  <div
                                    className={`text-[10px] mb-2 px-2 py-1.5 rounded-lg border-l-2 ${
                                      isSent
                                        ? "border-white/40 bg-white/10 text-white/70"
                                        : "border-[#D4692A]/40 bg-[#f5f2ef] text-[#666]"
                                    }`}
                                  >
                                    <p className="font-semibold mb-0.5">
                                      {getSenderName(repliedMessage.sender_id)}
                                    </p>
                                    <p className="truncate max-w-[250px]">
                                      {repliedMessage.is_unsent
                                        ? "🚫 This message was unsent"
                                        : repliedMessage.content}
                                    </p>
                                  </div>
                                )}

                                {/* Attachment */}
                                {msg.attachment_url && (
                                  <div className="mb-2 min-w-[200px]">
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
                                    ) : isVideoAttachment(msg.attachment_type) ? (
                                      <video
                                        src={msg.attachment_url}
                                        controls
                                        preload="metadata"
                                        className="rounded-lg max-w-full max-h-48"
                                      />
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
                              </>
                            )}
                            <div
                              className={`flex items-center gap-1.5 mt-1.5 ${
                                isSent ? "justify-end" : ""
                              }`}
                            >
                              <p
                                className={`text-[10px] ${
                                  isUnsent ? "text-gray-300" : isSent ? "text-white/50" : "text-[#999]"
                                }`}
                              >
                                {formatMessageTime(msg.created_at)}
                              </p>
                              {isEdited && !isUnsent && (
                                <span
                                  className={`text-[10px] italic ${
                                    isSent ? "text-white/40" : "text-[#aaa]"
                                  }`}
                                >
                                  (edited)
                                </span>
                              )}
                            </div>
                            {isSent && !isUnsent && (
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (msg.is_read) {
                                      setReadReceiptPopup(readReceiptPopup === msg.id ? null : msg.id);
                                    }
                                  }}
                                  className={`text-[9px] flex items-center gap-1 ${
                                    msg.is_read ? "text-blue-200 cursor-pointer active:opacity-70" : "text-white/40 cursor-default"
                                  }`}
                                >
                                  {msg.is_read ? (
                                    <>
                                      <span>✓✓</span>
                                      <div className="w-3.5 h-3.5 rounded-full overflow-hidden border border-blue-200/50 flex-shrink-0">
                                        {activeChat?.profile_pic_url ? (
                                          <img
                                            src={activeChat.profile_pic_url}
                                            alt={activeChat.display_name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-blue-200/30 flex items-center justify-center text-[6px] font-bold text-blue-100">
                                            {activeChat?.display_name?.charAt(0)?.toUpperCase() || "?"}
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <span>✓ Sent</span>
                                  )}
                                </button>
                                {/* Read receipt popup */}
                                {readReceiptPopup === msg.id && (
                                  <div
                                    className="absolute bottom-full mb-1 right-0 z-30 bg-white border border-[#e8e4e0] rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 whitespace-nowrap"
                                    onClick={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                  >
                                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                      {activeChat?.profile_pic_url ? (
                                        <img
                                          src={activeChat.profile_pic_url}
                                          alt={activeChat.display_name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-[#D4692A]/10 flex items-center justify-center text-[#D4692A] text-[10px] font-bold rounded-full">
                                          {activeChat?.display_name?.charAt(0)?.toUpperCase() || "?"}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-medium text-[#1a1a1a]">{activeChat?.display_name}</p>
                                      <p className="text-[9px] text-[#999]">Read</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Reaction pills below bubble */}
                        {reactions.length > 0 && !isEditing && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isSent ? "justify-end" : "justify-start"}`}>
                            {reactions.map((r) => (
                              <button
                                key={r.emoji}
                                onClick={() => handleToggleReaction(msg.id, r.emoji)}
                                title={r.users.map((u) => u.display_name).join(", ")}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                  r.reacted
                                    ? "bg-[#D4692A]/10 border-[#D4692A]/30 text-[#D4692A]"
                                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                }`}
                              >
                                <span>{r.emoji}</span>
                                <span className="text-[10px] font-medium">{r.count}</span>
                              </button>
                            ))}
                          </div>
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

            {/* Reply-to preview bar */}
            {replyingTo && (
              <div className="px-4 sm:px-6 py-2.5 flex items-center gap-3 bg-[#faf8f6] border-t border-[#e8e4e0]">
                <CornerDownRight size={16} className="text-[#D4692A] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-[#D4692A]">
                    Replying to {getSenderName(replyingTo.sender_id)}
                  </p>
                  <p className="text-xs text-[#666] truncate">
                    {replyingTo.is_unsent
                      ? "🚫 This message was unsent"
                      : replyingTo.content}
                  </p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 rounded-lg hover:bg-white flex-shrink-0"
                >
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            )}

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
            <div className="p-3 sm:p-4 border-t border-[#e8e4e0] bg-white">
              <div className="flex items-center gap-2 sm:gap-3">
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

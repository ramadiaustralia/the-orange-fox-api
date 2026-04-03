"use client";
import { useEffect, useState, useCallback } from "react";
import { Mail, MailOpen, MessageSquare, Send, Clock, User, Package, ChevronDown, ChevronUp, RefreshCw, Filter } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import AccessDenied from "@/components/AccessDenied";


interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  package: string | null;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export default function MessagesPage() {
  const { hasAccess, isOwner } = usePermission("messages");
  if (hasAccess === false) return <AccessDenied section="Messages" />;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("all");

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/messages" : `/api/messages?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setMessages(data.data || []);
    } catch (e) {
      console.error("Failed to load messages", e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const toggleExpand = async (msg: Message) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(msg.id);
    // Mark as read if unread
    if (msg.status === "unread") {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, status: "read" }),
      });
      loadMessages();
    }
  };

  const sendReply = async (id: string) => {
    const reply = replyText[id];
    if (!reply?.trim()) return;
    setSending((prev) => ({ ...prev, [id]: true }));
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, admin_reply: reply }),
      });
      setReplyText((prev) => ({ ...prev, [id]: "" }));
      loadMessages();
    } finally {
      setSending((prev) => ({ ...prev, [id]: false }));
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      unread: "bg-[#D4692A]/10 text-[#D4692A] border-[#D4692A]/20",
      read: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      replied: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
    return (
      <span className={`inline-flex px-2.5 py-1 text-[10px] font-medium rounded-full border uppercase ${styles[status] || styles.unread}`}>
        {status}
      </span>
    );
  };

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] flex items-center gap-3" style={{ fontFamily: "var(--font-heading)" }}>
            Messages
            {unreadCount > 0 && (
              <span className="px-2.5 py-1 text-xs rounded-full bg-[#D4692A]/10 text-[#D4692A] border border-[#D4692A]/20">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-[#999999] mt-1">Manage contact form submissions</p>
        </div>
        <button
          onClick={loadMessages}
          className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] text-[#555555] hover:text-[#D4692A] hover:border-[#D4692A]/30 bg-white transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-[#555555]" />
        {["all", "unread", "read", "replied"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all capitalize ${
              filter === f
                ? "bg-[#D4692A]/10 text-[#D4692A] border border-[#D4692A]/20"
                : "text-[#999999] hover:text-[#1a1a1a] hover:bg-[#fafafa] border border-transparent"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Messages List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-[#f0ece8] rounded-2xl animate-pulse" />)}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#f0ece8] rounded-2xl shadow-sm">
          <MessageSquare size={40} className="mx-auto text-[#999999] opacity-40 mb-3" />
          <p className="text-lg font-semibold text-[#1a1a1a]">No messages</p>
          <p className="text-sm text-[#999999] mt-1">{filter !== "all" ? "Try a different filter" : "Messages will appear here"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => {
            const isExpanded = expandedId === msg.id;
            return (
              <div key={msg.id} className={`bg-white border rounded-2xl shadow-sm transition-all duration-200 ${
                msg.status === "unread" ? "border-[#D4692A]/20" : "border-[#f0ece8]"
              }`}>
                {/* Header Row */}
                <div
                  className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-[#fafafa] transition-colors rounded-2xl"
                  onClick={() => toggleExpand(msg)}
                >
                  <div className="flex-shrink-0">
                    {msg.status === "unread" ? (
                      <div className="w-10 h-10 rounded-xl bg-[#D4692A]/10 flex items-center justify-center">
                        <Mail size={16} className="text-[#D4692A]" />
                      </div>
                    ) : msg.status === "replied" ? (
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Send size={16} className="text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#fafafa] border border-[#f0ece8] flex items-center justify-center">
                        <MailOpen size={16} className="text-[#555555]" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-[#1a1a1a] truncate">{msg.name}</span>
                      {statusBadge(msg.status)}
                    </div>
                    <p className="text-sm text-[#999999] truncate">{msg.subject || "No subject"}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#555555]">
                      <span>{msg.email}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {new Date(msg.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {isExpanded ? <ChevronUp size={16} className="text-[#555555]" /> : <ChevronDown size={16} className="text-[#555555]" />}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-6 pb-6 animate-fade-in border-t border-[#f0ece8] mt-0 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-[#555555]">
                          <User size={12} /> <span className="text-[#1a1a1a]">{msg.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#555555]">
                          <Mail size={12} /> <span className="text-[#1a1a1a]">{msg.email}</span>
                        </div>
                        {msg.package && (
                          <div className="flex items-center gap-2 text-[#555555]">
                            <Package size={12} /> <span className="text-[#1a1a1a]">{msg.package}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="bg-[#fafafa] rounded-xl p-4 mb-4">
                      <p className="text-sm text-[#555555] whitespace-pre-wrap">{msg.message}</p>
                    </div>

                    {/* Previous Reply */}
                    {msg.admin_reply && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Send size={12} className="text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-400">Admin Reply</span>
                          {msg.replied_at && (
                            <span className="text-xs text-[#555555]">{new Date(msg.replied_at).toLocaleString()}</span>
                          )}
                        </div>
                        <p className="text-sm text-[#555555] whitespace-pre-wrap">{msg.admin_reply}</p>
                      </div>
                    )}

                    {/* Reply Form */}
                    <div>
                      <label className="block text-xs font-medium text-[#555555] mb-1.5">
                        {msg.admin_reply ? "Update Reply" : "Write Reply"}
                      </label>
                      <textarea
                        value={replyText[msg.id] || ""}
                        onChange={(e) => setReplyText((prev) => ({ ...prev, [msg.id]: e.target.value }))}
                        placeholder="Type your reply..."
                        className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-3 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all min-h-[100px] resize-y placeholder:text-[#999999]"
                      />
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={() => sendReply(msg.id)}
                          disabled={sending[msg.id] || !replyText[msg.id]?.trim()}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(212,105,42,0.3)] disabled:opacity-50"
                        >
                          <Send size={14} />
                          {sending[msg.id] ? "Sending..." : "Send Reply"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

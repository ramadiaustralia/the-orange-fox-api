"use client";
import { useEffect, useState, useCallback } from "react";
import { Mail, MailOpen, MessageSquare, Send, Clock, User, Package, ChevronDown, ChevronUp, RefreshCw, Filter, Trash2, Paperclip, Image as ImageIcon, Video, FileText, X, Download } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import AccessDenied from "@/components/AccessDenied";

interface Reply {
  type: string;
  message: string;
  timestamp: string;
  attachments?: { url: string; name: string; type: string; size: number }[];
}

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
  replies: Reply[];
  created_at: string;
}

export default function MessagesPage() {
  const { hasAccess, isOwner } = usePermission("messages");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("all");
  const [replyFiles, setReplyFiles] = useState<Record<string, { url: string; name: string; type: string; size: number }[]>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

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

  if (hasAccess === false) return <AccessDenied section="Customer Project Request" />;


  const toggleExpand = async (msg: Message) => {
    if (expandedId === msg.id) { setExpandedId(null); return; }
    setExpandedId(msg.id);
    if (msg.status === "unread") {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, status: "read" }),
      });
      loadMessages();
    }
  };

  const handleFileUpload = async (msgId: string, files: FileList) => {
    setUploading(p => ({ ...p, [msgId]: true }));
    const uploaded: { url: string; name: string; type: string; size: number }[] = [];
    for (const file of Array.from(files)) {
      try {
        // Step 1: Get signed upload URL from backend
        const signedRes = await fetch("/api/upload/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, fileType: file.type }),
        });
        if (!signedRes.ok) continue;
        const { signedUrl, publicUrl } = await signedRes.json();

        // Step 2: Upload directly to Supabase Storage (bypasses Vercel 4.5MB limit)
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (uploadRes.ok) {
          uploaded.push({ url: publicUrl, name: file.name, type: file.type, size: file.size });
        }
      } catch {}
    }
    setReplyFiles(p => ({ ...p, [msgId]: [...(p[msgId] || []), ...uploaded] }));
    setUploading(p => ({ ...p, [msgId]: false }));
  };

  const sendReply = async (id: string) => {
    const reply = replyText[id];
    if (!reply?.trim()) return;
    setSending((p) => ({ ...p, [id]: true }));
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, admin_reply: reply, attachments: replyFiles[id] || [] }),
      });
      setReplyText((p) => ({ ...p, [id]: "" }));
      setReplyFiles((p) => ({ ...p, [id]: [] }));
      loadMessages();
    } finally {
      setSending((p) => ({ ...p, [id]: false }));
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    setDeleting((p) => ({ ...p, [id]: true }));
    try {
      await fetch(`/api/messages?id=${id}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (expandedId === id) setExpandedId(null);
    } finally {
      setDeleting((p) => ({ ...p, [id]: false }));
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

  /** Determine the reply label based on whether there are previous admin replies */
  const getReplyLabel = (msg: Message): string => {
    const replies: Reply[] = Array.isArray(msg.replies) ? msg.replies : [];
    const hasAdminReply = replies.some((r) => r.type === "admin");
    if (hasAdminReply) {
      return "Will appear in the customer portal only (no email sent)";
    }
    return `Will be sent to ${msg.email} with portal access link`;
  };

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] flex items-center gap-3" style={{ fontFamily: "var(--font-heading)" }}>
            Customer Project Request
            {unreadCount > 0 && (
              <span className="px-2.5 py-1 text-xs rounded-full bg-[#D4692A]/10 text-[#D4692A] border border-[#D4692A]/20">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-[#999999] mt-1">Manage customer project requests and reply directly to their email</p>
        </div>
        <button onClick={loadMessages} className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] text-[#555555] hover:text-[#D4692A] hover:border-[#D4692A]/30 bg-white transition-all">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Filter size={14} className="text-[#555555]" />
        {["all", "unread", "read", "replied"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all capitalize ${
              filter === f ? "bg-[#D4692A]/10 text-[#D4692A] border border-[#D4692A]/20" : "text-[#999999] hover:text-[#1a1a1a] hover:bg-[#fafafa] border border-transparent"
            }`}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-[#f0ece8] rounded-2xl animate-pulse" />)}</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#f0ece8] rounded-2xl shadow-sm">
          <MessageSquare size={40} className="mx-auto text-[#999999] opacity-40 mb-3" />
          <p className="text-lg font-semibold text-[#1a1a1a]">No project requests</p>
          <p className="text-sm text-[#999999] mt-1">{filter !== "all" ? "Try a different filter" : "Customer project requests will appear here"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => {
            const isExpanded = expandedId === msg.id;
            const replies: Reply[] = Array.isArray(msg.replies) ? msg.replies : [];
            const hasCustomerReply = replies.some((r) => r.type === "customer");

            return (
              <div key={msg.id} className={`bg-white border rounded-2xl shadow-sm transition-all duration-200 ${
                msg.status === "unread" ? "border-[#D4692A]/20" : "border-[#f0ece8]"
              }`}>
                <div className="px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4 cursor-pointer hover:bg-[#fafafa] transition-colors rounded-2xl" onClick={() => toggleExpand(msg)}>
                  <div className="flex-shrink-0">
                    {msg.status === "unread" ? (
                      <div className="w-10 h-10 rounded-xl bg-[#D4692A]/10 flex items-center justify-center"><Mail size={16} className="text-[#D4692A]" /></div>
                    ) : msg.status === "replied" ? (
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Send size={16} className="text-emerald-400" /></div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#fafafa] border border-[#f0ece8] flex items-center justify-center"><MailOpen size={16} className="text-[#555555]" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-[#1a1a1a] truncate">{msg.name}</span>
                      {statusBadge(msg.status)}
                      {hasCustomerReply && <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">NEW REPLY</span>}
                    </div>
                    <p className="text-sm text-[#999999] truncate">{msg.subject || "No subject"}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#555555] flex-wrap">
                      <span className="truncate max-w-[180px] sm:max-w-none">{msg.email}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {new Date(msg.created_at).toLocaleDateString()}</span>
                      {replies.length > 0 && <span className="text-[#D4692A]">{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }}
                      className="p-2 rounded-lg hover:bg-red-50 text-[#999] hover:text-red-500 transition-colors" title="Delete">
                      {deleting[msg.id] ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                    {isExpanded ? <ChevronUp size={16} className="text-[#555555]" /> : <ChevronDown size={16} className="text-[#555555]" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 animate-fade-in border-t border-[#f0ece8] mt-0 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-[#555555]"><User size={12} /> <span className="text-[#1a1a1a]">{msg.name}</span></div>
                        <div className="flex items-center gap-2 text-[#555555]"><Mail size={12} /> <span className="text-[#1a1a1a]">{msg.email}</span></div>
                        {msg.package && <div className="flex items-center gap-2 text-[#555555]"><Package size={12} /> <span className="text-[#1a1a1a]">{msg.package}</span></div>}
                      </div>
                    </div>

                    {/* Original Message */}
                    <div className="bg-[#fafafa] rounded-xl p-4 mb-3">
                      <p className="text-[10px] text-[#999] mb-1 uppercase tracking-wider">Original Message • {new Date(msg.created_at).toLocaleString()}</p>
                      <p className="text-sm text-[#555555] whitespace-pre-wrap">{msg.message}</p>
                    </div>

                    {/* Conversation Thread */}
                    {replies.map((r, i) => (
                      <div key={i} className={`rounded-xl p-4 mb-3 border-l-[3px] ${
                        r.type === "admin" ? "bg-orange-50 border-[#D4692A]" : "bg-blue-50 border-blue-500"
                      }`}>
                        <p className="text-[10px] text-[#999] mb-1 uppercase tracking-wider">
                          {r.type === "admin" ? "🦊 Team Reply" : "💬 Customer Reply"} • {new Date(r.timestamp).toLocaleString()}
                        </p>
                        <p className="text-sm text-[#555555] whitespace-pre-wrap">{r.message}</p>
                        {r.attachments && r.attachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {r.attachments.map((att: { url: string; name: string; type: string; size: number }, ai: number) => (
                              att.type?.startsWith("image/") ? (
                                <a key={ai} href={att.url} target="_blank" rel="noopener noreferrer">
                                  <img src={att.url} alt={att.name} className="max-w-xs max-h-48 rounded-lg border border-[#e8e4e0] mt-1" />
                                </a>
                              ) : att.type?.startsWith("video/") ? (
                                <video key={ai} src={att.url} controls preload="metadata" className="max-w-xs max-h-48 rounded-lg mt-1" />
                              ) : (
                                <a key={ai} href={att.url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-white/50 border border-[#e8e4e0] rounded-lg text-sm text-[#555] hover:text-[#D4692A] transition-colors mt-1 w-fit">
                                  <FileText size={14} /> {att.name} <Download size={12} className="text-[#999]" />
                                </a>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Reply Form */}
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-[#555555] mb-1.5">
                        Write Reply <span className="text-[#999999]">({getReplyLabel(msg)})</span>
                      </label>
                      <textarea
                        value={replyText[msg.id] || ""}
                        onChange={(e) => setReplyText((p) => ({ ...p, [msg.id]: e.target.value }))}
                        placeholder="Type your reply..."
                        className="w-full bg-[#fafafa] border border-[#e8e4e0] text-[#1a1a1a] text-sm rounded-xl px-4 py-3 outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 transition-all min-h-[100px] resize-y placeholder:text-[#999999]"
                      />
                      {/* Attachment Buttons */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <input type="file" id={`img-${msg.id}`} accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleFileUpload(msg.id, e.target.files)} />
                        <input type="file" id={`vid-${msg.id}`} accept="video/*" multiple className="hidden" onChange={(e) => e.target.files && handleFileUpload(msg.id, e.target.files)} />
                        <input type="file" id={`doc-${msg.id}`} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip" multiple className="hidden" onChange={(e) => e.target.files && handleFileUpload(msg.id, e.target.files)} />
                        <button type="button" onClick={() => document.getElementById(`img-${msg.id}`)?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#e8e4e0] text-[#555] hover:text-[#D4692A] hover:border-[#D4692A]/30 transition-colors">
                          <ImageIcon size={12} /> Photo
                        </button>
                        <button type="button" onClick={() => document.getElementById(`vid-${msg.id}`)?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#e8e4e0] text-[#555] hover:text-[#D4692A] hover:border-[#D4692A]/30 transition-colors">
                          <Video size={12} /> Video
                        </button>
                        <button type="button" onClick={() => document.getElementById(`doc-${msg.id}`)?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#e8e4e0] text-[#555] hover:text-[#D4692A] hover:border-[#D4692A]/30 transition-colors">
                          <FileText size={12} /> File
                        </button>
                        {uploading[msg.id] && <span className="text-xs text-[#999]">Uploading...</span>}
                      </div>

                      {/* Attachment Preview */}
                      {replyFiles[msg.id]?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {replyFiles[msg.id].map((f, fi) => (
                            <div key={fi} className="flex items-center gap-2 px-3 py-1.5 bg-[#f5f2ef] border border-[#e8e4e0] rounded-lg text-xs text-[#555]">
                              {f.type?.startsWith("image/") ? <ImageIcon size={12} className="text-[#D4692A]" /> : f.type?.startsWith("video/") ? <Video size={12} className="text-[#D4692A]" /> : <FileText size={12} className="text-[#D4692A]" />}
                              <span className="max-w-[120px] truncate">{f.name}</span>
                              <button type="button" onClick={() => setReplyFiles(p => ({ ...p, [msg.id]: p[msg.id].filter((_, i) => i !== fi) }))} className="text-[#999] hover:text-red-500 transition-colors">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end mt-3">
                        <button onClick={() => sendReply(msg.id)}
                          disabled={sending[msg.id] || !replyText[msg.id]?.trim()}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#D4692A] text-white hover:bg-[#b85520] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(212,105,42,0.3)] disabled:opacity-50">
                          <Send size={14} /> {sending[msg.id] ? "Sending..." : "Send Reply"}
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

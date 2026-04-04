"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Paperclip,
  FileText,
  Download,
  X,
  Pencil,
  UserPlus,
  UserMinus,
  Loader2,
  MessageSquare,
  Check,
  ChevronDown,
} from "lucide-react";

interface MemberUser {
  id: string;
  display_name: string;
  position: string;
  profile_pic_url: string | null;
}

interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  added_at: string;
  user: MemberUser;
}

interface ProjectMessage {
  id: string;
  project_id: string;
  sender_id: string;
  content: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  created_at: string;
  edited_at: string | null;
  sender: MemberUser;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string;
  created_at: string;
}

interface AdminUser {
  id: string;
  display_name: string;
  position: string;
  profile_pic_url: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    in_progress: { bg: "bg-[#D4692A]/10", text: "text-[#D4692A]", label: "In Progress" },
    completed: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Completed" },
    on_hold: { bg: "bg-gray-100", text: "text-gray-500", label: "On Hold" },
  };
  const c = config[status] || config.in_progress;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function Avatar({ user, size = 36 }: { user: { display_name: string; profile_pic_url: string | null }; size?: number }) {
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
    </div>
  );
}

function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);

  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return time;
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

export default function ProjectDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Member management
  const [showAddMember, setShowAddMember] = useState(false);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");

  // Edit project
  const [editingProject, setEditingProject] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldAutoScroll = useRef(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Simple permission: only owner can manage
  const isOwner = user?.badge === "owner";

  // Fetch project data
  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setMembers(data.members || []);
        setMessages(data.messages || []);
      } else if (res.status === 403 || res.status === 404) {
        router.push("/dashboard/projects");
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  // Fetch messages for polling
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      /* ignore */
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Poll messages every 5 seconds
  useEffect(() => {
    if (!project) return;
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [project, fetchMessages]);

  // Auto-scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && shouldAutoScroll.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  };

  // Fetch all users for adding members
  const fetchUsers = useCallback(async () => {
    setAddMemberError("");
    try {
      const res = await fetch(`/api/auth/users?forProject=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users || []);
      } else {
        setAddMemberError("Failed to load users. Please try again.");
      }
    } catch {
      setAddMemberError("Network error. Please try again.");
    }
  }, [projectId]);

  const handleOpenAddMember = () => {
    fetchUsers();
    setShowAddMember(true);
  };

  const handleAddMember = async (userId: string) => {
    setAddingMember(true);
    setAddMemberError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        await fetchProject();
        setShowAddMember(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setAddMemberError(data.error || "Failed to add member.");
      }
    } catch {
      setAddMemberError("Failed to add member. Please try again.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from the project?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchProject();
      }
    } catch {
      alert("Failed to remove member. Please try again.");
    }
  };

  // Chat functions
  const handleSend = async () => {
    if ((!newMessage.trim() && !pendingFile) || sending) return;
    setSending(true);
    shouldAutoScroll.current = true;
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

      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  };

  const startEditing = (msg: ProjectMessage) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim() || editSaving) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, content: editContent.trim() }),
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

  // Project edit functions
  const startEditingProject = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDescription(project.description || "");
    setEditStatus(project.status);
    setEditingProject(true);
  };

  const handleSaveProject = async () => {
    if (!editName.trim() || savingProject) return;
    setSavingProject(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
          status: editStatus,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setEditingProject(false);
      }
    } catch {
      /* ignore */
    } finally {
      setSavingProject(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setShowStatusDropdown(false);
    if (!isOwner) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      }
    } catch {
      /* ignore */
    }
  };

  const isImageAttachment = (type: string | null) =>
    type?.startsWith("image/") || false;

  const isVideoAttachment = (type: string | null) =>
    type?.startsWith("video/") || false;

  // Get users not already in the project
  const availableUsers = allUsers.filter(
    (u) => !members.some((m) => m.user_id === u.id)
  );

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-[#D4692A]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-[#999]">Project not found</p>
        <button
          onClick={() => router.push("/dashboard/projects")}
          className="mt-3 text-sm text-[#D4692A] hover:underline"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back button + Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/dashboard/projects")}
          className="inline-flex items-center gap-1.5 text-sm text-[#999] hover:text-[#1a1a1a] transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </button>

        {editingProject ? (
          <div className="bg-white border border-[#e8e4e0] rounded-2xl p-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Project Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a]"
                >
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingProject(false)}
                  className="px-4 py-2 text-sm text-[#999] hover:text-[#1a1a1a] hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProject}
                  disabled={!editName.trim() || savingProject}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#D4692A] text-white text-sm font-medium rounded-xl hover:bg-[#c05e24] disabled:opacity-40 transition-colors"
                >
                  {savingProject ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1
                  className="text-2xl font-bold text-[#1a1a1a]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {project.name}
                </h1>
                {isOwner ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="inline-flex items-center gap-1"
                    >
                      <StatusBadge status={project.status} />
                      <ChevronDown size={12} className="text-[#999]" />
                    </button>
                    {showStatusDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                        <div className="absolute top-full left-0 mt-1 bg-white border border-[#e8e4e0] rounded-xl shadow-lg z-20 py-1 min-w-[140px]">
                          {[
                            { value: "in_progress", label: "In Progress" },
                            { value: "completed", label: "Completed" },
                            { value: "on_hold", label: "On Hold" },
                          ].map((s) => (
                            <button
                              key={s.value}
                              onClick={() => handleStatusChange(s.value)}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                project.status === s.value ? "text-[#D4692A] font-medium" : "text-[#1a1a1a]"
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <StatusBadge status={project.status} />
                )}
              </div>
              {project.description && (
                <p className="text-sm text-[#777] mt-1">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOwner && (
                <button
                  onClick={startEditingProject}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-[#999] hover:text-[#1a1a1a] hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Members + Chat */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Members Panel */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-white border border-[#e8e4e0] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f0ece8] flex items-center justify-between">
              <h2
                className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Members ({members.length})
              </h2>
              {isOwner && (
                <button
                  onClick={handleOpenAddMember}
                  className="p-1.5 rounded-lg hover:bg-[#D4692A]/10 text-[#D4692A] transition-colors"
                  title="Add Member"
                >
                  <UserPlus size={16} />
                </button>
              )}
            </div>

            <div className="divide-y divide-[#f0ece8] max-h-[400px] lg:max-h-[calc(100vh-20rem)] overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[#faf8f6] transition-colors"
                >
                  <Avatar user={member.user} size={36} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-[#1a1a1a] truncate block">
                      {member.user.display_name}
                    </span>
                    {member.user.position && (
                      <p className="text-xs text-[#999] truncate">{member.user.position}</p>
                    )}
                  </div>
                  {isOwner && member.user_id !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Remove member"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              ))}

              {members.length === 0 && (
                <div className="p-6 text-center text-sm text-[#999]">
                  No members yet
                </div>
              )}
            </div>
          </div>

          {/* Add Member Modal */}
          {showAddMember && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddMember(false)} />
              <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 z-10 max-h-[70vh] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3
                    className="text-base font-bold text-[#1a1a1a]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Add Member
                  </h3>
                  <button
                    onClick={() => setShowAddMember(false)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1">
                  {addMemberError ? (
                    <p className="text-sm text-red-500 text-center py-6">
                      {addMemberError}
                    </p>
                  ) : availableUsers.length === 0 ? (
                    <p className="text-sm text-[#999] text-center py-6">
                      All team members are already in this project
                    </p>
                  ) : (
                    availableUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleAddMember(u.id)}
                        disabled={addingMember}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#faf8f6] transition-colors text-left disabled:opacity-50"
                      >
                        <Avatar user={u} size={36} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1a1a1a] truncate">
                            {u.display_name}
                          </p>
                          {u.position && (
                            <p className="text-xs text-[#999] truncate">{u.position}</p>
                          )}
                        </div>
                        <UserPlus size={16} className="text-[#D4692A] flex-shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <div className="flex-1 bg-white border border-[#e8e4e0] rounded-2xl overflow-hidden flex flex-col min-h-[500px] lg:min-h-0 lg:h-[calc(100vh-16rem)]">
          {/* Chat Header */}
          <div className="px-5 py-4 border-b border-[#f0ece8]">
            <h2
              className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Project Chat
            </h2>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#fafafa]"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#999999]">
                <MessageSquare size={40} className="mb-3 text-[#ddd]" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Start the conversation with your team</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                const isEditingMsg = editingMessageId === msg.id;
                const isEdited = msg.edited_at !== null && msg.edited_at !== undefined;

                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    {!isMine && (
                      <div className="flex-shrink-0 mr-2 mt-auto mb-1">
                        <Avatar user={msg.sender} size={28} />
                      </div>
                    )}
                    <div className="relative group w-fit max-w-[80%] sm:max-w-[65%]">
                      {/* Edit button for own messages */}
                      {isMine && !isEditingMsg && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -left-8 top-1/2 -translate-y-1/2">
                          <button
                            onClick={() => startEditing(msg)}
                            title="Edit"
                            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      )}

                      {/* Sender name for others */}
                      {!isMine && (
                        <p className="text-[10px] font-medium text-[#999] mb-0.5 ml-1">
                          {msg.sender.display_name}
                        </p>
                      )}

                      {isEditingMsg ? (
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
                            isMine
                              ? "bg-[#D4692A] text-white rounded-br-md"
                              : "bg-white border border-[#e8e4e0] text-[#1a1a1a] rounded-bl-md shadow-sm"
                          }`}
                        >
                          {/* Attachment */}
                          {msg.attachment_url && (
                            <div className="mb-2 min-w-[200px]">
                              {isImageAttachment(msg.attachment_type) ? (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
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
                                    isMine ? "bg-white/10" : "bg-gray-50 border border-gray-100"
                                  }`}
                                >
                                  <FileText size={18} className={isMine ? "text-white/70" : "text-gray-400"} />
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-xs font-medium truncate ${isMine ? "text-white" : "text-gray-700"}`}>
                                      {msg.attachment_name || "File"}
                                    </p>
                                    <p className={`text-[10px] ${isMine ? "text-white/50" : "text-gray-400"}`}>
                                      {formatFileSize(msg.attachment_size)}
                                    </p>
                                  </div>
                                  <Download size={14} className={isMine ? "text-white/60" : "text-gray-400"} />
                                </a>
                              )}
                            </div>
                          )}

                          {msg.content && (
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          )}
                          <div className={`flex items-center gap-1.5 mt-1.5 ${isMine ? "justify-end" : ""}`}>
                            <p className={`text-[10px] ${isMine ? "text-white/50" : "text-[#999]"}`}>
                              {formatMessageTime(msg.created_at)}
                            </p>
                            {isEdited && (
                              <span className={`text-[10px] italic ${isMine ? "text-white/40" : "text-[#aaa]"}`}>
                                (edited)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending file preview */}
          {pendingFile && (
            <div className="px-5 py-2 flex items-center gap-3 bg-[#f5f2ef] border-t border-[#e8e4e0]">
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
                onChange={(e) => setNewMessage(e.target.value)}
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
        </div>
      </div>
    </div>
  );
}

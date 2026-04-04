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
  Shield,
  Crown,
  ArrowRightLeft,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  Upload,
  ListTodo,
  Reply,
  AtSign,
  Activity,
  Columns,
  GripVertical,
  CheckCircle2,
  Circle,
  CornerDownRight,
  Clock,
  Hash,
  SmilePlus,
} from "lucide-react";

// --- Interfaces ---

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
  reply_to?: {
    id: string;
    content: string;
    sender_id: string;
    sender?: { id: string; display_name: string };
  };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  target_date: string | null;
  created_by: string;
  created_at: string;
}

interface AdminUser {
  id: string;
  display_name: string;
  position: string;
  profile_pic_url: string | null;
}

interface TaskAssignee {
  id: string;
  user_id: string;
  user: MemberUser;
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  status_change_permission: string;
  created_at: string;
  creator: MemberUser;
  completer: MemberUser | null;
  assignees: TaskAssignee[];
  attachment_count: number;
}

interface TaskAttachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
  uploader: MemberUser;
}

interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  user: MemberUser;
  reply_to_id?: string;
  mentions?: string[];
  reply_to?: {
    id: string;
    content: string;
    user: { id: string; display_name: string };
  };
}

interface SubTask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  assigned_to: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  sort_order: number;
  assignee?: MemberUser;
  completer?: MemberUser;
  creator?: MemberUser;
}

interface ActivityItem {
  id: string;
  project_id: string;
  task_id: string | null;
  user_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  user: MemberUser;
}

// --- Reaction & Read Receipt Interfaces ---

interface ReactionGroup {
  emoji: string;
  count: number;
  users: { id: string; display_name: string }[];
  reacted: boolean;
}

interface ReactionsMap {
  [targetId: string]: ReactionGroup[];
}

interface ReadReceipt {
  user_id: string;
  display_name: string;
  profile_pic_url: string | null;
  read_at: string;
}

interface ReadReceiptsMap {
  [messageId: string]: ReadReceipt[];
}

// --- Shared Components ---

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

function RoleBadge({ role }: { role: string }) {
  if (role === "commissioner") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200">
        <Crown size={10} />
        Commissioner
      </span>
    );
  }
  if (role === "leader") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
        <Shield size={10} />
        Leader
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-gray-50 text-gray-400 border border-gray-200">
      Member
    </span>
  );
}

function Avatar({ user, size = 36 }: { user: { display_name: string; profile_pic_url: string | null }; size?: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {user.profile_pic_url ? (
        <img src={user.profile_pic_url} alt={user.display_name} className="rounded-full object-cover w-full h-full" />
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

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    low: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
    medium: { bg: "bg-orange-50", text: "text-[#D4692A]", border: "border-orange-200" },
    high: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
  };
  const c = config[priority] || config.medium;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${c.bg} ${c.text} border ${c.border}`}>
      {priority}
    </span>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; border: string; label: string }> = {
    pending: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", label: "Pending" },
    in_progress: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", label: "In Progress" },
    completed: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", label: "Completed" },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${c.bg} ${c.text} border ${c.border}`}>
      {c.label}
    </span>
  );
}

// --- Helpers ---

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

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// --- Rich Text Renderer ---

function renderRichText(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      elements.push(<div key={`gap-${i}`} className="h-2" />);
      i++;
      continue;
    }
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\d+)\.\s+(.*)/);
        if (!m) break;
        items.push(m[2]);
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 pl-1 my-1">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm text-[#1a1a1a]">{item}</li>
          ))}
        </ol>
      );
      continue;
    }
    const subBulletMatch = line.match(/^(\s{2,})[•\-*]\s+(.*)/);
    if (subBulletMatch) {
      elements.push(
        <div key={`sub-${i}`} className="flex items-start gap-2 pl-6 text-sm text-[#1a1a1a]">
          <span className="text-[#999] mt-px flex-shrink-0">&#8226;</span>
          <span>{subBulletMatch[2]}</span>
        </div>
      );
      i++;
      continue;
    }
    const bulletMatch = line.match(/^[•\-*]\s+(.*)/);
    if (bulletMatch) {
      elements.push(
        <div key={`bul-${i}`} className="flex items-start gap-2 pl-1 text-sm text-[#1a1a1a]">
          <span className="text-[#D4692A] mt-px flex-shrink-0">&#8226;</span>
          <span>{bulletMatch[1]}</span>
        </div>
      );
      i++;
      continue;
    }
    elements.push(<p key={`p-${i}`} className="text-sm text-[#1a1a1a]">{line}</p>);
    i++;
  }
  return <div className="space-y-0.5">{elements}</div>;
}

// --- Chat Content Renderer with @Mentions ---

function renderChatContent(content: string, projectMembers: ProjectMember[], isMine?: boolean): React.ReactNode {
  if (!content) return null;
  const names = projectMembers.map((m) => m.user.display_name);
  names.sort((a, b) => b.length - a.length);
  const escapedNames = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = escapedNames.length > 0 ? new RegExp(`(@(?:${escapedNames.join("|")}))`, "g") : null;
  if (!pattern) return content;
  const parts = content.split(pattern);
  return parts.map((part, idx) => {
    if (part.startsWith("@") && names.some((n) => part === `@${n}`)) {
      return (
        <span key={idx} className={isMine ? "text-white font-bold underline decoration-white/50" : "text-[#D4692A] font-semibold"}>
          {part}
        </span>
      );
    }
    return part;
  });
}

// --- Activity Description Helper ---

function getActivityDescription(activity: ActivityItem): string {
  const d = (activity.details || {}) as Record<string, string>;
  switch (activity.action) {
    case "project_updated":
      return `updated project${d.fields ? ` (${d.fields})` : ""}`;
    case "task_created":
      return `created task "${d.title || ""}"`;
    case "task_completed":
      return `completed task "${d.title || ""}"`;
    case "task_reopened":
      return `reopened task "${d.title || ""}"`;
    case "task_deleted":
      return `deleted task "${d.title || ""}"`;
    case "member_added":
      return `added ${d.memberName || "a member"} to the project`;
    case "member_removed":
      return `removed ${d.memberName || "a member"} from the project`;
    case "role_changed":
      return `changed ${d.memberName || "a member"}'s role to ${d.newRole || "member"}`;
    case "subtask_created":
      return `created subtask "${d.title || ""}"`;
    case "subtask_completed":
      return `completed subtask "${d.title || ""}"`;
    case "subtask_deleted":
      return `deleted subtask "${d.title || ""}"`;
    case "comment_added":
      return `commented on task "${d.taskTitle || ""}"`;
    case "attachment_uploaded":
      return `uploaded file "${d.fileName || ""}"`;
    case "attachment_deleted":
      return `deleted file "${d.fileName || ""}"`;
    default:
      return activity.action.replace(/_/g, " ");
  }
}

function getActivityColor(action: string): string {
  if (action.includes("created") || action.includes("added")) return "bg-emerald-400";
  if (action.includes("completed")) return "bg-blue-400";
  if (action.includes("deleted") || action.includes("removed")) return "bg-red-400";
  if (action.includes("updated") || action.includes("changed") || action.includes("reopened")) return "bg-amber-400";
  if (action.includes("comment")) return "bg-purple-400";
  if (action.includes("attachment") || action.includes("uploaded")) return "bg-cyan-400";
  return "bg-gray-400";
}

// --- Main Component ---

export default function ProjectDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<string>("member");

  // Tab state
  const [activeTab, setActiveTab] = useState<"tasks" | "board" | "chat" | "activity">("chat");

  // Chat state
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Chat Reply
  const [replyingTo, setReplyingTo] = useState<ProjectMessage | null>(null);

  // Chat @Mention
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);

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
  const [editTargetDate, setEditTargetDate] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Role management
  const [roleActionLoading, setRoleActionLoading] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Task state
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskItem | null>(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [showCreateTask, setShowCreateTask] = useState(false);

  // Create task form
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<string>("medium");
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskStatusPermission, setNewTaskStatusPermission] = useState("commissioner_and_leader");
  const [creatingTask, setCreatingTask] = useState(false);

  // Task detail editing
  const [editingTaskTitle, setEditingTaskTitle] = useState(false);
  const [editingTaskDesc, setEditingTaskDesc] = useState(false);
  const [taskTitleDraft, setTaskTitleDraft] = useState("");
  const [taskDescDraft, setTaskDescDraft] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [showTaskStatusDropdown, setShowTaskStatusDropdown] = useState(false);
  const [showTaskPriorityDropdown, setShowTaskPriorityDropdown] = useState(false);
  const [uploadingTaskFile, setUploadingTaskFile] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  // Task Comments (Feature 2)
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");

  // Comment Reply + Mention
  const [commentReplyTo, setCommentReplyTo] = useState<TaskComment | null>(null);
  const [commentMentionSearch, setCommentMentionSearch] = useState("");
  const [showCommentMentionDropdown, setShowCommentMentionDropdown] = useState(false);
  const [commentSelectedMentions, setCommentSelectedMentions] = useState<string[]>([]);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Reactions (Feature: Emoji React)
  const [chatReactions, setChatReactions] = useState<ReactionsMap>({});
  const [commentReactions, setCommentReactions] = useState<ReactionsMap>({});
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👏"];

  // Read Receipts
  const [readReceipts, setReadReceipts] = useState<ReadReceiptsMap>({});
  const [showReadReceiptsFor, setShowReadReceiptsFor] = useState<string | null>(null);

  // Subtasks (Feature 4)
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState("");

  // Activity (Feature 5)
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Board drag and drop (Feature 7)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taskFileInputRef = useRef<HTMLInputElement>(null);
  const shouldAutoScroll = useRef(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Permission helpers
  const isCommissioner = myRole === "commissioner";
  const isLeader = myRole === "leader";
  const canManageMembers = isCommissioner || isLeader;
  const canEditProject = isCommissioner;
  const isOwner = user?.badge === "owner";
  const canManageTasks = isCommissioner || isLeader || isOwner;

  // --- Project Data Fetching ---

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setMembers(data.members || []);
        setMessages(data.messages || []);
        setMyRole(data.myRole || "member");
      } else if (res.status === 403 || res.status === 404) {
        router.push("/dashboard/projects");
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

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

  // --- Task Fetching ---

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {
      /* ignore */
    }
  }, [projectId]);

  const fetchTaskDetail = useCallback(async (taskId: string) => {
    setTaskDetailLoading(true);
    try {
      const [taskRes, attachRes, subtaskRes, commentRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/tasks/${taskId}`),
        fetch(`/api/projects/${projectId}/tasks/${taskId}/attachments`),
        fetch(`/api/projects/${projectId}/tasks/${taskId}/subtasks`).catch(() => null),
        fetch(`/api/projects/${projectId}/tasks/${taskId}/comments`).catch(() => null),
      ]);
      if (taskRes.ok) {
        const data = await taskRes.json();
        setSelectedTaskDetail(data.task);
      }
      if (attachRes.ok) {
        const data = await attachRes.json();
        setTaskAttachments(data.attachments || []);
      }
      if (subtaskRes && subtaskRes.ok) {
        const data = await subtaskRes.json();
        setSubtasks(data.subtasks || []);
      } else {
        setSubtasks([]);
      }
      if (commentRes && commentRes.ok) {
        const data = await commentRes.json();
        setTaskComments(data.comments || []);
      } else {
        setTaskComments([]);
      }
    } catch {
      /* ignore */
    } finally {
      setTaskDetailLoading(false);
    }
  }, [projectId]);

  // --- Activity Fetching ---

  const fetchActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/activity?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch {
      /* ignore */
    } finally {
      setActivitiesLoading(false);
    }
  }, [projectId]);

  // --- Effects ---

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (project) fetchTasks();
  }, [project, fetchTasks]);

  useEffect(() => {
    if (!project || activeTab !== "chat") return;
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [project, activeTab, fetchMessages]);

  useEffect(() => {
    if (!project || (activeTab !== "tasks" && activeTab !== "board")) return;
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [project, activeTab, fetchTasks]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && shouldAutoScroll.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (activeTab === "activity" && project) {
      fetchActivities();
    }
  }, [activeTab, project, fetchActivities]);



  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  };

  // --- Member Management ---

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
      const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchProject();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to remove member.");
      }
    } catch {
      alert("Failed to remove member. Please try again.");
    }
  };

  // --- Role Management ---

  const handleSetLeader = async (userId: string) => {
    if (!confirm("Set this member as Leader?")) return;
    setRoleActionLoading(userId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "set_leader" }),
      });
      if (res.ok) {
        await fetchProject();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to set leader.");
      }
    } catch {
      alert("Failed to set leader. Please try again.");
    } finally {
      setRoleActionLoading(null);
    }
  };

  const handleRemoveLeader = async (userId: string) => {
    if (!confirm("Remove leader role? This member will be demoted to regular member.")) return;
    setRoleActionLoading(userId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "remove_leader" }),
      });
      if (res.ok) {
        await fetchProject();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to remove leader.");
      }
    } catch {
      alert("Failed to remove leader. Please try again.");
    } finally {
      setRoleActionLoading(null);
    }
  };

  const handleTransferLeadership = async (userId: string) => {
    setRoleActionLoading(userId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "transfer_leader" }),
      });
      if (res.ok) {
        setShowTransferModal(false);
        await fetchProject();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to transfer leadership.");
      }
    } catch {
      alert("Failed to transfer leadership. Please try again.");
    } finally {
      setRoleActionLoading(null);
    }
  };

  // --- Chat Functions ---

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
        try {
          const signedRes = await fetch("/api/upload/signed-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName: pendingFile.name, fileType: pendingFile.type }),
          });
          if (signedRes.ok) {
            const { signedUrl, publicUrl } = await signedRes.json();
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
          /* upload failed silently */
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
          reply_to_id: replyingTo?.id || undefined,
          mentions: selectedMentions.length > 0 ? selectedMentions : undefined,
        }),
      });
      if (res.ok) {
        setNewMessage("");
        setPendingFile(null);
        setReplyingTo(null);
        setSelectedMentions([]);
        setShowMentionDropdown(false);
        await fetchMessages();
      }
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && showMentionDropdown) {
      setShowMentionDropdown(false);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      if (showMentionDropdown) {
        e.preventDefault();
        const filtered = members.filter((m) =>
          m.user.display_name.toLowerCase().includes(mentionSearch.toLowerCase())
        );
        if (filtered.length > 0) {
          handleSelectMention(filtered[0].user);
        }
        return;
      }
      e.preventDefault();
      handleSend();
    }
  };

  const handleChatInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setNewMessage(value);
    setMentionCursorPos(cursor);
    const before = value.slice(0, cursor);
    const match = before.match(/@([^\s@]*)$/);
    if (match) {
      setMentionSearch(match[1].toLowerCase());
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
      setMentionSearch("");
    }
  };

  const handleSelectMention = (memberUser: MemberUser) => {
    const before = newMessage.slice(0, mentionCursorPos);
    const match = before.match(/@([^\s@]*)$/);
    if (!match) return;
    const start = mentionCursorPos - match[0].length;
    const textBefore = newMessage.slice(0, start);
    const textAfter = newMessage.slice(mentionCursorPos);
    const mentionText = `@${memberUser.display_name} `;
    const newText = textBefore + mentionText + textAfter;
    const newCursorPos = start + mentionText.length;
    setNewMessage(newText);
    setSelectedMentions((prev) => (prev.includes(memberUser.id) ? prev : [...prev, memberUser.id]));
    setShowMentionDropdown(false);
    setMentionSearch("");
    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
        chatInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
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

  // --- Project Edit / Delete ---

  const handleDeleteProject = async () => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    setDeletingProject(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/projects");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete project.");
        setDeletingProject(false);
      }
    } catch {
      alert("Failed to delete project. Please try again.");
      setDeletingProject(false);
    }
  };

  const startEditingProject = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDescription(project.description || "");
    setEditStatus(project.status);
    setEditTargetDate(project.target_date ? project.target_date.slice(0, 10) : "");
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
          target_date: editTargetDate || null,
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
    if (!canEditProject) return;
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

  // --- Task Functions ---

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || creatingTask) return;
    setCreatingTask(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim() || undefined,
          priority: newTaskPriority,
          assigneeIds: newTaskAssignees,
          deadline: newTaskDeadline || undefined,
          status_change_permission: newTaskStatusPermission,
        }),
      });
      if (res.ok) {
        setShowCreateTask(false);
        setNewTaskTitle("");
        setNewTaskDescription("");
        setNewTaskPriority("medium");
        setNewTaskAssignees([]);
        setNewTaskDeadline("");
        setNewTaskStatusPermission("commissioner_and_leader");
        await fetchTasks();
      }
    } catch {
      /* ignore */
    } finally {
      setCreatingTask(false);
    }
  };

  const handleToggleTaskStatus = async (task: TaskItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === "completed" ? "pending" : "completed";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
        const errData = await res.json().catch(() => null);
        if (res.status === 403) {
          alert(errData?.error || "You don't have permission to change this task's status");
        }
        return;
      }
      await fetchTasks();
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
    }
  };

  const handleOpenTaskDetail = (taskId: string) => {
    setSelectedTaskId(taskId);
    fetchTaskDetail(taskId);
  };

  const handleBackToList = () => {
    setSelectedTaskId(null);
    setSelectedTaskDetail(null);
    setTaskAttachments([]);
    setEditingTaskTitle(false);
    setEditingTaskDesc(false);
    setShowTaskStatusDropdown(false);
    setShowTaskPriorityDropdown(false);
    setTaskComments([]);
    setNewComment("");
    setEditingCommentId(null);
    setEditCommentContent("");
    setSubtasks([]);
    setNewSubtaskTitle("");
    setShowAddSubtask(false);
  };

  const handleUpdateTask = async (updates: Record<string, unknown>) => {
    if (!selectedTaskId || savingTask) return;
    setSavingTask(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${selectedTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTaskDetail(data.task);
        await fetchTasks();
      }
    } catch {
      /* ignore */
    } finally {
      setSavingTask(false);
      setEditingTaskTitle(false);
      setEditingTaskDesc(false);
      setShowTaskStatusDropdown(false);
      setShowTaskPriorityDropdown(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTaskId) return;
    if (!confirm("Delete this task? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${selectedTaskId}`, { method: "DELETE" });
      if (res.ok) {
        handleBackToList();
        await fetchTasks();
      }
    } catch {
      alert("Failed to delete task.");
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    if (!selectedTaskDetail) return;
    const newAssigneeIds = selectedTaskDetail.assignees.filter((a) => a.user_id !== userId).map((a) => a.user_id);
    await handleUpdateTask({ assigneeIds: newAssigneeIds });
    if (selectedTaskId) fetchTaskDetail(selectedTaskId);
  };

  const handleTaskFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedTaskId) return;
    setUploadingTaskFile(true);
    try {
      const signedRes = await fetch("/api/upload/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      if (!signedRes.ok) throw new Error("Failed to get upload URL");
      const { signedUrl, publicUrl } = await signedRes.json();
      const uploadRes = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploadRes.ok) throw new Error("Failed to upload file");
      await fetch(`/api/projects/${projectId}/tasks/${selectedTaskId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: publicUrl, fileName: file.name, fileType: file.type, fileSize: file.size }),
      });
      fetchTaskDetail(selectedTaskId);
      fetchTasks();
    } catch {
      alert("Failed to upload file.");
    } finally {
      setUploadingTaskFile(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selectedTaskId) return;
    setDeletingAttachmentId(attachmentId);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks/${selectedTaskId}/attachments?attachmentId=${attachmentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setTaskAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        fetchTasks();
      }
    } catch {
      alert("Failed to delete attachment.");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  // --- Task Comment Functions (Feature 2) ---

  const handleAddComment = async () => {
    if (!newComment.trim() || sendingComment || !selectedTaskId) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${selectedTaskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          reply_to_id: commentReplyTo?.id || undefined,
          mentions: commentSelectedMentions.length > 0 ? commentSelectedMentions : undefined,
        }),
      });
      if (res.ok) {
        setNewComment("");
        setCommentReplyTo(null);
        setCommentSelectedMentions([]);
        const commentsRes = await fetch(`/api/projects/${projectId}/tasks/${selectedTaskId}/comments`);
        if (commentsRes.ok) {
          const data = await commentsRes.json();
          setTaskComments(data.comments || []);
        }
      }
    } catch { /* ignore */ }
    finally { setSendingComment(false); }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentContent.trim() || !selectedTaskId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${selectedTaskId}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, content: editCommentContent.trim() }),
      });
      if (res.ok) {
        setEditingCommentId(null);
        setEditCommentContent("");
        const commentsRes = await fetch(`/api/projects/${projectId}/tasks/${selectedTaskId}/comments`);
        if (commentsRes.ok) {
          const data = await commentsRes.json();
          setTaskComments(data.comments || []);
        }
      }
    } catch {
      /* ignore */
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTaskId) return;
    if (!confirm("Delete this comment?")) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks/${selectedTaskId}/comments?commentId=${commentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setTaskComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch {
      /* ignore */
    }
  };

  // --- Comment Mention/Reply Handlers ---

  const handleCommentInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);
    const cursorPos = e.target.selectionStart || 0;
    const textBefore = val.slice(0, cursorPos);
    const match = textBefore.match(/@([^\s@]*)$/);
    if (match) {
      setCommentMentionSearch(match[1]);
      setShowCommentMentionDropdown(true);
    } else {
      setShowCommentMentionDropdown(false);
      setCommentMentionSearch("");
    }
  };

  const handleSelectCommentMention = (memberUser: MemberUser) => {
    if (!commentInputRef.current) return;
    const cursorPos = commentInputRef.current.selectionStart || 0;
    const before = newComment.slice(0, cursorPos);
    const match = before.match(/@([^\s@]*)$/);
    if (!match) return;
    const start = cursorPos - match[0].length;
    const textBefore = newComment.slice(0, start);
    const textAfter = newComment.slice(cursorPos);
    const mentionText = `@${memberUser.display_name} `;
    const newText = textBefore + mentionText + textAfter;
    const newCursorPos = start + mentionText.length;
    setNewComment(newText);
    if (!commentSelectedMentions.includes(memberUser.id)) {
      setCommentSelectedMentions((prev) => [...prev, memberUser.id]);
    }
    setShowCommentMentionDropdown(false);
    setCommentMentionSearch("");
    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        commentInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const commentMentionFilteredMembers = members.filter((m) =>
    m.user.display_name.toLowerCase().includes(commentMentionSearch.toLowerCase())
  );

  // --- Reaction Functions ---

  const fetchReactions = useCallback(async (targetType: "message" | "comment", targetIds: string[]) => {
    if (targetIds.length === 0) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/reactions?target_type=${targetType}&target_ids=${targetIds.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        if (targetType === "message") setChatReactions(data.reactions || {});
        else setCommentReactions(data.reactions || {});
      }
    } catch { /* ignore */ }
  }, [projectId]);

  const toggleReaction = async (targetType: "message" | "comment", targetId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, emoji }),
      });
      if (res.ok) {
        const ids = targetType === "message" ? messages.map((m) => m.id) : taskComments.map((c) => c.id);
        await fetchReactions(targetType, ids);
      }
    } catch { /* ignore */ }
    setShowEmojiPickerFor(null);
  };

  // --- Read Receipt Functions ---

  const fetchReadReceipts = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/messages/read?message_ids=${messageIds.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        setReadReceipts(data.receipts || {});
      }
    } catch { /* ignore */ }
  }, [projectId]);

  const markMessagesAsRead = useCallback(async () => {
    if (!user?.id || messages.length === 0) return;
    const unreadIds = messages
      .filter((m) => m.sender_id !== user.id)
      .filter((m) => !readReceipts[m.id]?.some((r) => r.user_id === user.id))
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    try {
      await fetch(`/api/projects/${projectId}/messages/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_ids: unreadIds }),
      });
      await fetchReadReceipts(messages.map((m) => m.id));
    } catch { /* ignore */ }
  }, [user?.id, messages, readReceipts, projectId, fetchReadReceipts]);

  // Reactions useEffects
  useEffect(() => {
    if (messages.length > 0 && activeTab === "chat") {
      fetchReactions("message", messages.map((m) => m.id));
    }
  }, [messages, activeTab, fetchReactions]);

  useEffect(() => {
    if (taskComments.length > 0 && selectedTaskId) {
      fetchReactions("comment", taskComments.map((c) => c.id));
    }
  }, [taskComments, selectedTaskId, fetchReactions]);

  // Read Receipts useEffects
  useEffect(() => {
    if (messages.length > 0 && activeTab === "chat") {
      fetchReadReceipts(messages.map((m) => m.id));
    }
  }, [messages, activeTab, fetchReadReceipts]);

  useEffect(() => {
    if (activeTab === "chat" && messages.length > 0) {
      markMessagesAsRead();
    }
  }, [activeTab, messages.length, markMessagesAsRead]);

  // --- Subtask Functions (Feature 4) ---

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || addingSubtask || !selectedTaskId) return;
    setAddingSubtask(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${selectedTaskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          assigned_to: newSubtaskAssignee || undefined,
        }),
      });
      if (res.ok) {
        setNewSubtaskTitle("");
        setNewSubtaskAssignee("");
        const subRes = await fetch(`/api/projects/${projectId}/tasks/${selectedTaskId}/subtasks`);
        if (subRes.ok) {
          const data = await subRes.json();
          setSubtasks(data.subtasks || []);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtask: SubTask) => {
    if (!selectedTaskId) return;
    const newCompleted = !subtask.is_completed;
    setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? { ...s, is_completed: newCompleted } : s)));
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${selectedTaskId}/subtasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtaskId: subtask.id, is_completed: newCompleted }),
      });
      if (!res.ok) {
        setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? { ...s, is_completed: subtask.is_completed } : s)));
      } else {
        const subRes = await fetch(`/api/projects/${projectId}/tasks/${selectedTaskId}/subtasks`);
        if (subRes.ok) {
          const data = await subRes.json();
          setSubtasks(data.subtasks || []);
        }
      }
    } catch {
      setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? { ...s, is_completed: subtask.is_completed } : s)));
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!selectedTaskId) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks/${selectedTaskId}/subtasks?subtaskId=${subtaskId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
      }
    } catch {
      /* ignore */
    }
  };

  // --- Board Drag and Drop (Feature 7) ---

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedTaskId) return;
    const task = tasks.find((t) => t.id === draggedTaskId);
    if (!task || task.status === newStatus) {
      setDraggedTaskId(null);
      return;
    }
    const oldStatus = task.status;
    setTasks((prev) => prev.map((t) => (t.id === draggedTaskId ? { ...t, status: newStatus } : t)));
    setDraggedTaskId(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: oldStatus } : t)));
        const errData = await res.json().catch(() => null);
        alert(errData?.error || "Failed to update task status. Permission denied.");
      } else {
        await fetchTasks();
      }
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: oldStatus } : t)));
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  // --- Computed Values ---

  const isImageAttachment = (type: string | null) => type?.startsWith("image/") || false;
  const isVideoAttachment = (type: string | null) => type?.startsWith("video/") || false;

  const availableUsers = allUsers.filter((u) => !members.some((m) => m.user_id === u.id));

  const sortedMembers = [...members].sort((a, b) => {
    const order: Record<string, number> = { commissioner: 0, leader: 1, member: 2 };
    return (order[a.role] ?? 2) - (order[b.role] ?? 2);
  });

  const transferableMembers = members.filter((m) => m.role === "member" && m.user_id !== user?.id);

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "all") return true;
    return t.status === taskFilter;
  });

  const canUploadToTask = () => {
    if (canManageTasks) return true;
    if (!selectedTaskDetail || !user) return false;
    return selectedTaskDetail.assignees.some((a) => a.user_id === user.id);
  };

  const mentionFilteredMembers = members.filter((m) =>
    m.user.display_name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const completedSubtasks = subtasks.filter((s) => s.is_completed).length;

  // --- Loading / Not Found ---

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
        <button onClick={() => router.push("/dashboard/projects")} className="mt-3 text-sm text-[#D4692A] hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  // --- Render ---

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
                  style={{ whiteSpace: "pre-wrap" }}
                />
                <p className="text-[10px] text-[#999] mt-1">Supports line breaks, numbered lists (1.), and bullet points (&bull;, -, *)</p>
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
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Target Date</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a]"
                  />
                  {editTargetDate && (
                    <button
                      onClick={() => setEditTargetDate("")}
                      className="p-2 rounded-xl hover:bg-gray-100 text-[#999] hover:text-red-500 transition-colors"
                      title="Clear date"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
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
                <h1 className="text-2xl font-bold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
                  {project.name}
                </h1>
                {canEditProject ? (
                  <div className="relative">
                    <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} className="inline-flex items-center gap-1">
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
                {project.target_date && (
                  <span className="text-xs text-[#999]">
                    &#127919; Target: {new Date(project.target_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                )}
              </div>
              {project.description && (
                <div className="mt-1">{renderRichText(project.description)}</div>
              )}
              <div className="mt-2">
                <span className="text-xs text-[#999] mr-2">Your role:</span>
                <RoleBadge role={myRole} />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isLeader && transferableMembers.length > 0 && (
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
                >
                  <ArrowRightLeft size={14} />
                  Transfer Leadership
                </button>
              )}
              {canEditProject && (
                <button
                  onClick={startEditingProject}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-[#999] hover:text-[#1a1a1a] hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              )}
              {isOwner && (
                <button
                  onClick={handleDeleteProject}
                  disabled={deletingProject}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  {deletingProject ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Members + Tabbed Area */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Members Panel */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="bg-white border border-[#e8e4e0] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f0ece8] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider" style={{ fontFamily: "var(--font-heading)" }}>
                Members ({members.length})
              </h2>
              {canManageMembers && (
                <button onClick={handleOpenAddMember} className="p-1.5 rounded-lg hover:bg-[#D4692A]/10 text-[#D4692A] transition-colors" title="Add Member">
                  <UserPlus size={16} />
                </button>
              )}
            </div>
            <div className="divide-y divide-[#f0ece8] max-h-[400px] lg:max-h-[calc(100vh-20rem)] overflow-y-auto">
              {sortedMembers.map((member) => {
                const isSelf = member.user_id === user?.id;
                const canRemoveThis = canManageMembers && !isSelf && member.role !== "commissioner" && !(isLeader && member.role === "leader");
                return (
                  <div key={member.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#faf8f6] transition-colors">
                    <Avatar user={member.user} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#1a1a1a] truncate">{member.user.display_name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <RoleBadge role={member.role} />
                        {member.user.position && <p className="text-[10px] text-[#999] truncate">{member.user.position}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isCommissioner && member.role === "member" && (
                        <button
                          onClick={() => handleSetLeader(member.user_id)}
                          disabled={roleActionLoading === member.user_id}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-300 hover:text-blue-500 transition-colors"
                          title="Set as Leader"
                        >
                          {roleActionLoading === member.user_id ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                        </button>
                      )}
                      {isCommissioner && member.role === "leader" && (
                        <button
                          onClick={() => handleRemoveLeader(member.user_id)}
                          disabled={roleActionLoading === member.user_id}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-blue-400 hover:text-amber-500 transition-colors"
                          title="Remove Leader role"
                        >
                          {roleActionLoading === member.user_id ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                        </button>
                      )}
                      {canRemoveThis && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                          title="Remove member"
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {members.length === 0 && (
                <div className="p-6 text-center text-sm text-[#999]">No members yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Tabbed Content Area */}
        <div className="flex-1 bg-white border border-[#e8e4e0] rounded-2xl overflow-hidden flex flex-col min-h-[500px] lg:min-h-0 lg:h-[calc(100vh-16rem)]">
          {/* Tab Headers */}
          <div className="flex border-b border-[#f0ece8] bg-white flex-shrink-0 overflow-x-auto">
            {([
              { key: "chat" as const, label: "Chat", icon: <MessageSquare size={16} />, count: undefined },
              { key: "tasks" as const, label: "Tasks", icon: <ListTodo size={16} />, count: tasks.length },
              { key: "board" as const, label: "Board", icon: <Columns size={16} />, count: undefined },
              { key: "activity" as const, label: "Activity", icon: <Activity size={16} />, count: undefined },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  if (tab.key === "chat") shouldAutoScroll.current = true;
                }}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                  activeTab === tab.key ? "text-[#D4692A]" : "text-[#999] hover:text-[#1a1a1a]"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? "bg-[#D4692A]/10 text-[#D4692A]" : "bg-gray-100 text-[#999]"
                  }`}>
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4692A] rounded-full" />}
              </button>
            ))}
          </div>

          {/* ===== TASKS TAB ===== */}
          {activeTab === "tasks" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedTaskId && selectedTaskDetail ? (
                /* Task Detail View */
                <div className="flex-1 overflow-y-auto">
                  {taskDetailLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 size={24} className="animate-spin text-[#D4692A]" />
                    </div>
                  ) : (
                    <div className="p-5 space-y-5">
                      {/* Back + Delete */}
                      <div className="flex items-center justify-between">
                        <button onClick={handleBackToList} className="inline-flex items-center gap-1.5 text-sm text-[#999] hover:text-[#1a1a1a] transition-colors">
                          <ArrowLeft size={14} />
                          Back to Tasks
                        </button>
                        {canManageTasks && (
                          <button onClick={handleDeleteTask} className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-colors">
                            <Trash2 size={14} />
                            Delete
                          </button>
                        )}
                      </div>

                      {/* Title */}
                      {editingTaskTitle && canManageTasks ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={taskTitleDraft}
                            onChange={(e) => setTaskTitleDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateTask({ title: taskTitleDraft.trim() });
                              if (e.key === "Escape") setEditingTaskTitle(false);
                            }}
                            autoFocus
                            className="flex-1 px-4 py-2.5 text-lg font-bold rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a]"
                          />
                          <button
                            onClick={() => handleUpdateTask({ title: taskTitleDraft.trim() })}
                            disabled={!taskTitleDraft.trim() || savingTask}
                            className="p-2 rounded-xl bg-[#D4692A] text-white hover:bg-[#c05e24] disabled:opacity-40 transition-colors"
                          >
                            {savingTask ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          </button>
                          <button onClick={() => setEditingTaskTitle(false)} className="p-2 rounded-xl hover:bg-gray-100 text-[#999] transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <h2
                          className={`text-xl font-bold text-[#1a1a1a] ${canManageTasks ? "cursor-pointer hover:text-[#D4692A] transition-colors" : ""}`}
                          style={{ fontFamily: "var(--font-heading)" }}
                          onClick={() => {
                            if (canManageTasks) {
                              setTaskTitleDraft(selectedTaskDetail.title);
                              setEditingTaskTitle(true);
                            }
                          }}
                        >
                          {selectedTaskDetail.title}
                          {canManageTasks && <Pencil size={14} className="inline ml-2 text-[#ccc]" />}
                        </h2>
                      )}

                      {/* Status + Priority Badges */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative">
                          {canManageTasks ? (
                            <button onClick={() => setShowTaskStatusDropdown(!showTaskStatusDropdown)}>
                              <div className="flex items-center gap-1">
                                <TaskStatusBadge status={selectedTaskDetail.status} />
                                <ChevronDown size={12} className="text-[#999]" />
                              </div>
                            </button>
                          ) : (
                            <TaskStatusBadge status={selectedTaskDetail.status} />
                          )}
                          {showTaskStatusDropdown && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowTaskStatusDropdown(false)} />
                              <div className="absolute top-full left-0 mt-1 bg-white border border-[#e8e4e0] rounded-xl shadow-lg z-20 py-1 min-w-[140px]">
                                {[
                                  { value: "pending", label: "Pending" },
                                  { value: "in_progress", label: "In Progress" },
                                  { value: "completed", label: "Completed" },
                                ].map((s) => (
                                  <button
                                    key={s.value}
                                    onClick={() => handleUpdateTask({ status: s.value })}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                      selectedTaskDetail.status === s.value ? "text-[#D4692A] font-medium" : "text-[#1a1a1a]"
                                    }`}
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="relative">
                          {canManageTasks ? (
                            <button onClick={() => setShowTaskPriorityDropdown(!showTaskPriorityDropdown)}>
                              <div className="flex items-center gap-1">
                                <PriorityBadge priority={selectedTaskDetail.priority} />
                                <ChevronDown size={12} className="text-[#999]" />
                              </div>
                            </button>
                          ) : (
                            <PriorityBadge priority={selectedTaskDetail.priority} />
                          )}
                          {showTaskPriorityDropdown && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowTaskPriorityDropdown(false)} />
                              <div className="absolute top-full left-0 mt-1 bg-white border border-[#e8e4e0] rounded-xl shadow-lg z-20 py-1 min-w-[120px]">
                                {["low", "medium", "high"].map((p) => (
                                  <button
                                    key={p}
                                    onClick={() => handleUpdateTask({ priority: p })}
                                    className={`w-full text-left px-4 py-2 text-sm capitalize hover:bg-gray-50 transition-colors ${
                                      selectedTaskDetail.priority === p ? "text-[#D4692A] font-medium" : "text-[#1a1a1a]"
                                    }`}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Description (Rich Text - Feature 6) */}
                      <div>
                        <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-2">Description</h3>
                        {editingTaskDesc && canManageTasks ? (
                          <div className="space-y-2">
                            <textarea
                              value={taskDescDraft}
                              onChange={(e) => setTaskDescDraft(e.target.value)}
                              rows={4}
                              autoFocus
                              className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] resize-none"
                              style={{ whiteSpace: "pre-wrap" }}
                              placeholder="Add a description..."
                            />
                            <p className="text-[10px] text-[#999]">Supports line breaks, numbered lists (1.), and bullet points (&bull;, -, *)</p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateTask({ description: taskDescDraft.trim() })}
                                disabled={savingTask}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#D4692A] text-white text-sm font-medium rounded-xl hover:bg-[#c05e24] disabled:opacity-40 transition-colors"
                              >
                                {savingTask ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Save
                              </button>
                              <button onClick={() => setEditingTaskDesc(false)} className="px-4 py-1.5 text-sm text-[#999] hover:text-[#1a1a1a] hover:bg-gray-100 rounded-xl transition-colors">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`${canManageTasks ? "cursor-pointer hover:bg-[#faf8f6] rounded-xl p-3 -m-3 transition-colors" : ""} ${!selectedTaskDetail.description ? "text-[#999] italic text-sm" : ""}`}
                            onClick={() => {
                              if (canManageTasks) {
                                setTaskDescDraft(selectedTaskDetail.description || "");
                                setEditingTaskDesc(true);
                              }
                            }}
                          >
                            {selectedTaskDetail.description ? renderRichText(selectedTaskDetail.description) : <span className="text-sm">No description</span>}
                            {canManageTasks && <Pencil size={12} className="inline ml-2 text-[#ccc]" />}
                          </div>
                        )}
                      </div>

                      {/* Checklist / Subtasks (Feature 4) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wider">
                            Checklist ({completedSubtasks}/{subtasks.length})
                          </h3>
                          <button
                            onClick={() => setShowAddSubtask(!showAddSubtask)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#D4692A] hover:bg-[#D4692A]/10 rounded-lg transition-colors"
                          >
                            <Plus size={12} />
                            Add item
                          </button>
                        </div>
                        {subtasks.length > 0 && (
                          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: subtasks.length > 0 ? `${(completedSubtasks / subtasks.length) * 100}%` : "0%" }}
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          {subtasks.map((st) => (
                            <div key={st.id} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#faf8f6] group transition-colors">
                              <button onClick={() => handleToggleSubtask(st)} className={`flex-shrink-0 transition-colors ${st.is_completed ? "text-emerald-500" : "text-[#ccc] hover:text-[#D4692A]"}`}>
                                {st.is_completed ? <CheckSquare size={16} /> : <Square size={16} />}
                              </button>
                              <span className={`flex-1 text-sm ${st.is_completed ? "line-through text-[#999]" : "text-[#1a1a1a]"}`}>{st.title}</span>
                              {st.assignee && <Avatar user={st.assignee} size={20} />}
                              <button
                                onClick={() => handleDeleteSubtask(st.id)}
                                className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                        {showAddSubtask && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={newSubtaskTitle}
                              onChange={(e) => setNewSubtaskTitle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask(); if (e.key === "Escape") setShowAddSubtask(false); }}
                              placeholder="Add a checklist item..."
                              autoFocus
                              className="flex-1 px-3 py-2 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] placeholder:text-[#999]"
                            />
                            <select
                              value={newSubtaskAssignee}
                              onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                              className="px-2 py-2 text-xs rounded-xl border border-[#e8e4e0] bg-white text-[#1a1a1a] max-w-[120px]"
                            >
                              <option value="">Unassigned</option>
                              {members.map((m) => (
                                <option key={m.user_id} value={m.user_id}>{m.user.display_name}</option>
                              ))}
                            </select>
                            <button
                              onClick={handleAddSubtask}
                              disabled={!newSubtaskTitle.trim() || addingSubtask}
                              className="p-2 rounded-xl bg-[#D4692A] text-white hover:bg-[#c05e24] disabled:opacity-40 transition-colors"
                            >
                              {addingSubtask ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            </button>
                          </div>
                        )}
                        {subtasks.length === 0 && !showAddSubtask && (
                          <p className="text-xs text-[#999] italic pl-1">No checklist items yet</p>
                        )}
                      </div>

                      {/* Assignees */}
                      <div>
                        <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-2">Assigned to</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedTaskDetail.assignees.length === 0 ? (
                            <p className="text-sm text-[#999] italic">No assignees</p>
                          ) : (
                            selectedTaskDetail.assignees.map((assignee) => (
                              <div key={assignee.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#faf8f6] border border-[#f0ece8] rounded-full">
                                <Avatar user={assignee.user} size={20} />
                                <span className="text-sm text-[#1a1a1a]">{assignee.user.display_name}</span>
                                {canManageTasks && (
                                  <button onClick={() => handleRemoveAssignee(assignee.user_id)} className="p-0.5 rounded-full hover:bg-red-100 text-[#ccc] hover:text-red-500 transition-colors">
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Deadline */}
                      {selectedTaskDetail.deadline && (() => {
                        const dl = new Date(selectedTaskDetail.deadline);
                        const now = new Date();
                        const hoursLeft = (dl.getTime() - now.getTime()) / (1000 * 60 * 60);
                        const isOverdue = hoursLeft <= 0 && selectedTaskDetail.status !== "completed";
                        const isUrgent = hoursLeft > 0 && hoursLeft <= 24;
                        return (
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isOverdue ? "bg-red-50 text-red-600 border border-red-200" : isUrgent ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-[#faf8f6] text-[#777] border border-[#f0ece8]"}`}>
                            <span className="font-medium">&#128197; Deadline:</span>
                            <span>{dl.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} {dl.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                            {isOverdue && <span className="font-semibold ml-1">&#9888;&#65039; OVERDUE</span>}
                            {isUrgent && !isOverdue && <span className="font-semibold ml-1">&#9200; Urgent</span>}
                          </div>
                        );
                      })()}

                      {/* Status Permission Info */}
                      <div className="flex items-center gap-2 text-xs text-[#999] bg-[#fafafa] px-3 py-2 rounded-xl">
                        <span>&#128274; Status changes by:</span>
                        <strong className="text-[#777]">
                          {selectedTaskDetail.status_change_permission === "commissioner_only" && "Commissioner Only"}
                          {selectedTaskDetail.status_change_permission === "leader_only" && "Leader Only"}
                          {selectedTaskDetail.status_change_permission === "commissioner_and_leader" && "Commissioner & Leader"}
                          {selectedTaskDetail.status_change_permission === "creator_only" && "Task Creator Only"}
                          {!selectedTaskDetail.status_change_permission && "Commissioner & Leader"}
                        </strong>
                      </div>

                      {/* Created by / Completed by */}
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#999]">
                        <span>Created by <strong className="text-[#777]">{selectedTaskDetail.creator?.display_name || "Unknown"}</strong></span>
                        {selectedTaskDetail.completer && (
                          <span>Completed by <strong className="text-[#777]">{selectedTaskDetail.completer?.display_name || "Unknown"}</strong></span>
                        )}
                        <span>{formatMessageTime(selectedTaskDetail.created_at)}</span>
                      </div>

                      {/* Attachments */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wider">Attachments ({taskAttachments.length})</h3>
                          {canUploadToTask() && (
                            <>
                              <input ref={taskFileInputRef} type="file" className="hidden" onChange={handleTaskFileSelect} />
                              <button
                                onClick={() => taskFileInputRef.current?.click()}
                                disabled={uploadingTaskFile}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#D4692A] hover:bg-[#D4692A]/10 rounded-xl transition-colors disabled:opacity-40"
                              >
                                {uploadingTaskFile ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                Upload
                              </button>
                            </>
                          )}
                        </div>
                        {taskAttachments.length === 0 ? (
                          <div className="text-center py-6 text-sm text-[#999] bg-[#fafafa] rounded-xl border border-dashed border-[#e8e4e0]">
                            <Paperclip size={20} className="mx-auto mb-1.5 text-[#ddd]" />
                            No attachments yet
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {taskAttachments.map((att) => (
                              <div key={att.id} className="flex items-center gap-3 px-4 py-3 bg-[#fafafa] border border-[#f0ece8] rounded-xl hover:bg-[#faf8f6] transition-colors">
                                <FileText size={18} className="text-[#D4692A] flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{att.file_name}</p>
                                  <p className="text-[10px] text-[#999]">
                                    {formatFileSize(att.file_size)}
                                    {att.uploader && ` \u00b7 Uploaded by ${att.uploader.display_name}`}
                                  </p>
                                </div>
                                <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white text-[#999] hover:text-[#1a1a1a] transition-colors" title="Download">
                                  <Download size={14} />
                                </a>
                                {canManageTasks && (
                                  <button
                                    onClick={() => handleDeleteAttachment(att.id)}
                                    disabled={deletingAttachmentId === att.id}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                                    title="Delete"
                                  >
                                    {deletingAttachmentId === att.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Discussion / Comments (Feature 2) */}
                      <div>
                        <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-3">Discussion ({taskComments.length})</h3>
                        <div className="space-y-3 mb-4">
                          {taskComments.length === 0 ? (
                            <p className="text-sm text-[#999] italic">No comments yet. Start the discussion!</p>
                          ) : (
                            taskComments.map((comment) => {
                              const isOwnComment = comment.user_id === user?.id;
                              const isEditingThisComment = editingCommentId === comment.id;
                              return (
                                <div key={comment.id} className="flex gap-3 group relative">
                                  <Avatar user={comment.user} size={28} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-[#1a1a1a]">{comment.user.display_name}</span>
                                      <span className="text-[10px] text-[#999]">{formatRelativeTime(comment.created_at)}</span>
                                      {comment.edited_at && <span className="text-[10px] text-[#aaa] italic">(edited)</span>}
                                    </div>
                                    {/* Reply preview */}
                                    {comment.reply_to && (
                                      <div className="text-[10px] mt-1 mb-1 px-2 py-1.5 rounded-lg border-l-2 bg-[#faf8f6] border-[#D4692A]/30 text-[#777]">
                                        <div className="flex items-center gap-1 mb-0.5">
                                          <CornerDownRight size={8} />
                                          <span className="font-semibold">{comment.reply_to.user?.display_name || "Unknown"}</span>
                                        </div>
                                        <p className="truncate">{comment.reply_to.content?.slice(0, 80)}</p>
                                      </div>
                                    )}
                                    {isEditingThisComment ? (
                                      <div className="mt-1 space-y-2">
                                        <textarea
                                          value={editCommentContent}
                                          onChange={(e) => setEditCommentContent(e.target.value)}
                                          rows={2}
                                          autoFocus
                                          className="w-full px-3 py-2 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] resize-none"
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditComment(comment.id); }
                                            if (e.key === "Escape") { setEditingCommentId(null); setEditCommentContent(""); }
                                          }}
                                        />
                                        <div className="flex gap-2">
                                          <button onClick={() => handleEditComment(comment.id)} disabled={!editCommentContent.trim()} className="px-3 py-1 text-xs bg-[#D4692A] text-white rounded-lg hover:bg-[#c05e24] disabled:opacity-40 transition-colors">Save</button>
                                          <button onClick={() => { setEditingCommentId(null); setEditCommentContent(""); }} className="px-3 py-1 text-xs text-[#999] hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-[#1a1a1a] mt-0.5 whitespace-pre-wrap">{renderChatContent(comment.content, members)}</p>
                                    )}
                                    {/* Comment reactions display */}
                                    {commentReactions[comment.id] && commentReactions[comment.id].length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {commentReactions[comment.id].map((r) => (
                                          <button
                                            key={r.emoji}
                                            onClick={() => toggleReaction("comment", comment.id, r.emoji)}
                                            title={r.users.map((u) => u.display_name).join(", ")}
                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
                                              r.reacted
                                                ? "bg-[#D4692A]/10 text-[#D4692A] border border-[#D4692A]/30"
                                                : "bg-gray-50 text-gray-500 border border-gray-200"
                                            }`}
                                          >
                                            <span>{r.emoji}</span>
                                            <span className="font-medium">{r.count}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    {/* Comment action buttons */}
                                    <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => setCommentReplyTo(comment)} className="text-[10px] text-[#999] hover:text-[#D4692A] transition-colors">Reply</button>
                                      <button
                                        onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === `comment-${comment.id}` ? null : `comment-${comment.id}`)}
                                        className="text-[10px] text-[#999] hover:text-yellow-500 transition-colors"
                                      >React</button>
                                      {isOwnComment && !isEditingThisComment && (
                                        <>
                                          <button onClick={() => { setEditingCommentId(comment.id); setEditCommentContent(comment.content); }} className="text-[10px] text-[#999] hover:text-[#D4692A] transition-colors">Edit</button>
                                          <button onClick={() => handleDeleteComment(comment.id)} className="text-[10px] text-[#999] hover:text-red-500 transition-colors">Delete</button>
                                        </>
                                      )}
                                    </div>
                                    {/* Comment emoji picker */}
                                    {showEmojiPickerFor === `comment-${comment.id}` && (
                                      <div className="absolute left-0 z-40 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 flex gap-0.5 mt-1">
                                        {QUICK_EMOJIS.map((emoji) => (
                                          <button
                                            key={emoji}
                                            onClick={() => toggleReaction("comment", comment.id, emoji)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-sm transition-colors"
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        {/* Reply-to preview */}
                        {commentReplyTo && (
                          <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-[#faf8f6] border border-[#e8e4e0] rounded-xl">
                            <CornerDownRight size={14} className="text-[#D4692A] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold text-[#D4692A]">Replying to {commentReplyTo.user.display_name}</span>
                              <p className="text-xs text-[#999] truncate">{commentReplyTo.content?.slice(0, 100)}</p>
                            </div>
                            <button onClick={() => setCommentReplyTo(null)} className="p-1 rounded-lg hover:bg-white">
                              <X size={14} className="text-gray-400" />
                            </button>
                          </div>
                        )}
                        {/* Comment Mention Dropdown */}
                        <div className="relative">
                          {showCommentMentionDropdown && commentMentionFilteredMembers.length > 0 && (
                            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-[#e8e4e0] rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                              {commentMentionFilteredMembers.map((m) => (
                                <button
                                  key={m.user_id}
                                  onClick={() => handleSelectCommentMention(m.user)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#faf8f6] transition-colors text-left"
                                >
                                  <Avatar user={m.user} size={24} />
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium text-[#1a1a1a]">{m.user.display_name}</span>
                                    {m.user.position && <span className="text-[10px] text-[#999] ml-2">{m.user.position}</span>}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Add Comment Input */}
                          <div className="flex gap-2">
                            <textarea
                              ref={commentInputRef}
                              value={newComment}
                              onChange={handleCommentInputChange}
                              rows={2}
                              placeholder="Write a comment... Use @ to mention"
                              className="flex-1 px-3 py-2 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] resize-none placeholder:text-[#999]"
                              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                            />
                            <button
                              onClick={handleAddComment}
                              disabled={!newComment.trim() || sendingComment}
                              className="self-end p-2.5 rounded-xl bg-[#D4692A] text-white hover:bg-[#c05e24] disabled:opacity-40 transition-colors"
                            >
                              {sendingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Task List View */
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#f0ece8] flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider" style={{ fontFamily: "var(--font-heading)" }}>Tasks</h2>
                      <span className="text-xs text-[#999] bg-gray-100 px-2 py-0.5 rounded-full font-medium">{filteredTasks.length}</span>
                    </div>
                    {canManageTasks && (
                      <button onClick={() => setShowCreateTask(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D4692A] text-white text-sm font-medium rounded-xl hover:bg-[#c05e24] transition-colors">
                        <Plus size={14} />
                        New Task
                      </button>
                    )}
                  </div>
                  <div className="px-5 py-3 border-b border-[#f0ece8] flex gap-2 flex-wrap flex-shrink-0">
                    {(["all", "pending", "in_progress", "completed"] as const).map((filter) => {
                      const labels: Record<string, string> = { all: "All", pending: "Pending", in_progress: "In Progress", completed: "Completed" };
                      const isActive = taskFilter === filter;
                      return (
                        <button
                          key={filter}
                          onClick={() => setTaskFilter(filter)}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                            isActive ? "bg-[#D4692A] text-white" : "bg-[#fafafa] text-[#999] border border-[#e8e4e0] hover:bg-[#faf8f6] hover:text-[#1a1a1a]"
                          }`}
                        >
                          {labels[filter]}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex-1 overflow-y-auto bg-[#fafafa]">
                    {filteredTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-[#999]">
                        <ListTodo size={40} className="mb-3 text-[#ddd]" />
                        <p className="text-sm">No tasks {taskFilter !== "all" ? `with status "${taskFilter.replace("_", " ")}"` : "yet"}</p>
                        {canManageTasks && taskFilter === "all" && <p className="text-xs mt-1">Create your first task to get started</p>}
                      </div>
                    ) : (
                      <div className="divide-y divide-[#f0ece8]">
                        {filteredTasks.map((task) => {
                          const isCompleted = task.status === "completed";
                          return (
                            <div key={task.id} onClick={() => handleOpenTaskDetail(task.id)} className="flex items-start gap-3 px-5 py-4 hover:bg-white cursor-pointer transition-colors">
                              <button onClick={(e) => handleToggleTaskStatus(task, e)} className={`mt-0.5 flex-shrink-0 transition-colors hover:text-[#D4692A] ${isCompleted ? "text-emerald-500" : "text-[#ccc]"}`}>
                                {isCompleted ? <CheckSquare size={18} /> : <Square size={18} />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-sm font-medium ${isCompleted ? "line-through text-[#999]" : "text-[#1a1a1a]"}`}>{task.title}</span>
                                  <PriorityBadge priority={task.priority} />
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                  {task.assignees.length > 0 && (
                                    <div className="flex items-center -space-x-1.5">
                                      {task.assignees.slice(0, 3).map((a) => (
                                        <div key={a.id} className="ring-2 ring-white rounded-full"><Avatar user={a.user} size={20} /></div>
                                      ))}
                                      {task.assignees.length > 3 && (
                                        <div className="ring-2 ring-white rounded-full w-5 h-5 bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500">+{task.assignees.length - 3}</div>
                                      )}
                                    </div>
                                  )}
                                  {task.attachment_count > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-[#999]"><Paperclip size={11} />{task.attachment_count}</span>
                                  )}
                                  <span className="text-[11px] text-[#999]">Created by {task.creator?.display_name || "Unknown"}</span>
                                  {task.deadline && (() => {
                                    const dl = new Date(task.deadline);
                                    const now = new Date();
                                    const hoursLeft = (dl.getTime() - now.getTime()) / (1000 * 60 * 60);
                                    const isUrgent = hoursLeft > 0 && hoursLeft <= 24;
                                    const isOverdue = hoursLeft <= 0 && task.status !== "completed";
                                    return (
                                      <span className={`text-[11px] font-medium ${isOverdue ? "text-red-500" : isUrgent ? "text-amber-500" : "text-[#999]"}`}>
                                        {isOverdue ? "\u26a0\ufe0f Overdue" : `\ud83d\udcc5 ${dl.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== BOARD TAB (Feature 7) ===== */}
          {activeTab === "board" && (
            <div className="flex-1 overflow-auto p-5 bg-[#fafafa]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-h-full">
                {([
                  { status: "pending", label: "Pending", color: "border-amber-400", bgHover: "bg-amber-50/50" },
                  { status: "in_progress", label: "In Progress", color: "border-blue-400", bgHover: "bg-blue-50/50" },
                  { status: "completed", label: "Completed", color: "border-emerald-400", bgHover: "bg-emerald-50/50" },
                ] as const).map((col) => {
                  const colTasks = tasks.filter((t) => t.status === col.status);
                  const isOver = dragOverColumn === col.status;
                  return (
                    <div
                      key={col.status}
                      onDragOver={(e) => handleDragOver(e, col.status)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, col.status)}
                      className={`flex flex-col rounded-2xl border-t-4 ${col.color} bg-white/70 backdrop-blur-sm shadow-sm border border-[#e8e4e0] transition-all ${isOver ? `ring-2 ring-[#D4692A]/30 ${col.bgHover}` : ""}`}
                    >
                      <div className="px-4 py-3 border-b border-[#f0ece8] flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>{col.label}</h3>
                        <span className="text-xs text-[#999] bg-gray-100 px-2 py-0.5 rounded-full font-medium">{colTasks.length}</span>
                      </div>
                      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-24rem)]">
                        {colTasks.length === 0 ? (
                          <div className="text-center py-8 text-xs text-[#999]">No tasks</div>
                        ) : (
                          colTasks.map((task) => {
                            const isDragging = draggedTaskId === task.id;
                            return (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={() => handleDragStart(task.id)}
                                onDragEnd={handleDragEnd}
                                onClick={() => { setActiveTab("tasks"); handleOpenTaskDetail(task.id); }}
                                className={`p-3 bg-white border border-[#f0ece8] rounded-xl cursor-pointer hover:shadow-md transition-all ${isDragging ? "opacity-40 scale-95" : ""}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className={`text-sm font-medium ${task.status === "completed" ? "line-through text-[#999]" : "text-[#1a1a1a]"}`}>{task.title}</span>
                                  <GripVertical size={14} className="text-[#ddd] flex-shrink-0 mt-0.5" />
                                </div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <PriorityBadge priority={task.priority} />
                                  {task.deadline && (() => {
                                    const dl = new Date(task.deadline);
                                    const now = new Date();
                                    const hoursLeft = (dl.getTime() - now.getTime()) / (1000 * 60 * 60);
                                    const isOverdue = hoursLeft <= 0 && task.status !== "completed";
                                    const isUrgent = hoursLeft > 0 && hoursLeft <= 24;
                                    return (
                                      <span className={`text-[10px] font-medium flex items-center gap-0.5 ${isOverdue ? "text-red-500" : isUrgent ? "text-amber-500" : "text-[#999]"}`}>
                                        <Clock size={10} />
                                        {isOverdue ? "Overdue" : dl.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                      </span>
                                    );
                                  })()}
                                  {task.attachment_count > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-[#999]"><Paperclip size={10} />{task.attachment_count}</span>
                                  )}
                                </div>
                                {task.assignees.length > 0 && (
                                  <div className="flex items-center -space-x-1.5 mt-2">
                                    {task.assignees.slice(0, 3).map((a) => (
                                      <div key={a.id} className="ring-2 ring-white rounded-full"><Avatar user={a.user} size={22} /></div>
                                    ))}
                                    {task.assignees.length > 3 && (
                                      <div className="ring-2 ring-white rounded-full w-[22px] h-[22px] bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500">+{task.assignees.length - 3}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== CHAT TAB (Feature 3: Reply + @Mention) ===== */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages */}
              <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#fafafa]">
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
                          {/* Hover actions: Edit + Reply */}
                          {!isEditingMsg && (
                            <div className={`opacity-0 group-hover:opacity-100 transition-opacity absolute ${isMine ? "-left-16" : "-right-16"} top-1/2 -translate-y-1/2 flex items-center gap-0.5`}>
                              <button
                                onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)}
                                title="React"
                                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-yellow-500 transition-colors"
                              >
                                <SmilePlus size={13} />
                              </button>
                              <button
                                onClick={() => setReplyingTo(msg)}
                                title="Reply"
                                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#D4692A] transition-colors"
                              >
                                <Reply size={13} />
                              </button>
                              {isMine && (
                                <button
                                  onClick={() => startEditing(msg)}
                                  title="Edit"
                                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors"
                                >
                                  <Pencil size={13} />
                                </button>
                              )}
                            </div>
                          )}

                          {!isMine && (
                            <p className="text-[10px] font-medium text-[#999] mb-0.5 ml-1">{msg.sender.display_name}</p>
                          )}

                          {isEditingMsg ? (
                            <div className="bg-white border border-[#D4692A]/40 rounded-2xl p-3 shadow-sm min-w-[220px]">
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditMessage(msg.id); }
                                  if (e.key === "Escape") cancelEditing();
                                }}
                                autoFocus
                                className="w-full px-3 py-1.5 text-sm rounded-lg border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a]"
                              />
                              <div className="flex items-center justify-end gap-2 mt-2">
                                <button onClick={cancelEditing} className="px-3 py-1 text-xs rounded-lg text-[#999] hover:bg-gray-100 transition-colors">Cancel</button>
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
                            <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMine ? "bg-[#D4692A] text-white rounded-br-md" : "bg-white border border-[#e8e4e0] text-[#1a1a1a] rounded-bl-md shadow-sm"}`}>
                              {/* Reply Preview */}
                              {msg.reply_to && (
                                <div className={`text-[10px] mb-2 px-2 py-1.5 rounded-lg border-l-2 ${isMine ? "bg-white/10 border-white/40 text-white/70" : "bg-[#faf8f6] border-[#D4692A]/30 text-[#777]"}`}>
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <CornerDownRight size={8} />
                                    <span className="font-semibold">{msg.reply_to.sender?.display_name || "Unknown"}</span>
                                  </div>
                                  <p className="truncate">{msg.reply_to.content?.slice(0, 80)}</p>
                                </div>
                              )}

                              {msg.attachment_url && (
                                <div className="mb-2 min-w-[200px]">
                                  {isImageAttachment(msg.attachment_type) ? (
                                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                      <img src={msg.attachment_url} alt={msg.attachment_name || "Image"} className="rounded-lg max-w-full max-h-48 object-cover" />
                                    </a>
                                  ) : isVideoAttachment(msg.attachment_type) ? (
                                    <video src={msg.attachment_url} controls preload="metadata" className="rounded-lg max-w-full max-h-48" />
                                  ) : (
                                    <a
                                      href={msg.attachment_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-2 p-2.5 rounded-lg ${isMine ? "bg-white/10" : "bg-gray-50 border border-gray-100"}`}
                                    >
                                      <FileText size={18} className={isMine ? "text-white/70" : "text-gray-400"} />
                                      <div className="min-w-0 flex-1">
                                        <p className={`text-xs font-medium truncate ${isMine ? "text-white" : "text-gray-700"}`}>{msg.attachment_name || "File"}</p>
                                        <p className={`text-[10px] ${isMine ? "text-white/50" : "text-gray-400"}`}>{formatFileSize(msg.attachment_size)}</p>
                                      </div>
                                      <Download size={14} className={isMine ? "text-white/60" : "text-gray-400"} />
                                    </a>
                                  )}
                                </div>
                              )}

                              {msg.content && (
                                <p className="whitespace-pre-wrap break-words">{renderChatContent(msg.content, members, isMine)}</p>
                              )}
                              <div className={`flex items-center gap-1.5 mt-1.5 ${isMine ? "justify-end" : ""}`}>
                                <p className={`text-[10px] ${isMine ? "text-white/50" : "text-[#999]"}`}>{formatMessageTime(msg.created_at)}</p>
                                {isEdited && <span className={`text-[10px] italic ${isMine ? "text-white/40" : "text-[#aaa]"}`}>(edited)</span>}
                                {isMine && (
                                  <span
                                    className={`text-[10px] cursor-pointer ${
                                      readReceipts[msg.id] && readReceipts[msg.id].length > 0
                                        ? "text-blue-400"
                                        : "text-white/40"
                                    }`}
                                    onClick={() => setShowReadReceiptsFor(showReadReceiptsFor === msg.id ? null : msg.id)}
                                    title={readReceipts[msg.id]?.map((r) => r.display_name).join(", ") || "Not read yet"}
                                  >
                                    {readReceipts[msg.id] && readReceipts[msg.id].length > 0 ? "✓✓" : "✓"}
                                  </span>
                                )}
                              </div>
                              {/* Reaction display */}
                              {chatReactions[msg.id] && chatReactions[msg.id].length > 0 && (
                                <div className={`flex flex-wrap gap-1 mt-1.5 ${isMine ? "justify-end" : ""}`}>
                                  {chatReactions[msg.id].map((r) => (
                                    <button
                                      key={r.emoji}
                                      onClick={() => toggleReaction("message", msg.id, r.emoji)}
                                      title={r.users.map((u) => u.display_name).join(", ")}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
                                        r.reacted
                                          ? (isMine ? "bg-white/20 text-white" : "bg-[#D4692A]/10 text-[#D4692A] border border-[#D4692A]/30")
                                          : (isMine ? "bg-white/10 text-white/70" : "bg-gray-50 text-gray-500 border border-gray-200")
                                      }`}
                                    >
                                      <span>{r.emoji}</span>
                                      <span className="font-medium">{r.count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              {/* Read receipts popup */}
                              {showReadReceiptsFor === msg.id && readReceipts[msg.id] && readReceipts[msg.id].length > 0 && (
                                <div className="absolute bottom-full right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-40 min-w-[180px]">
                                  <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wider mb-2">Read by</p>
                                  <div className="space-y-2">
                                    {readReceipts[msg.id].map((r) => (
                                      <div key={r.user_id} className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-[#D4692A]/10 flex items-center justify-center text-[8px] font-bold text-[#D4692A]">
                                          {r.display_name.charAt(0)}
                                        </div>
                                        <span className="text-xs text-[#1a1a1a]">{r.display_name}</span>
                                        <span className="text-[10px] text-[#999] ml-auto">{new Date(r.read_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {/* Emoji picker popup */}
                          {showEmojiPickerFor === msg.id && (
                            <div className={`absolute ${isMine ? "right-0" : "left-0"} -top-10 z-40 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 flex gap-0.5`}>
                              {QUICK_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction("message", msg.id, emoji)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-sm transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
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
                  <span className="text-sm text-[#1a1a1a] truncate flex-1">{pendingFile.name}</span>
                  <span className="text-xs text-[#999]">{formatFileSize(pendingFile.size)}</span>
                  <button onClick={() => setPendingFile(null)} className="p-1 rounded-lg hover:bg-white">
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>
              )}

              {/* Reply Preview */}
              {replyingTo && (
                <div className="px-5 py-2 flex items-center gap-3 bg-[#faf8f6] border-t border-[#e8e4e0]">
                  <CornerDownRight size={14} className="text-[#D4692A] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-[#D4692A]">Replying to {replyingTo.sender.display_name}</span>
                    <p className="text-xs text-[#999] truncate">{replyingTo.content?.slice(0, 100)}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 rounded-lg hover:bg-white">
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>
              )}

              {/* Input Area with @Mention Dropdown */}
              <div className="p-4 border-t border-[#e8e4e0] bg-white flex-shrink-0 relative">
                {/* Mention Dropdown */}
                {showMentionDropdown && mentionFilteredMembers.length > 0 && (
                  <div className="absolute bottom-full left-4 right-4 mb-1 bg-white border border-[#e8e4e0] rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                    {mentionFilteredMembers.map((m) => (
                      <button
                        key={m.user_id}
                        onClick={() => handleSelectMention(m.user)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#faf8f6] transition-colors text-left"
                      >
                        <Avatar user={m.user} size={24} />
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-[#1a1a1a]">{m.user.display_name}</span>
                          {m.user.position && <span className="text-[10px] text-[#999] ml-2">{m.user.position}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-3">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
                  <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl hover:bg-[#f5f2ef] text-[#999999] hover:text-[#1a1a1a] transition-all mb-0.5">
                    <Paperclip size={18} />
                  </button>
                  <textarea
                    ref={chatInputRef}
                    value={newMessage}
                    onChange={handleChatInputChange}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Type a message... Use @ to mention"
                    rows={1}
                    className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] placeholder:text-[#999] resize-none max-h-24"
                  />
                  <button
                    onClick={handleSend}
                    disabled={(!newMessage.trim() && !pendingFile) || sending}
                    className="p-2.5 rounded-xl bg-[#D4692A] text-white hover:bg-[#c05e24] disabled:opacity-40 disabled:cursor-not-allowed transition-all mb-0.5"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== ACTIVITY TAB (Feature 5) ===== */}
          {activeTab === "activity" && (
            <div className="flex-1 overflow-y-auto p-5 bg-[#fafafa]">
              {activitiesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={24} className="animate-spin text-[#D4692A]" />
                </div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#999]">
                  <Activity size={40} className="mb-3 text-[#ddd]" />
                  <p className="text-sm">No activity yet</p>
                  <p className="text-xs mt-1">Actions in this project will appear here</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {activities.map((activity, idx) => (
                    <div key={activity.id} className="flex gap-3 relative">
                      {/* Timeline line */}
                      {idx < activities.length - 1 && (
                        <div className="absolute left-[13px] top-8 bottom-0 w-px bg-[#e8e4e0]" />
                      )}
                      {/* Timeline dot */}
                      <div className="relative flex-shrink-0 mt-1">
                        <div className={`w-[28px] h-[28px] rounded-full flex items-center justify-center ${getActivityColor(activity.action)} bg-opacity-20`}>
                          <div className={`w-2.5 h-2.5 rounded-full ${getActivityColor(activity.action)}`} />
                        </div>
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Avatar user={activity.user} size={20} />
                          <span className="text-sm font-medium text-[#1a1a1a]">{activity.user.display_name}</span>
                          <span className="text-xs text-[#999]">{formatRelativeTime(activity.created_at)}</span>
                        </div>
                        <p className="text-sm text-[#777] mt-0.5 ml-7">{getActivityDescription(activity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- Modals --- */}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddMember(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 z-10 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>Add Member</h3>
              <button onClick={() => setShowAddMember(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {addMemberError ? (
                <p className="text-sm text-red-500 text-center py-6">{addMemberError}</p>
              ) : availableUsers.length === 0 ? (
                <p className="text-sm text-[#999] text-center py-6">All team members are already in this project</p>
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
                      <p className="text-sm font-medium text-[#1a1a1a] truncate">{u.display_name}</p>
                      {u.position && <p className="text-xs text-[#999] truncate">{u.position}</p>}
                    </div>
                    <UserPlus size={16} className="text-[#D4692A] flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Leadership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTransferModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 z-10 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>Transfer Leadership</h3>
              <button onClick={() => setShowTransferModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-[#999] mb-3">Select a member to transfer your Leader role to. You will become a regular member.</p>
            <div className="flex-1 overflow-y-auto space-y-1">
              {transferableMembers.length === 0 ? (
                <p className="text-sm text-[#999] text-center py-6">No members available to transfer to</p>
              ) : (
                transferableMembers.map((m) => (
                  <button
                    key={m.user_id}
                    onClick={() => handleTransferLeadership(m.user_id)}
                    disabled={roleActionLoading === m.user_id}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                  >
                    <Avatar user={m.user} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1a1a] truncate">{m.user.display_name}</p>
                      {m.user.position && <p className="text-xs text-[#999] truncate">{m.user.position}</p>}
                    </div>
                    {roleActionLoading === m.user_id ? (
                      <Loader2 size={16} className="animate-spin text-blue-500 flex-shrink-0" />
                    ) : (
                      <ArrowRightLeft size={16} className="text-blue-500 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateTask(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-5 z-10 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>New Task</h3>
              <button onClick={() => setShowCreateTask(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  autoFocus
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] placeholder:text-[#999]"
                />
              </div>
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Description</label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional description..."
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] resize-none placeholder:text-[#999]"
                  style={{ whiteSpace: "pre-wrap" }}
                />
                <p className="text-[10px] text-[#999] mt-1">Supports line breaks, numbered lists (1.), and bullet points (&bull;, -, *)</p>
              </div>
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Priority</label>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as const).map((p) => {
                    const isActive = newTaskPriority === p;
                    const colors: Record<string, string> = {
                      low: isActive ? "bg-gray-500 text-white border-gray-500" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50",
                      medium: isActive ? "bg-[#D4692A] text-white border-[#D4692A]" : "bg-white text-[#D4692A] border-orange-200 hover:bg-orange-50",
                      high: isActive ? "bg-red-500 text-white border-red-500" : "bg-white text-red-500 border-red-200 hover:bg-red-50",
                    };
                    return (
                      <button key={p} onClick={() => setNewTaskPriority(p)} className={`flex-1 px-3 py-2 text-sm font-medium rounded-xl border capitalize transition-colors ${colors[p]}`}>
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Assignees */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Assign to</label>
                <div className="space-y-1 max-h-48 overflow-y-auto border border-[#e8e4e0] rounded-xl p-2">
                  {members.length === 0 ? (
                    <p className="text-sm text-[#999] text-center py-3">No project members</p>
                  ) : (
                    members.map((m) => {
                      const isSelected = newTaskAssignees.includes(m.user_id);
                      return (
                        <button
                          key={m.user_id}
                          onClick={() => setNewTaskAssignees((prev) => isSelected ? prev.filter((id) => id !== m.user_id) : [...prev, m.user_id])}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${isSelected ? "bg-[#D4692A]/10" : "hover:bg-[#faf8f6]"}`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-[#D4692A] border-[#D4692A]" : "border-[#ccc]"}`}>
                            {isSelected && <Check size={10} className="text-white" />}
                          </div>
                          <Avatar user={m.user} size={24} />
                          <span className="text-sm text-[#1a1a1a] truncate">{m.user.display_name}</span>
                          <RoleBadge role={m.role} />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Deadline</label>
                <input
                  type="datetime-local"
                  value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a]"
                />
              </div>
              {/* Status Change Permission */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Who can change task status?</label>
                <select
                  value={newTaskStatusPermission}
                  onChange={(e) => setNewTaskStatusPermission(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#e8e4e0] focus:outline-none focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/30 bg-white text-[#1a1a1a] appearance-none"
                >
                  <option value="commissioner_and_leader">Commissioner &amp; Leader</option>
                  <option value="commissioner_only">Commissioner Only</option>
                  <option value="leader_only">Leader Only</option>
                  <option value="creator_only">Task Creator Only</option>
                </select>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-[#f0ece8]">
              <button onClick={() => setShowCreateTask(false)} className="px-4 py-2 text-sm text-[#999] hover:text-[#1a1a1a] hover:bg-gray-100 rounded-xl transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTaskTitle.trim() || creatingTask}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#D4692A] text-white text-sm font-medium rounded-xl hover:bg-[#c05e24] disabled:opacity-40 transition-colors"
              >
                {creatingTask ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

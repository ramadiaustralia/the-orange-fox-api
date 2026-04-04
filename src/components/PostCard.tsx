"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Heart,
  MessageCircle,
  Trash2,
  Download,
  FileText,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  SmilePlus,
  Reply,
  AtSign,
} from "lucide-react";

/* ── Reaction config ── */
const REACTION_TYPES: Record<
  string,
  { emoji: string; label: string; color: string }
> = {
  like: { emoji: "👍", label: "Like", color: "text-blue-500" },
  love: { emoji: "❤️", label: "Love", color: "text-red-500" },
  haha: { emoji: "😂", label: "Haha", color: "text-yellow-500" },
  wow: { emoji: "😮", label: "Wow", color: "text-yellow-500" },
  sad: { emoji: "😢", label: "Sad", color: "text-yellow-500" },
  angry: { emoji: "😡", label: "Angry", color: "text-orange-500" },
};

type ReactionType = keyof typeof REACTION_TYPES;

/* ── Types ── */
interface PostAuthor {
  id: string;
  display_name: string;
  position: string;
  profile_pic_url: string | null;
  email: string;
  badge?: string;
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

interface ReactionUser {
  id: string;
  display_name: string;
  profile_pic_url: string | null;
}

interface ReactionGroup {
  reaction_type: string;
  count: number;
  users: ReactionUser[];
  reacted: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: PostAuthor;
  like_count?: number;
  liked_by_me?: boolean;
  reply_to_id?: string;
  reply_to?: { id: string; content: string; author: PostAuthor };
  mentions?: string[];
  reactions?: ReactionGroup[];
  my_reaction?: string | null;
}

export interface Post {
  id: string;
  content: string;
  created_at: string;
  edited_at?: string | null;
  author: PostAuthor;
  author_badge?: string;
  status?: string;
  attachments: Attachment[];
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  mentions?: string[];
  tagged_users?: string[];
}

interface TeamMember {
  id: string;
  display_name: string;
  position: string;
  profile_pic_url: string | null;
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  currentUserBadge?: string;
  onUpdate: () => void;
  onProfileClick: (user: PostAuthor) => void;
  teamMembers?: TeamMember[];
}

/* ── Time helper ── */
function timeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

/* ── Helpers ── */
function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isImageType(type: string) {
  return type.startsWith("image/");
}

function isVideoType(type: string) {
  return type.startsWith("video/");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Determine if the current user can review (approve/reject) a post based on badges.
 */
function canReviewPost(currentBadge: string, authorBadge: string): boolean {
  if (currentBadge === "owner") return true;
  if (currentBadge === "board")
    return authorBadge === "manager" || authorBadge === "staff";
  if (currentBadge === "manager") return authorBadge === "staff";
  return false;
}

/** Render comment content with @mention highlights */
function renderContentWithMentions(
  content: string,
  mentions: string[] | undefined,
  teamMembers: TeamMember[]
) {
  if (!mentions || mentions.length === 0) {
    return <>{content}</>;
  }

  // Build a map of member IDs to display names
  const memberMap = new Map(teamMembers.map((m) => [m.id, m.display_name]));

  // Find @mentions in the content and highlight them
  const mentionNames = mentions
    .map((id) => memberMap.get(id))
    .filter(Boolean) as string[];

  if (mentionNames.length === 0) return <>{content}</>;

  // Build regex from mention names
  const escapedNames = mentionNames.map((n) =>
    n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const regex = new RegExp(`(@(?:${escapedNames.join("|")}))`, "g");
  const parts = content.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("@") && mentionNames.some((n) => part === `@${n}`)) {
          return (
            <span key={i} className="font-semibold text-[#D4692A]">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/* ── Avatar Sub-component ── */
function Avatar({
  user,
  size = "md",
  clickable = false,
  onClick,
}: {
  user: PostAuthor | ReactionUser;
  size?: "sm" | "md";
  clickable?: boolean;
  onClick?: () => void;
}) {
  const dim = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const cls = `${dim} rounded-full flex-shrink-0 ${clickable ? "cursor-pointer hover:ring-2 hover:ring-[#D4692A]/30 transition-all" : ""}`;

  if (user.profile_pic_url) {
    return (
      <img
        src={user.profile_pic_url}
        alt={user.display_name}
        className={`${cls} object-cover`}
        onClick={onClick}
      />
    );
  }
  return (
    <div
      className={`${cls} bg-[#D4692A] flex items-center justify-center`}
      onClick={onClick}
    >
      <span
        className={`${textSize} font-bold text-white`}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {getInitials(user.display_name)}
      </span>
    </div>
  );
}

/* ── ReactionPicker Sub-component ── */
function ReactionPicker({
  onSelect,
  visible,
}: {
  onSelect: (type: ReactionType) => void;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div
      className="absolute bottom-full left-0 mb-2 flex items-center gap-1 bg-white rounded-full shadow-lg border border-border-light px-2 py-1.5 z-50"
      style={{ animation: "fadeIn 0.15s ease-out" }}
    >
      {Object.entries(REACTION_TYPES).map(([type, { emoji, label }]) => (
        <button
          key={type}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(type as ReactionType);
          }}
          className="text-xl hover:scale-125 transition-transform duration-150 px-1 relative group/reaction"
          title={label}
        >
          {emoji}
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[0.6rem] bg-gray-800 text-white px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── ReactionSummary Sub-component ── */
function ReactionSummary({
  reactions,
  onClick,
}: {
  reactions: ReactionGroup[];
  onClick: () => void;
}) {
  const totalCount = reactions.reduce((acc, r) => acc + r.count, 0);
  if (totalCount === 0) return null;

  // Sort by count desc, show top emojis
  const sorted = [...reactions].filter((r) => r.count > 0).sort((a, b) => b.count - a.count);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 hover:underline transition-colors group/summary"
    >
      <span className="flex -space-x-0.5">
        {sorted.slice(0, 3).map((r) => (
          <span
            key={r.reaction_type}
            className="text-sm"
            title={`${REACTION_TYPES[r.reaction_type]?.label}: ${r.count}`}
          >
            {REACTION_TYPES[r.reaction_type]?.emoji}
          </span>
        ))}
      </span>
      <span className="text-xs text-text-muted group-hover/summary:text-text-secondary">
        {totalCount}
      </span>
    </button>
  );
}

/* ── ReactionsDetailModal ── */
function ReactionsDetailModal({
  reactions,
  onClose,
}: {
  reactions: ReactionGroup[];
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const allUsers = reactions.flatMap((r) =>
    r.users.map((u) => ({ ...u, reaction_type: r.reaction_type }))
  );
  const totalCount = reactions.reduce((acc, r) => acc + r.count, 0);

  const displayUsers =
    activeTab === "all"
      ? allUsers
      : allUsers.filter((u) => u.reaction_type === activeTab);

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      >
        {/* Tabs */}
        <div className="flex items-center border-b border-border-light px-4 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "all"
                ? "border-[#D4692A] text-[#D4692A]"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            All {totalCount}
          </button>
          {reactions
            .filter((r) => r.count > 0)
            .map((r) => (
              <button
                key={r.reaction_type}
                onClick={() => setActiveTab(r.reaction_type)}
                className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
                  activeTab === r.reaction_type
                    ? "border-[#D4692A] text-[#D4692A]"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                {REACTION_TYPES[r.reaction_type]?.emoji} {r.count}
              </button>
            ))}
          <button
            onClick={onClose}
            className="ml-auto pb-2 p-1 text-text-muted hover:text-text-secondary"
          >
            <X size={16} />
          </button>
        </div>

        {/* Users list */}
        <div className="max-h-64 overflow-y-auto p-3 space-y-2">
          {displayUsers.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">
              No reactions yet
            </p>
          ) : (
            displayUsers.map((u, i) => (
              <div key={`${u.id}-${u.reaction_type}-${i}`} className="flex items-center gap-3">
                <div className="relative">
                  {u.profile_pic_url ? (
                    <img
                      src={u.profile_pic_url}
                      alt={u.display_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#D4692A] flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {getInitials(u.display_name)}
                      </span>
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 text-xs">
                    {REACTION_TYPES[u.reaction_type]?.emoji}
                  </span>
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {u.display_name}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── MentionDropdown Sub-component ── */
function MentionDropdown({
  query,
  members,
  onSelect,
  position,
}: {
  query: string;
  members: TeamMember[];
  onSelect: (member: TeamMember) => void;
  position: { top: number; left: number };
}) {
  const filtered = members.filter(
    (m) =>
      m.display_name.toLowerCase().includes(query.toLowerCase()) ||
      m.position.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute bg-white rounded-xl shadow-lg border border-border-light py-1 z-50 w-64 max-h-48 overflow-y-auto"
      style={{ bottom: position.top, left: position.left }}
    >
      {filtered.slice(0, 8).map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m)}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#f5f2ef] transition-colors text-left"
        >
          {m.profile_pic_url ? (
            <img
              src={m.profile_pic_url}
              alt={m.display_name}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#D4692A] flex items-center justify-center flex-shrink-0">
              <span className="text-[0.6rem] font-bold text-white">
                {getInitials(m.display_name)}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {m.display_name}
            </p>
            {m.position && (
              <p className="text-[0.6rem] text-text-muted truncate">
                {m.position}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── PostCard ── */
export default function PostCard({
  post,
  currentUserId,
  currentUserBadge = "staff",
  onUpdate,
  onProfileClick,
  teamMembers = [],
}: PostCardProps) {
  /* ── Post reactions state ── */
  const [postReactions, setPostReactions] = useState<ReactionGroup[]>([]);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactionsDetail, setShowReactionsDetail] = useState(false);
  const reactionPickerTimeout = useRef<NodeJS.Timeout | null>(null);
  const reactionBtnRef = useRef<HTMLDivElement>(null);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [deleting, setDeleting] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  /* ── Reply-to state ── */
  const [replyTo, setReplyTo] = useState<{
    id: string;
    authorName: string;
  } | null>(null);

  /* ── Mention state ── */
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const commentInputRef = useRef<HTMLInputElement>(null);

  /* ── Comment reaction state ── */
  const [commentReactionPicker, setCommentReactionPicker] = useState<
    string | null
  >(null);
  const commentReactionTimeout = useRef<NodeJS.Timeout | null>(null);

  /* ── Edit state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editSuccess, setEditSuccess] = useState("");
  const [displayContent, setDisplayContent] = useState(post.content);
  const [wasEdited, setWasEdited] = useState(!!post.edited_at);
  const [postStatus, setPostStatus] = useState(post.status || "approved");

  const isAuthor = currentUserId === post.author.id;
  const authorBadge = post.author_badge || post.author.badge || "staff";
  const showReviewButtons =
    post.status === "pending" && canReviewPost(currentUserBadge, authorBadge);
  const imageAttachments = post.attachments.filter((a) =>
    isImageType(a.file_type)
  );
  const videoAttachments = post.attachments.filter((a) =>
    isVideoType(a.file_type)
  );
  const fileAttachments = post.attachments.filter(
    (a) => !isImageType(a.file_type) && !isVideoType(a.file_type)
  );

  /* ── Fetch post reactions on mount ── */
  useEffect(() => {
    const fetchReactions = async () => {
      try {
        const res = await fetch(
          `/api/posts/${post.id}/reactions?target_type=post&target_ids=${post.id}`
        );
        const json = await res.json();
        const groups: ReactionGroup[] =
          json.reactions?.[post.id] || [];
        setPostReactions(groups);
        const mine = groups.find((g) => g.reacted);
        setMyReaction(mine ? mine.reaction_type : null);
      } catch {
        // Fallback: convert legacy like data
        if (post.like_count > 0 || post.liked_by_me) {
          setPostReactions([
            {
              reaction_type: "like",
              count: post.like_count,
              users: [],
              reacted: post.liked_by_me,
            },
          ]);
          if (post.liked_by_me) setMyReaction("like");
        }
      }
    };
    fetchReactions();
  }, [post.id, post.like_count, post.liked_by_me]);

  /* ── Handle post reaction ── */
  const handlePostReaction = useCallback(
    async (type: ReactionType) => {
      const wasMyReaction = myReaction;
      const isRemovingSame = wasMyReaction === type;

      // Optimistic update
      setMyReaction(isRemovingSame ? null : type);
      setPostReactions((prev) => {
        let updated = prev.map((g) => {
          if (g.reaction_type === wasMyReaction) {
            return {
              ...g,
              count: Math.max(0, g.count - 1),
              reacted: false,
            };
          }
          return g;
        });

        if (!isRemovingSame) {
          const existing = updated.find(
            (g) => g.reaction_type === type
          );
          if (existing) {
            updated = updated.map((g) =>
              g.reaction_type === type
                ? { ...g, count: g.count + 1, reacted: true }
                : g
            );
          } else {
            updated.push({
              reaction_type: type,
              count: 1,
              users: [],
              reacted: true,
            });
          }
        }

        return updated.filter((g) => g.count > 0);
      });
      setShowReactionPicker(false);

      try {
        await fetch(`/api/posts/${post.id}/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_type: "post",
            target_id: post.id,
            reaction_type: type,
          }),
        });
      } catch {
        // Revert on error
        setMyReaction(wasMyReaction);
      }
    },
    [myReaction, post.id]
  );

  /* ── Quick-click reaction (toggle default like) ── */
  const handleQuickReaction = useCallback(() => {
    if (myReaction) {
      handlePostReaction(myReaction as ReactionType);
    } else {
      handlePostReaction("like");
    }
  }, [myReaction, handlePostReaction]);

  /* ── Reaction picker hover handlers ── */
  const handleReactionMouseEnter = useCallback(() => {
    if (reactionPickerTimeout.current) {
      clearTimeout(reactionPickerTimeout.current);
    }
    reactionPickerTimeout.current = setTimeout(() => {
      setShowReactionPicker(true);
    }, 400);
  }, []);

  const handleReactionMouseLeave = useCallback(() => {
    if (reactionPickerTimeout.current) {
      clearTimeout(reactionPickerTimeout.current);
    }
    reactionPickerTimeout.current = setTimeout(() => {
      setShowReactionPicker(false);
    }, 300);
  }, []);

  /* ── Touch-based long-press for reaction picker (mobile) ── */
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchMovedRef = useRef(false);

  const handleReactionTouchStart = useCallback((e: React.TouchEvent) => {
    touchMovedRef.current = false;
    touchTimerRef.current = setTimeout(() => {
      e.preventDefault();
      setShowReactionPicker(true);
    }, 500);
  }, []);

  const handleReactionTouchMove = useCallback(() => {
    touchMovedRef.current = true;
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  const handleReactionTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    // If reaction picker is open, prevent quick click through
    if (showReactionPicker) {
      e.preventDefault();
    }
  }, [showReactionPicker]);

  /* ── Touch long-press for comment reactions (mobile) ── */
  const commentTouchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCommentReactionTouchStart = useCallback((commentId: string) => {
    commentTouchTimerRef.current = setTimeout(() => {
      setCommentReactionPicker(commentId);
    }, 500);
  }, []);

  const handleCommentReactionTouchEnd = useCallback(() => {
    if (commentTouchTimerRef.current) {
      clearTimeout(commentTouchTimerRef.current);
      commentTouchTimerRef.current = null;
    }
  }, []);

  /* ── Review post ── */
  const handleReview = useCallback(
    async (status: "approved" | "rejected") => {
      setReviewing(true);
      try {
        const res = await fetch(`/api/posts/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          setPostStatus(status);
          onUpdate();
        }
      } catch {
        console.error("Failed to review post");
      } finally {
        setReviewing(false);
      }
    },
    [post.id, onUpdate]
  );

  /* ── Comments ── */
  const toggleComments = useCallback(async () => {
    const willShow = !showComments;
    setShowComments(willShow);

    if (willShow && comments.length === 0) {
      setCommentsLoading(true);
      try {
        const res = await fetch(`/api/posts/${post.id}/comments`);
        const json = await res.json();
        const loadedComments: Comment[] = json.comments || [];
        setComments(loadedComments);

        // Fetch reactions for all comments
        if (loadedComments.length > 0) {
          const commentIds = loadedComments.map((c) => c.id);
          try {
            const reactionsRes = await fetch(
              `/api/posts/${post.id}/reactions?target_type=comment&target_ids=${commentIds.join(",")}`
            );
            const reactionsJson = await reactionsRes.json();
            const reactionsMap = reactionsJson.reactions || {};
            setComments((prev) =>
              prev.map((c) => {
                const groups: ReactionGroup[] = reactionsMap[c.id] || [];
                const myR = groups.find((g) => g.reacted);
                return {
                  ...c,
                  reactions: groups,
                  my_reaction: myR ? myR.reaction_type : null,
                };
              })
            );
          } catch {
            // Reactions fetch failed silently — comments still show
          }
        }
      } catch {
        console.error("Failed to load comments");
      } finally {
        setCommentsLoading(false);
      }
    }
  }, [showComments, comments.length, post.id]);

  /* ── Submit comment ── */
  const submitComment = useCallback(async () => {
    if (!commentText.trim() || commentSubmitting) return;
    setCommentSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        content: commentText.trim(),
      };
      if (replyTo) {
        body.reply_to_id = replyTo.id;
      }
      if (mentionIds.length > 0) {
        body.mentions = mentionIds;
      }

      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.comment) {
        setComments((prev) => [...prev, json.comment]);
        setCommentCount((c) => c + 1);
      }
      setCommentText("");
      setReplyTo(null);
      setMentionIds([]);
    } catch {
      console.error("Failed to post comment");
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentText, commentSubmitting, post.id, replyTo, mentionIds]);

  /* ── Delete ── */
  const handleDelete = useCallback(async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      onUpdate();
    } catch {
      console.error("Failed to delete post");
      setDeleting(false);
    }
  }, [post.id, onUpdate]);

  /* ── Edit ── */
  const handleEditStart = useCallback(() => {
    setEditContent(displayContent);
    setIsEditing(true);
    setEditSuccess("");
  }, [displayContent]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditContent(displayContent);
    setEditSuccess("");
  }, [displayContent]);

  const handleEditSave = useCallback(async () => {
    if (!editContent.trim() || editSubmitting) return;
    setEditSubmitting(true);
    setEditSuccess("");

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim(), action: "edit" }),
      });
      const json = await res.json();
      if (res.ok) {
        setDisplayContent(editContent.trim());
        setIsEditing(false);
        setWasEdited(true);
        setEditSuccess("Post updated and submitted for review");
        setTimeout(() => setEditSuccess(""), 3000);
      } else {
        alert(json.error || "Failed to update post");
      }
    } catch {
      alert("Failed to update post");
    } finally {
      setEditSubmitting(false);
    }
  }, [editContent, editSubmitting, post.id]);

  /* ── Comment reaction ── */
  const handleCommentReaction = useCallback(
    async (commentId: string, type: ReactionType) => {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          const wasMyReaction = c.my_reaction;
          const isRemovingSame = wasMyReaction === type;

          let newReactions = (c.reactions || []).map((g) => {
            if (g.reaction_type === wasMyReaction) {
              return { ...g, count: Math.max(0, g.count - 1), reacted: false };
            }
            return g;
          });

          if (!isRemovingSame) {
            const existing = newReactions.find(
              (g) => g.reaction_type === type
            );
            if (existing) {
              newReactions = newReactions.map((g) =>
                g.reaction_type === type
                  ? { ...g, count: g.count + 1, reacted: true }
                  : g
              );
            } else {
              newReactions.push({
                reaction_type: type,
                count: 1,
                users: [],
                reacted: true,
              });
            }
          }

          return {
            ...c,
            reactions: newReactions.filter((g) => g.count > 0),
            my_reaction: isRemovingSame ? null : type,
            // Also update legacy fields
            liked_by_me: isRemovingSame ? false : true,
            like_count: newReactions
              .filter((g) => g.count > 0)
              .reduce((acc, g) => acc + g.count, 0),
          };
        })
      );
      setCommentReactionPicker(null);

      try {
        await fetch(`/api/posts/${post.id}/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_type: "comment",
            target_id: commentId,
            reaction_type: type,
          }),
        });
      } catch {
        // revert silently
      }
    },
    [post.id]
  );

  /* ── Comment input @mention handler ── */
  const handleCommentInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setCommentText(value);

      // Detect @mention trigger
      const cursorPos = e.target.selectionStart || value.length;
      const textBeforeCursor = value.slice(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf("@");

      if (atIndex !== -1) {
        const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";
        if (charBefore === " " || charBefore === "\n" || atIndex === 0) {
          const query = textBeforeCursor.slice(atIndex + 1);
          if (!query.includes(" ") || query.length <= 30) {
            setMentionQuery(query);
            return;
          }
        }
      }
      setMentionQuery(null);
    },
    []
  );

  const handleMentionSelect = useCallback(
    (member: TeamMember) => {
      const cursorPos =
        commentInputRef.current?.selectionStart || commentText.length;
      const textBeforeCursor = commentText.slice(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf("@");

      if (atIndex !== -1) {
        const before = commentText.slice(0, atIndex);
        const after = commentText.slice(cursorPos);
        const newText = `${before}@${member.display_name} ${after}`;
        setCommentText(newText);
        setMentionIds((prev) =>
          prev.includes(member.id) ? prev : [...prev, member.id]
        );
      }
      setMentionQuery(null);
      commentInputRef.current?.focus();
    },
    [commentText]
  );

  /* ── Reply handlers ── */
  const handleReply = useCallback(
    (comment: Comment) => {
      setReplyTo({ id: comment.id, authorName: comment.author.display_name });
      commentInputRef.current?.focus();
    },
    []
  );

  const cancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  /* ── Close reaction picker on outside tap (mobile) ── */
  useEffect(() => {
    if (!showReactionPicker) return;
    const handleOutsideTouch = (e: TouchEvent) => {
      if (reactionBtnRef.current && !reactionBtnRef.current.contains(e.target as Node)) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener("touchstart", handleOutsideTouch);
    return () => document.removeEventListener("touchstart", handleOutsideTouch);
  }, [showReactionPicker]);

  /* ── Total reaction count for display ── */
  const totalReactionCount = useMemo(
    () => postReactions.reduce((acc, r) => acc + r.count, 0),
    [postReactions]
  );

  /* ── My reaction display ── */
  const myReactionConfig = myReaction ? REACTION_TYPES[myReaction] : null;

  return (
    <div
      className={`bg-white rounded-2xl border border-border-light transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] ${deleting ? "opacity-50 pointer-events-none" : ""}`}
      style={{ animation: "fadeIn 0.3s ease-out" }}
    >
      {/* ── Pending banner ── */}
      {postStatus === "pending" && (
        <div className="px-5 pt-3 pb-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
            <Clock size={12} />
            <span>Pending review</span>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start gap-3 p-5 pb-0">
        <Avatar
          user={post.author}
          clickable
          onClick={() => onProfileClick(post.author)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onProfileClick(post.author)}
              className="text-sm font-semibold text-text-primary hover:text-[#D4692A] transition-colors"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {post.author.display_name}
            </button>
            {post.author.position && (
              <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-[#f5f2ef] text-text-muted font-medium">
                {post.author.position}
              </span>
            )}
            {wasEdited && (
              <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-gray-100 text-text-muted font-medium">
                (edited)
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {timeAgo(post.created_at)}
          </p>
        </div>

        {/* Edit & Delete */}
        {(isAuthor || currentUserBadge === "owner") && (
          <div className="flex items-center gap-1">
            {isAuthor && (
              <button
                onClick={handleEditStart}
                className="p-1.5 rounded-lg text-text-muted hover:text-[#D4692A] hover:bg-[#D4692A]/5 transition-all duration-200"
                title="Edit post"
              >
                <Pencil size={16} />
              </button>
            )}
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all duration-200"
              title="Delete post"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Edit Success Message ── */}
      {editSuccess && (
        <div className="mx-5 mt-2 p-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-1.5">
          <Check size={14} />
          {editSuccess}
        </div>
      )}

      {/* ── Content ── */}
      {isEditing ? (
        <div className="px-5 pt-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full text-sm text-text-primary leading-relaxed rounded-xl px-4 py-3 bg-[#f5f2ef] border border-border-light focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 resize-none outline-none"
            rows={4}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleEditSave}
              disabled={!editContent.trim() || editSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4692A] text-white text-xs font-medium hover:bg-[#B85A24] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editSubmitting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              Save
            </button>
            <button
              onClick={handleEditCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-text-secondary text-xs font-medium hover:bg-gray-200 transition-colors"
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        </div>
      ) : displayContent ? (
        <div className="px-5 pt-3">
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {renderContentWithMentions(
              displayContent,
              post.mentions,
              teamMembers
            )}
          </p>
        </div>
      ) : null}

      {/* ── Tagged Users ── */}
      {post.tagged_users && post.tagged_users.length > 0 && (
        <div className="px-5 pt-1.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-text-muted">With</span>
          {post.tagged_users.map((uid, i) => {
            const member = teamMembers.find((m) => m.id === uid);
            return member ? (
              <span key={uid} className="inline-flex items-center gap-1 text-xs font-semibold text-[#D4692A]">
                {member.profile_pic_url ? (
                  <img src={member.profile_pic_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                ) : null}
                {member.display_name}
                {i < (post.tagged_users || []).length - 1 ? "," : ""}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* ── Image Attachments ── */}
      {imageAttachments.length > 0 && (
        <div
          className={`px-5 pt-3 grid gap-2 ${
            imageAttachments.length === 1
              ? "grid-cols-1"
              : imageAttachments.length === 2
                ? "grid-cols-2"
                : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          {imageAttachments.map((att) => (
            <a
              key={att.id}
              href={att.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl overflow-hidden border border-border-light hover:border-[#D4692A]/30 transition-all duration-200 group"
            >
              <img
                src={att.file_url}
                alt={att.file_name}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </a>
          ))}
        </div>
      )}

      {/* ── Video Attachments ── */}
      {videoAttachments.length > 0 && (
        <div className="px-5 pt-3 space-y-2">
          {videoAttachments.map((att) => (
            <video
              key={att.id}
              src={att.file_url}
              controls
              preload="metadata"
              className="w-full rounded-xl max-h-96"
            />
          ))}
        </div>
      )}

      {/* ── File Attachments ── */}
      {fileAttachments.length > 0 && (
        <div className="px-5 pt-3 flex flex-wrap gap-2">
          {fileAttachments.map((att) => (
            <a
              key={att.id}
              href={att.file_url}
              target="_blank"
              rel="noopener noreferrer"
              download={att.file_name}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f5f2ef] border border-border-light hover:border-[#D4692A]/30 hover:bg-[#D4692A]/5 text-text-secondary text-xs transition-all duration-200 group"
            >
              <FileText
                size={16}
                className="text-text-muted group-hover:text-[#D4692A] transition-colors"
              />
              <div className="min-w-0">
                <p className="font-medium truncate max-w-[150px]">
                  {att.file_name}
                </p>
                <p className="text-text-muted text-[0.6rem]">
                  {formatFileSize(att.file_size)}
                </p>
              </div>
              <Download
                size={14}
                className="text-text-muted group-hover:text-[#D4692A] transition-colors"
              />
            </a>
          ))}
        </div>
      )}

      {/* ── Review Buttons (Badge-based) ── */}
      {showReviewButtons && postStatus === "pending" && (
        <div className="px-5 pt-3">
          <div className="flex items-center gap-2 p-3 bg-amber-50/50 border border-amber-200/50 rounded-xl">
            <span className="text-xs text-amber-700 font-medium flex-1">
              Review this post
            </span>
            <button
              onClick={() => handleReview("approved")}
              disabled={reviewing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={12} /> Approve
            </button>
            <button
              onClick={() => handleReview("rejected")}
              disabled={reviewing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <XCircle size={12} /> Reject
            </button>
          </div>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="px-5 pt-4 pb-1">
        {/* Counts */}
        {(totalReactionCount > 0 || commentCount > 0) && (
          <div className="flex items-center justify-between text-xs text-text-muted pb-2 mb-2 border-b border-border-light">
            {totalReactionCount > 0 ? (
              <ReactionSummary
                reactions={postReactions}
                onClick={() => setShowReactionsDetail(true)}
              />
            ) : (
              <span />
            )}
            {commentCount > 0 && (
              <button
                onClick={toggleComments}
                className="hover:text-text-secondary hover:underline transition-colors"
              >
                {commentCount} comment{commentCount !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-1 border-b border-border-light pb-2">
          {/* Reaction button with hover picker + touch long-press */}
          <div
            ref={reactionBtnRef}
            className="flex-1 relative"
            style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
            onMouseEnter={handleReactionMouseEnter}
            onMouseLeave={handleReactionMouseLeave}
            onTouchStart={handleReactionTouchStart}
            onTouchMove={handleReactionTouchMove}
            onTouchEnd={handleReactionTouchEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            <ReactionPicker
              visible={showReactionPicker}
              onSelect={handlePostReaction}
            />
            <button
              onClick={handleQuickReaction}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                myReaction
                  ? `${myReactionConfig?.color || "text-blue-500"} hover:bg-blue-50`
                  : "text-text-secondary hover:bg-[#f5f2ef]"
              }`}
            >
              {myReaction ? (
                <span className="text-lg leading-none">
                  {myReactionConfig?.emoji}
                </span>
              ) : (
                <Heart size={18} />
              )}
              <span>
                {myReaction
                  ? myReactionConfig?.label || "Like"
                  : "Like"}
              </span>
            </button>
          </div>

          <button
            onClick={toggleComments}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-[#f5f2ef] transition-all duration-200"
          >
            <MessageCircle size={18} />
            <span>Comment</span>
            {showComments ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>
        </div>
      </div>

      {/* ── Reactions Detail Modal ── */}
      {showReactionsDetail && (
        <ReactionsDetailModal
          reactions={postReactions}
          onClose={() => setShowReactionsDetail(false)}
        />
      )}

      {/* ── Comments Section ── */}
      {showComments && (
        <div
          className="px-5 pb-4 pt-2"
          style={{ animation: "fadeIn 0.2s ease-out" }}
        >
          {/* Comments list */}
          {commentsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2
                size={18}
                className="animate-spin text-text-muted"
              />
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-3 mb-3 max-h-80 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5 group">
                  <Avatar user={comment.author} size="sm" />
                  <div className="flex-1 min-w-0">
                    {/* Reply context */}
                    {comment.reply_to && (
                      <div className="flex items-center gap-1.5 mb-1 text-[0.65rem] text-text-muted">
                        <Reply size={10} className="rotate-180" />
                        <span>
                          Replying to{" "}
                          <span className="font-semibold">
                            {comment.reply_to.author.display_name}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Reply quoted content */}
                    {comment.reply_to && (
                      <div className="ml-1 mb-1 pl-2 border-l-2 border-[#D4692A]/30 text-[0.65rem] text-text-muted line-clamp-1">
                        {comment.reply_to.content}
                      </div>
                    )}

                    <div className="bg-[#f5f2ef] rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-semibold text-text-primary"
                          style={{
                            fontFamily: "var(--font-heading)",
                          }}
                        >
                          {comment.author.display_name}
                        </span>
                        {comment.author.position && (
                          <span className="text-[0.6rem] text-text-muted">
                            {comment.author.position}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-primary mt-0.5">
                        {renderContentWithMentions(
                          comment.content,
                          comment.mentions,
                          teamMembers
                        )}
                      </p>
                    </div>

                    {/* Comment reaction badges */}
                    {comment.reactions &&
                      comment.reactions.filter((r) => r.count > 0).length >
                        0 && (
                        <div className="flex items-center gap-0.5 mt-0.5 ml-2">
                          <span className="inline-flex items-center gap-0.5 bg-white border border-border-light rounded-full px-1.5 py-0.5 text-[0.6rem] shadow-sm">
                            {comment.reactions
                              .filter((r) => r.count > 0)
                              .sort((a, b) => b.count - a.count)
                              .slice(0, 3)
                              .map((r) => (
                                <span key={r.reaction_type} className="text-xs">
                                  {REACTION_TYPES[r.reaction_type]?.emoji}
                                </span>
                              ))}
                            <span className="text-text-muted ml-0.5">
                              {comment.reactions.reduce(
                                (a, r) => a + r.count,
                                0
                              )}
                            </span>
                          </span>
                        </div>
                      )}

                    {/* Comment actions */}
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <span className="text-[0.65rem] text-text-muted">
                        {timeAgo(comment.created_at)}
                      </span>

                      {/* Comment reaction button (hover + touch long-press) */}
                      <div
                        className="relative"
                        style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
                        onMouseEnter={() => {
                          if (commentReactionTimeout.current)
                            clearTimeout(commentReactionTimeout.current);
                          commentReactionTimeout.current = setTimeout(
                            () => setCommentReactionPicker(comment.id),
                            400
                          );
                        }}
                        onMouseLeave={() => {
                          if (commentReactionTimeout.current)
                            clearTimeout(commentReactionTimeout.current);
                          commentReactionTimeout.current = setTimeout(
                            () => setCommentReactionPicker(null),
                            300
                          );
                        }}
                        onTouchStart={() => handleCommentReactionTouchStart(comment.id)}
                        onTouchEnd={handleCommentReactionTouchEnd}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {commentReactionPicker === comment.id && (
                          <div
                            className="absolute bottom-full left-0 mb-1 flex items-center gap-0.5 bg-white rounded-full shadow-lg border border-border-light px-1.5 py-1 z-50"
                            style={{
                              animation: "fadeIn 0.15s ease-out",
                            }}
                          >
                            {Object.entries(REACTION_TYPES).map(
                              ([type, { emoji, label }]) => (
                                <button
                                  key={type}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCommentReaction(
                                      comment.id,
                                      type as ReactionType
                                    );
                                  }}
                                  className="text-sm hover:scale-125 transition-transform duration-150 px-0.5"
                                  title={label}
                                >
                                  {emoji}
                                </button>
                              )
                            )}
                          </div>
                        )}
                        <button
                          onClick={() =>
                            handleCommentReaction(
                              comment.id,
                              (comment.my_reaction as ReactionType) || "like"
                            )
                          }
                          className={`text-[0.65rem] font-semibold transition-colors ${
                            comment.my_reaction || comment.liked_by_me
                              ? REACTION_TYPES[comment.my_reaction || "like"]
                                  ?.color || "text-blue-500"
                              : "text-text-muted hover:text-text-secondary"
                          }`}
                        >
                          {comment.my_reaction
                            ? REACTION_TYPES[comment.my_reaction]?.label ||
                              "Like"
                            : comment.liked_by_me
                              ? "Like"
                              : "Like"}
                        </button>
                      </div>

                      {/* Reply button */}
                      <button
                        onClick={() => handleReply(comment)}
                        className="text-[0.65rem] font-semibold text-text-muted hover:text-text-secondary transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-3">
              No comments yet. Be the first!
            </p>
          )}

          {/* Reply-to indicator */}
          {replyTo && (
            <div className="flex items-center gap-2 mb-1 px-2 py-1.5 bg-[#f5f2ef] rounded-lg text-xs text-text-secondary">
              <Reply size={12} className="text-[#D4692A] rotate-180" />
              <span>
                Replying to{" "}
                <span className="font-semibold text-[#D4692A]">
                  {replyTo.authorName}
                </span>
              </span>
              <button
                onClick={cancelReply}
                className="ml-auto p-0.5 rounded hover:bg-gray-200 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Comment input */}
          <div className="relative">
            {/* Mention dropdown */}
            {mentionQuery !== null && teamMembers.length > 0 && (
              <MentionDropdown
                query={mentionQuery}
                members={teamMembers}
                onSelect={handleMentionSelect}
                position={{ top: 8, left: 0 }}
              />
            )}

            <div className="flex items-center gap-2 mt-2">
              <input
                ref={commentInputRef}
                type="text"
                value={commentText}
                onChange={handleCommentInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                  if (e.key === "Escape") {
                    setMentionQuery(null);
                    setReplyTo(null);
                  }
                }}
                placeholder={
                  replyTo
                    ? `Reply to ${replyTo.authorName}…`
                    : "Write a comment…"
                }
                className="flex-1 text-sm rounded-full px-4 py-2 bg-[#f5f2ef] border border-border-light focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 outline-none"
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim() || commentSubmitting}
                className="w-8 h-8 rounded-full bg-[#D4692A] text-white flex items-center justify-center hover:bg-[#B85A24] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {commentSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

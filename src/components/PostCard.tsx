"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";

/* ── Types ── */
interface PostAuthor {
  id: string;
  display_name: string;
  position: string;
  profile_pic_url: string | null;
  email: string;
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: PostAuthor;
  like_count?: number;
  liked_by_me?: boolean;
}

export interface Post {
  id: string;
  content: string;
  created_at: string;
  author: PostAuthor;
  attachments: Attachment[];
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onUpdate: () => void;
  onProfileClick: (user: PostAuthor) => void;
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Avatar Sub-component ── */
function Avatar({
  user,
  size = "md",
  clickable = false,
  onClick,
}: {
  user: PostAuthor;
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

/* ── PostCard ── */
export default function PostCard({
  post,
  currentUserId,
  onUpdate,
  onProfileClick,
}: PostCardProps) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [deleting, setDeleting] = useState(false);

  const isAuthor = currentUserId === post.author.id;
  const imageAttachments = post.attachments.filter((a) => isImageType(a.file_type));
  const fileAttachments = post.attachments.filter((a) => !isImageType(a.file_type));

  /* ── Like ── */
  const handleLike = useCallback(async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);

    try {
      await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    }
  }, [liked, post.id]);

  /* ── Comments ── */
  const toggleComments = useCallback(async () => {
    const willShow = !showComments;
    setShowComments(willShow);

    if (willShow && comments.length === 0) {
      setCommentsLoading(true);
      try {
        const res = await fetch(`/api/posts/${post.id}/comments`);
        const json = await res.json();
        setComments(json.data || []);
      } catch {
        console.error("Failed to load comments");
      } finally {
        setCommentsLoading(false);
      }
    }
  }, [showComments, comments.length, post.id]);

  const submitComment = useCallback(async () => {
    if (!commentText.trim() || commentSubmitting) return;
    setCommentSubmitting(true);

    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const json = await res.json();
      if (json.data) {
        setComments((prev) => [...prev, json.data]);
        setCommentCount((c) => c + 1);
      }
      setCommentText("");
    } catch {
      console.error("Failed to post comment");
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentText, commentSubmitting, post.id]);

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

  /* ── Comment like ── */
  const handleCommentLike = useCallback(
    async (commentId: string, index: number) => {
      setComments((prev) =>
        prev.map((c, i) =>
          i === index
            ? {
                ...c,
                liked_by_me: !c.liked_by_me,
                like_count: (c.like_count || 0) + (c.liked_by_me ? -1 : 1),
              }
            : c
        )
      );

      try {
        await fetch(`/api/posts/${post.id}/comments/${commentId}/like`, {
          method: "POST",
        });
      } catch {
        // revert on error
        setComments((prev) =>
          prev.map((c, i) =>
            i === index
              ? {
                  ...c,
                  liked_by_me: !c.liked_by_me,
                  like_count: (c.like_count || 0) + (c.liked_by_me ? -1 : 1),
                }
              : c
          )
        );
      }
    },
    [post.id]
  );

  return (
    <div
      className={`bg-white rounded-2xl border border-border-light transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] ${deleting ? "opacity-50 pointer-events-none" : ""}`}
      style={{ animation: "fadeIn 0.3s ease-out" }}
    >
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
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {timeAgo(post.created_at)}
          </p>
        </div>

        {/* Delete */}
        {isAuthor && (
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all duration-200"
            title="Delete post"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {post.content && (
        <div className="px-5 pt-3">
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>
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

      {/* ── Action Buttons ── */}
      <div className="px-5 pt-4 pb-1">
        {/* Counts */}
        {(likeCount > 0 || commentCount > 0) && (
          <div className="flex items-center justify-between text-xs text-text-muted pb-2 mb-2 border-b border-border-light">
            {likeCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                  <Heart size={10} className="text-white fill-white" />
                </span>
                {likeCount}
              </span>
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
          <button
            onClick={handleLike}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              liked
                ? "text-red-500 hover:bg-red-50"
                : "text-text-secondary hover:bg-[#f5f2ef]"
            }`}
          >
            <Heart
              size={18}
              className={`transition-all duration-200 ${liked ? "fill-red-500 text-red-500" : ""} ${likeAnimating ? "scale-125" : "scale-100"}`}
            />
            <span>{liked ? "Liked" : "Like"}</span>
          </button>
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

      {/* ── Comments Section ── */}
      {showComments && (
        <div className="px-5 pb-4 pt-2" style={{ animation: "fadeIn 0.2s ease-out" }}>
          {/* Comments list */}
          {commentsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={18} className="animate-spin text-text-muted" />
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-3 mb-3 max-h-80 overflow-y-auto">
              {comments.map((comment, idx) => (
                <div key={comment.id} className="flex gap-2.5 group">
                  <Avatar user={comment.author} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="bg-[#f5f2ef] rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-semibold text-text-primary"
                          style={{ fontFamily: "var(--font-heading)" }}
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
                        {comment.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <span className="text-[0.65rem] text-text-muted">
                        {timeAgo(comment.created_at)}
                      </span>
                      <button
                        onClick={() => handleCommentLike(comment.id, idx)}
                        className={`text-[0.65rem] font-semibold transition-colors ${
                          comment.liked_by_me
                            ? "text-red-500"
                            : "text-text-muted hover:text-text-secondary"
                        }`}
                      >
                        Like
                        {(comment.like_count || 0) > 0 &&
                          ` · ${comment.like_count}`}
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

          {/* Comment input */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
              placeholder="Write a comment…"
              className="flex-1 text-sm rounded-full px-4 py-2 bg-[#f5f2ef] border border-border-light focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20"
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
      )}
    </div>
  );
}

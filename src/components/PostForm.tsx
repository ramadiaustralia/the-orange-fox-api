"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ImageIcon, Paperclip, X, Loader2, Send, Video, Clock, AtSign, UserPlus } from "lucide-react";
import type { UserProfile } from "@/context/AuthContext";

interface TeamMember {
  id: string;
  display_name: string;
  position: string;
  profile_pic_url: string | null;
}

interface PostFormProps {
  user: UserProfile;
  onPostCreated: () => void;
  isOwner?: boolean;
  teamMembers?: TeamMember[];
}

interface AttachedFile {
  file: File;
  preview?: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Upload a file directly to Supabase Storage via signed URL.
 * This bypasses the Vercel 4.5MB payload limit — essential for videos.
 */
async function uploadFileDirect(file: File): Promise<{ url: string; fileName: string; fileType: string; fileSize: number } | null> {
  try {
    // Step 1: Get signed upload URL from our API
    const signedRes = await fetch("/api/upload/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, fileType: file.type }),
    });

    if (!signedRes.ok) {
      console.error("Failed to get signed URL:", await signedRes.text());
      return null;
    }

    const { signedUrl, token, publicUrl } = await signedRes.json();

    // Step 2: Upload directly to Supabase Storage using the signed URL
    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        ...(token ? { "x-upsert": "true" } : {}),
      },
      body: file,
    });

    if (!uploadRes.ok) {
      console.error("Direct upload failed:", await uploadRes.text());
      return null;
    }

    return {
      url: publicUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    };
  } catch (err) {
    console.error("Upload error:", err);
    return null;
  }
}

/* ── MentionDropdown ── */
function MentionDropdown({
  query,
  members,
  onSelect,
}: {
  query: string;
  members: TeamMember[];
  onSelect: (member: TeamMember) => void;
}) {
  const filtered = members.filter(
    (m) =>
      m.display_name.toLowerCase().includes(query.toLowerCase()) ||
      m.position.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute bottom-full left-0 mb-1 bg-white rounded-xl shadow-lg border border-border-light py-1 z-50 w-64 max-h-48 overflow-y-auto"
      style={{ animation: "fadeIn 0.15s ease-out" }}
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

/* ── TagPeopleModal ── */
function TagPeopleModal({
  members,
  selected,
  onToggle,
  onClose,
}: {
  members: TeamMember[];
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = members.filter(
    (m) =>
      m.display_name.toLowerCase().includes(search.toLowerCase()) ||
      m.position.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="p-4 border-b border-border-light">
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-sm font-bold text-text-primary"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Tag People
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-text-muted"
            >
              <X size={16} />
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team members..."
            className="w-full text-sm rounded-lg px-3 py-2 bg-[#f5f2ef] border border-border-light focus:border-[#D4692A] focus:ring-1 focus:ring-[#D4692A]/20 outline-none"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">
              No members found
            </p>
          ) : (
            filtered.map((m) => {
              const isSelected = selected.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => onToggle(m.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                    isSelected
                      ? "bg-[#D4692A]/5 border border-[#D4692A]/20"
                      : "hover:bg-[#f5f2ef] border border-transparent"
                  }`}
                >
                  {m.profile_pic_url ? (
                    <img
                      src={m.profile_pic_url}
                      alt={m.display_name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#D4692A] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">
                        {getInitials(m.display_name)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {m.display_name}
                    </p>
                    {m.position && (
                      <p className="text-[0.65rem] text-text-muted truncate">
                        {m.position}
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? "bg-[#D4692A] border-[#D4692A]"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="p-3 border-t border-border-light flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {selected.length} selected
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#D4692A] text-white text-xs font-medium hover:bg-[#B85A24] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PostForm({ user, onPostCreated, isOwner, teamMembers = [] }: PostFormProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [pendingNote, setPendingNote] = useState(false);
  const [migrationWarning, setMigrationWarning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Mention state ── */
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIds, setMentionIds] = useState<string[]>([]);

  /* ── Tag people state ── */
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);

  const firstName = user.display_name?.split(" ")[0] || "there";

  const initials = user.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContent(value);
      const ta = e.target;
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";

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
      const ta = textareaRef.current;
      const cursorPos = ta?.selectionStart || content.length;
      const textBeforeCursor = content.slice(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf("@");

      if (atIndex !== -1) {
        const before = content.slice(0, atIndex);
        const after = content.slice(cursorPos);
        const newText = `${before}@${member.display_name} ${after}`;
        setContent(newText);
        setMentionIds((prev) =>
          prev.includes(member.id) ? prev : [...prev, member.id]
        );
      }
      setMentionQuery(null);
      ta?.focus();
    },
    [content]
  );

  const handleTagToggle = useCallback((userId: string) => {
    setTaggedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }, []);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const added: AttachedFile[] = Array.from(newFiles).map((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      return {
        file,
        preview: isImage || isVideo ? URL.createObjectURL(file) : undefined,
      };
    });
    setFiles((prev) => [...prev, ...added]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const canSubmit = (content.trim().length > 0 || files.length > 0) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setUploadProgress("");

    try {
      // 1. Create post with mentions and tagged users
      const postBody: Record<string, unknown> = { content: content.trim() };
      if (mentionIds.length > 0) postBody.mentions = mentionIds;
      if (taggedUsers.length > 0) postBody.tagged_users = taggedUsers;

      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postBody),
      });

      if (!postRes.ok) throw new Error("Failed to create post");
      const postData = await postRes.json();
      const postId = postData.post?.id;

      // 2. Upload files directly to Supabase and attach to post
      if (postId && files.length > 0) {
        const attachments: { file_url: string; file_name: string; file_type: string; file_size: number }[] = [];

        for (let i = 0; i < files.length; i++) {
          const { file } = files[i];
          setUploadProgress(`Uploading ${i + 1}/${files.length}: ${file.name}`);

          const result = await uploadFileDirect(file);
          if (result) {
            attachments.push({
              file_url: result.url,
              file_name: result.fileName,
              file_type: result.fileType,
              file_size: result.fileSize,
            });
          }
        }

        // Attach all uploaded files to post
        if (attachments.length > 0) {
          await fetch(`/api/posts/${postId}/attachments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attachments }),
          });
        }
      }

      // 3. Reset form
      setContent("");
      setFiles([]);
      setUploadProgress("");
      setMentionIds([]);
      setTaggedUsers([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      if (postData.migration_needed) {
        setMigrationWarning(true);
        setTimeout(() => setMigrationWarning(false), 8000);
      } else if (!isOwner && postData.status === "pending") {
        setPendingNote(true);
        setTimeout(() => setPendingNote(false), 5000);
      }
      onPostCreated();
    } catch (err) {
      console.error("Failed to create post:", err);
    } finally {
      setSubmitting(false);
      setUploadProgress("");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border-light p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <div className="flex gap-3">
        {/* User avatar */}
        <div className="flex-shrink-0">
          {user.profile_pic_url ? (
            <img
              src={user.profile_pic_url}
              alt={user.display_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#D4692A] flex items-center justify-center">
              <span
                className="text-sm font-bold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {initials}
              </span>
            </div>
          )}
        </div>

        {/* Form content */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              placeholder={`What's on your mind, ${firstName}?`}
              rows={2}
              className="w-full resize-none border-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:ring-0 focus:outline-none p-0"
              style={{ minHeight: "48px" }}
            />

            {/* Mention dropdown */}
            {mentionQuery !== null && teamMembers.length > 0 && (
              <MentionDropdown
                query={mentionQuery}
                members={teamMembers.filter((m) => m.id !== user.id)}
                onSelect={handleMentionSelect}
              />
            )}
          </div>

          {/* Tagged users chips */}
          {taggedUsers.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1 mb-2">
              <span className="text-xs text-text-muted">With</span>
              {taggedUsers.map((uid) => {
                const member = teamMembers.find((m) => m.id === uid);
                return member ? (
                  <span
                    key={uid}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4692A]/5 border border-[#D4692A]/20 text-xs font-medium text-[#D4692A]"
                  >
                    {member.profile_pic_url ? (
                      <img src={member.profile_pic_url} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                    ) : null}
                    {member.display_name}
                    <button
                      onClick={() => handleTagToggle(uid)}
                      className="ml-0.5 hover:text-red-500 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          )}

          {/* Image & Video previews */}
          {files.some((f) => f.preview) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {files
                .filter((f) => f.preview)
                .map((f, i) => {
                  const globalIdx = files.indexOf(f);
                  const isVideo = f.file.type.startsWith("video/");
                  return (
                    <div key={i} className="relative group">
                      {isVideo ? (
                        <video
                          src={f.preview}
                          className="w-20 h-20 rounded-xl object-cover border border-border-light"
                        />
                      ) : (
                        <img
                          src={f.preview}
                          alt={f.file.name}
                          className="w-20 h-20 rounded-xl object-cover border border-border-light"
                        />
                      )}
                      <button
                        onClick={() => removeFile(globalIdx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

          {/* File chips */}
          {files.some((f) => !f.preview) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {files
                .filter((f) => !f.preview)
                .map((f, i) => {
                  const globalIdx = files.indexOf(f);
                  return (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5f2ef] text-xs text-text-secondary"
                    >
                      <Paperclip size={12} />
                      <span className="max-w-[120px] truncate">
                        {f.file.name}
                      </span>
                      <button
                        onClick={() => removeFile(globalIdx)}
                        className="ml-1 text-text-muted hover:text-red-500 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-border-light mt-3 mb-3" />

          {/* Actions row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-[#f5f2ef] hover:text-[#D4692A] transition-all duration-200"
              >
                <ImageIcon size={16} />
                <span className="hidden sm:inline">Photo</span>
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-[#f5f2ef] hover:text-[#D4692A] transition-all duration-200"
              >
                <Video size={16} />
                <span className="hidden sm:inline">Video</span>
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-[#f5f2ef] hover:text-[#D4692A] transition-all duration-200"
              >
                <Paperclip size={16} />
                <span className="hidden sm:inline">File</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />

              {/* @Mention button */}
              <button
                type="button"
                onClick={() => {
                  const ta = textareaRef.current;
                  if (ta) {
                    const pos = ta.selectionStart || content.length;
                    const before = content.slice(0, pos);
                    const after = content.slice(pos);
                    const needSpace = before.length > 0 && !before.endsWith(" ") && !before.endsWith("\n");
                    const newText = `${before}${needSpace ? " " : ""}@${after}`;
                    setContent(newText);
                    setMentionQuery("");
                    ta.focus();
                    // Set cursor position after @
                    setTimeout(() => {
                      const newPos = pos + (needSpace ? 2 : 1);
                      ta.setSelectionRange(newPos, newPos);
                    }, 0);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-[#f5f2ef] hover:text-[#D4692A] transition-all duration-200"
                title="Mention someone"
              >
                <AtSign size={16} />
                <span className="hidden sm:inline">Mention</span>
              </button>

              {/* Tag People button */}
              {teamMembers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTagModal(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                    taggedUsers.length > 0
                      ? "text-[#D4692A] bg-[#D4692A]/5 font-medium"
                      : "text-text-secondary hover:bg-[#f5f2ef] hover:text-[#D4692A]"
                  }`}
                  title="Tag people"
                >
                  <UserPlus size={16} />
                  <span className="hidden sm:inline">
                    Tag{taggedUsers.length > 0 ? ` (${taggedUsers.length})` : ""}
                  </span>
                </button>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#D4692A] text-white text-sm font-semibold transition-all duration-300 hover:bg-[#B85A24] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(212,105,42,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {uploadProgress || "Posting…"}
                </>
              ) : (
                <>
                  <Send size={14} />
                  Post
                </>
              )}
            </button>
          </div>

          {pendingNote && (
            <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
              <Clock size={14} />
              Your post has been submitted and is awaiting review.
            </div>
          )}

          {migrationWarning && (
            <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <div>
                <p className="font-semibold">Post approval system is not active</p>
                <p className="text-xs mt-1 text-red-600">
                  The database migration needs to be run in Supabase Dashboard → SQL Editor. 
                  Until then, all posts are published immediately without review.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tag People Modal */}
      {showTagModal && (
        <TagPeopleModal
          members={teamMembers.filter((m) => m.id !== user.id)}
          selected={taggedUsers}
          onToggle={handleTagToggle}
          onClose={() => setShowTagModal(false)}
        />
      )}
    </div>
  );
}

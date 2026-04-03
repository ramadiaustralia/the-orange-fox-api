"use client";

import { useState, useRef, useCallback } from "react";
import { ImageIcon, Paperclip, X, Loader2, Send } from "lucide-react";
import type { UserProfile } from "@/context/AuthContext";

interface PostFormProps {
  user: UserProfile;
  onPostCreated: () => void;
}

interface AttachedFile {
  file: File;
  preview?: string;
}

export default function PostForm({ user, onPostCreated }: PostFormProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstName = user.display_name?.split(" ")[0] || "there";

  const initials = user.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
      // Auto-expand
      const ta = e.target;
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    },
    []
  );

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const added: AttachedFile[] = Array.from(newFiles).map((file) => {
      const isImage = file.type.startsWith("image/");
      return {
        file,
        preview: isImage ? URL.createObjectURL(file) : undefined,
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

    try {
      // 1. Create post
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!postRes.ok) throw new Error("Failed to create post");
      const postData = await postRes.json();
      const postId = postData.data?.id;

      // 2. Upload files and attach
      if (postId && files.length > 0) {
        for (const { file } of files) {
          const formData = new FormData();
          formData.append("file", file);

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            await fetch(`/api/posts/${postId}/attachments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                file_url: uploadData.data?.url || uploadData.url,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
              }),
            });
          }
        }
      }

      // 3. Reset form
      setContent("");
      setFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      onPostCreated();
    } catch (err) {
      console.error("Failed to create post:", err);
    } finally {
      setSubmitting(false);
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
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            placeholder={`What's on your mind, ${firstName}?`}
            rows={2}
            className="w-full resize-none border-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:ring-0 focus:outline-none p-0"
            style={{ minHeight: "48px" }}
          />

          {/* Image previews */}
          {files.some((f) => f.preview) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {files
                .filter((f) => f.preview)
                .map((f, i) => {
                  const globalIdx = files.indexOf(f);
                  return (
                    <div key={i} className="relative group">
                      <img
                        src={f.preview}
                        alt={f.file.name}
                        className="w-20 h-20 rounded-xl object-cover border border-border-light"
                      />
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
                  Posting…
                </>
              ) : (
                <>
                  <Send size={14} />
                  Post
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Clock, Eye, RefreshCw } from "lucide-react";
import PostForm from "@/components/PostForm";
import PostCard, { Post } from "@/components/PostCard";
import ProfilePopup from "@/components/ProfilePopup";

/* ── Scroll reveal hook ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

/* ── Greeting helper ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

/* ── Loading skeleton ── */
function PostSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-border-light p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-light-bg" />
        <div className="flex-1">
          <div className="h-3.5 w-32 bg-light-bg rounded-lg mb-2" />
          <div className="h-2.5 w-20 bg-light-bg rounded-lg" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-light-bg rounded-lg w-full" />
        <div className="h-3 bg-light-bg rounded-lg w-3/4" />
        <div className="h-3 bg-light-bg rounded-lg w-1/2" />
      </div>
      <div className="h-px bg-border-light mb-3" />
      <div className="flex gap-4">
        <div className="h-8 w-20 bg-light-bg rounded-lg" />
        <div className="h-8 w-24 bg-light-bg rounded-lg" />
      </div>
    </div>
  );
}

/* ── Profile popup user type ── */
interface ProfileUser {
  id: string;
  display_name: string;
  position: string;
  email: string;
  profile_pic_url: string | null;
}

/* ── Page ── */
export default function DashboardPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Fetch posts ── */
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      const json = await res.json();
      if (json.posts) {
        setPosts(json.posts);
      }
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Initial load + polling ── */
  useEffect(() => {
    fetchPosts();

    // Poll every 30 seconds
    pollRef.current = setInterval(fetchPosts, 30000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchPosts]);

  const handlePostCreated = useCallback(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleProfileClick = useCallback((u: ProfileUser) => {
    setProfileUser(u);
  }, []);

  return (
    <div className="space-y-6 relative max-w-2xl mx-auto">
      {/* Subtle background orbs */}
      <div
        className="fixed top-20 right-10 w-[400px] h-[400px] rounded-full pointer-events-none opacity-[0.03]"
        style={{
          background:
            "radial-gradient(circle, rgba(212,105,42,0.4) 0%, transparent 70%)",
          animation: "orbFloat 40s ease-in-out infinite",
        }}
      />
      <div
        className="fixed bottom-20 left-10 w-[300px] h-[300px] rounded-full pointer-events-none opacity-[0.03]"
        style={{
          background:
            "radial-gradient(circle, rgba(212,105,42,0.3) 0%, transparent 70%)",
          animation: "orbFloat 30s ease-in-out infinite reverse",
        }}
      />

      {/* ─── Hero Header ─── */}
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#141414] via-[#1a1a1a] to-[#222222] p-8 lg:p-10">
          {/* Decorative elements */}
          <div
            className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-10"
            style={{
              background:
                "radial-gradient(circle, rgba(212,105,42,0.5) 0%, transparent 70%)",
              animation: "orbFloat 25s ease-in-out infinite",
            }}
          />
          <div
            className="absolute top-4 right-4 w-12 h-12 pointer-events-none opacity-10 border-r border-t border-orange/40"
            style={{ animation: "heroCornerPulse 7s ease-in-out infinite" }}
          />
          <div
            className="absolute bottom-4 left-4 w-12 h-12 pointer-events-none opacity-10 border-l border-b border-orange/40"
            style={{
              animation: "heroCornerPulse 7s ease-in-out infinite 3.5s",
            }}
          />

          <div className="relative z-10 flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="The Orange Fox"
                  width={56}
                  height={56}
                  className="rounded-xl"
                  style={{ animation: "heroFloat 7s ease-in-out infinite" }}
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#141414]"
                  style={{ animation: "pulse-orange 2s infinite" }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-[1.5px] bg-orange" />
                  <span
                    className="text-[0.6rem] uppercase tracking-[3px] text-white/40 font-semibold"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Team Feed
                  </span>
                </div>
                <h1
                  className="text-xl lg:text-2xl font-bold text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {getGreeting()}
                  {user?.display_name
                    ? `, ${user.display_name.split(" ")[0]}`
                    : ""}
                </h1>
                <p className="text-sm text-white/40 mt-0.5 flex items-center gap-1.5">
                  <Clock size={12} />
                  {new Date().toLocaleDateString("en-AU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <a
              href="https://the-orange-fox-web.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-orange text-white rounded-xl font-semibold text-sm tracking-wider uppercase overflow-hidden transition-all duration-300 hover:bg-orange-600 hover:-translate-y-0.5 hover:shadow-[0_4px_24px_rgba(212,105,42,0.4)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Eye size={16} className="relative" />
              <span className="relative">View Live Site</span>
            </a>
          </div>
        </div>
      </Reveal>

      {/* ─── Post Form ─── */}
      {user && (
        <Reveal delay={0.1}>
          <PostForm user={user} onPostCreated={handlePostCreated} />
        </Reveal>
      )}

      {/* ─── Timeline Feed ─── */}
      <div className="space-y-4">
        {loading ? (
          <>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </>
        ) : posts.length === 0 ? (
          <Reveal delay={0.2}>
            <div className="bg-white rounded-2xl border border-border-light p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#f5f2ef] flex items-center justify-center mx-auto mb-4">
                <RefreshCw size={24} className="text-text-muted" />
              </div>
              <h3
                className="text-lg font-semibold text-text-primary mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                No posts yet
              </h3>
              <p className="text-sm text-text-muted">
                Be the first to share something with the team!
              </p>
            </div>
          </Reveal>
        ) : (
          posts.map((post, i) => (
            <Reveal key={post.id} delay={Math.min(i * 0.05, 0.3)}>
              <PostCard
                post={post}
                currentUserId={user?.id || ""}
                onUpdate={fetchPosts}
                onProfileClick={handleProfileClick}
              />
            </Reveal>
          ))
        )}
      </div>

      {/* ─── Profile Popup ─── */}
      {profileUser && (
        <ProfilePopup
          user={profileUser}
          onClose={() => setProfileUser(null)}
        />
      )}
    </div>
  );
}

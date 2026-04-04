import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";


/* ── Check if the 'status' column exists on the posts table ── */
let statusColumnExists: boolean | null = null;

async function hasStatusColumn(): Promise<boolean> {
  if (statusColumnExists !== null) return statusColumnExists;

  const { error } = await getSupabaseAdmin()
    .from("posts")
    .select("status")
    .limit(1);

  // If the query succeeds or returns no rows, column exists
  // If it fails with a column-not-found error, column doesn't exist
  statusColumnExists = !error || !error.message?.includes("status");
  return statusColumnExists;
}

export async function GET(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const selectQuery = `
    *,
    author:admin_users!author_id(id, display_name, position, profile_pic_url),
    attachments:post_attachments(*),
    likes:post_likes(id, user_id),
    comments:post_comments(id)
  `;

  const hasColumn = await hasStatusColumn();
  const badge = admin.badge || "staff";

  let posts: Record<string, unknown>[] | null = null;

  if (hasColumn) {
    // Migration has been run — use proper status filtering
    if (statusFilter === "pending") {
      // Owner/Board/Manager can see pending posts for review. Staff cannot.
      if (badge === "staff") {
        // Staff can only see their own pending posts
        const { data, error } = await db
          .from("posts")
          .select(selectQuery)
          .eq("status", "pending")
          .eq("author_id", admin.sub)
          .order("created_at", { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        posts = data;
      } else {
        // Owner, Board, Manager can see all pending posts
        const { data, error } = await db
          .from("posts")
          .select(selectQuery)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        posts = data;
      }
    } else {
      // Default: show approved posts
      // Staff sees only approved posts + their own pending
      if (badge === "staff") {
        const { data: approvedPosts, error: approvedError } = await db
          .from("posts")
          .select(selectQuery)
          .eq("status", "approved")
          .order("created_at", { ascending: false });

        if (approvedError) return NextResponse.json({ error: approvedError.message }, { status: 500 });

        const { data: myPendingPosts, error: pendingError } = await db
          .from("posts")
          .select(selectQuery)
          .eq("status", "pending")
          .eq("author_id", admin.sub)
          .order("created_at", { ascending: false });

        if (pendingError) return NextResponse.json({ error: pendingError.message }, { status: 500 });

        posts = [...(approvedPosts || []), ...(myPendingPosts || [])];
        // Sort merged results by created_at descending
        posts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else {
        // Owner/Board/Manager see approved posts by default
        const { data, error } = await db
          .from("posts")
          .select(selectQuery)
          .eq("status", "approved")
          .order("created_at", { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        posts = data;
      }
    }
  } else {
    // Migration NOT run — return all posts (no status column to filter on)
    if (statusFilter === "pending") {
      // Can't filter pending without the column
      return NextResponse.json({ posts: [], migration_needed: true });
    }
    const { data, error } = await db
      .from("posts")
      .select(selectQuery)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    posts = data;
  }

  const enrichedPosts = (posts || []).map((post: Record<string, unknown>) => {
    const likes = (post.likes as Array<{ id: string; user_id: string }>) || [];
    const comments = (post.comments as Array<{ id: string }>) || [];
    return {
      id: post.id,
      author_id: post.author_id,
      content: post.content,
      status: post.status || "approved",
      created_at: post.created_at,
      updated_at: post.updated_at,
      edited_at: post.edited_at || null,
      author: post.author,
      attachments: post.attachments,
      like_count: likes.length,
      comment_count: comments.length,
      liked_by_me: likes.some((l) => l.user_id === admin.sub),
    };
  });

  return NextResponse.json({ posts: enrichedPosts, migration_needed: !hasColumn });
}

export async function POST(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { content } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const hasColumn = await hasStatusColumn();
    const badge = admin.badge || "staff";

    if (hasColumn) {
      // Migration run — use proper approval flow
      // Owner + Board → auto-approved; Manager + Staff → pending
      const postStatus = (badge === "owner" || badge === "board") ? "approved" : "pending";

      const { data: post, error } = await getSupabaseAdmin()
        .from("posts")
        .insert({ author_id: admin.sub, content: content.trim(), status: postStatus })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ post, status: postStatus, migration_needed: false });
    } else {
      // Migration NOT run — insert without status, but warn
      const { data: post, error } = await getSupabaseAdmin()
        .from("posts")
        .insert({ author_id: admin.sub, content: content.trim() })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({
        post,
        status: "approved",
        migration_needed: true,
        migration_warning: "Post approval system is not active. Please run the database migration to enable it.",
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

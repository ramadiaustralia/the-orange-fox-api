import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

async function authenticate(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const admin = await authenticate(req);
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

  let posts: Record<string, unknown>[] | null = null;

  // Try with status filter first (requires migration)
  if (statusFilter === "pending") {
    if (admin.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { data, error } = await db
      .from("posts")
      .select(selectQuery)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      // If status column doesn't exist, return empty for pending
      return NextResponse.json({ posts: [] });
    }
    posts = data;
  } else {
    // Try filtering by approved status
    const { data, error } = await db
      .from("posts")
      .select(selectQuery)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback: status column may not exist yet, fetch all posts
      const { data: fallbackData, error: fallbackError } = await db
        .from("posts")
        .select(selectQuery)
        .order("created_at", { ascending: false });

      if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      posts = fallbackData;
    } else {
      posts = data;
    }
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
      author: post.author,
      attachments: post.attachments,
      like_count: likes.length,
      comment_count: comments.length,
      liked_by_me: likes.some((l) => l.user_id === admin.sub),
    };
  });

  return NextResponse.json({ posts: enrichedPosts });
}

export async function POST(req: NextRequest) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { content } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const { data: userData } = await getSupabaseAdmin()
      .from("admin_users")
      .select("role")
      .eq("id", admin.sub)
      .single();

    const isOwnerUser = userData?.role === "owner";
    const postStatus = isOwnerUser ? "approved" : "pending";

    // Try inserting with status field (requires migration)
    const { data: post, error } = await getSupabaseAdmin()
      .from("posts")
      .insert({ author_id: admin.sub, content: content.trim(), status: postStatus })
      .select()
      .single();

    if (error) {
      // Fallback: status column may not exist yet, insert without it
      const { data: fallbackPost, error: fallbackError } = await getSupabaseAdmin()
        .from("posts")
        .insert({ author_id: admin.sub, content: content.trim() })
        .select()
        .single();

      if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      return NextResponse.json({ post: fallbackPost, status: "approved" });
    }

    return NextResponse.json({ post, status: postStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

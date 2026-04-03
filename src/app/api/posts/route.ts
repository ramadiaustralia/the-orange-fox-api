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

  // Fetch posts with author info and attachments
  const { data: posts, error } = await db
    .from("posts")
    .select(`
      *,
      author:admin_users!author_id(id, display_name, position, profile_pic_url),
      attachments:post_attachments(*),
      likes:post_likes(id, user_id),
      comments:post_comments(id)
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enrichedPosts = (posts || []).map((post: Record<string, unknown>) => {
    const likes = (post.likes as Array<{ id: string; user_id: string }>) || [];
    const comments = (post.comments as Array<{ id: string }>) || [];
    return {
      id: post.id,
      author_id: post.author_id,
      content: post.content,
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

    const { data: post, error } = await getSupabaseAdmin()
      .from("posts")
      .insert({ author_id: admin.sub, content: content.trim() })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ post });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

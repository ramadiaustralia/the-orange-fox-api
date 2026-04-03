import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

async function authenticate(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await params;
  const db = getSupabaseAdmin();

  const { data: comments, error } = await db
    .from("post_comments")
    .select(`
      *,
      author:admin_users!author_id(id, display_name, position, profile_pic_url),
      likes:comment_likes(id, user_id)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = (comments || []).map((comment: Record<string, unknown>) => {
    const likes = (comment.likes as Array<{ id: string; user_id: string }>) || [];
    return {
      id: comment.id,
      post_id: comment.post_id,
      author_id: comment.author_id,
      content: comment.content,
      created_at: comment.created_at,
      author: comment.author,
      like_count: likes.length,
      liked_by_me: likes.some((l) => l.user_id === admin.sub),
    };
  });

  return NextResponse.json({ comments: enriched });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await params;

  try {
    const { content } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    const { data: comment, error } = await db
      .from("post_comments")
      .insert({ post_id: postId, author_id: admin.sub, content: content.trim() })
      .select(`
        *,
        author:admin_users!author_id(id, display_name, position, profile_pic_url)
      `)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Create notification for post author (not if self)
    const { data: post } = await db
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (post && post.author_id !== admin.sub) {
      await db.from("notifications").insert({
        user_id: post.author_id,
        actor_id: admin.sub,
        type: "comment_post",
        post_id: postId,
        comment_id: comment.id,
      });
    }

    return NextResponse.json({ comment: { ...comment, like_count: 0, liked_by_me: false } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

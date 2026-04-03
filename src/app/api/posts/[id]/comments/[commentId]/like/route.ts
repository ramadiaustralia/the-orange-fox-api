import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

async function authenticate(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId, commentId } = await params;
  const db = getSupabaseAdmin();

  // Check if already liked
  const { data: existing } = await db
    .from("comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", admin.sub)
    .single();

  let liked: boolean;

  if (existing) {
    // Unlike
    await db.from("comment_likes").delete().eq("id", existing.id);
    liked = false;
  } else {
    // Like
    const { error } = await db
      .from("comment_likes")
      .insert({ comment_id: commentId, user_id: admin.sub });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    liked = true;

    // Create notification for comment author (not if self)
    const { data: comment } = await db
      .from("post_comments")
      .select("author_id")
      .eq("id", commentId)
      .single();

    if (comment && comment.author_id !== admin.sub) {
      await db.from("notifications").insert({
        user_id: comment.author_id,
        actor_id: admin.sub,
        type: "like_comment",
        post_id: postId,
        comment_id: commentId,
      });
    }
  }

  // Get updated like count
  const { count } = await db
    .from("comment_likes")
    .select("id", { count: "exact", head: true })
    .eq("comment_id", commentId);

  return NextResponse.json({ liked, likeCount: count || 0 });
}

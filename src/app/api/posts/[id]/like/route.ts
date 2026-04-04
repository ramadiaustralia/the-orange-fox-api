import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await params;
  const db = getSupabaseAdmin();

  // Check if already liked
  const { data: existing } = await db
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", admin.sub)
    .single();

  let liked: boolean;

  if (existing) {
    // Unlike
    await db.from("post_likes").delete().eq("id", existing.id);
    liked = false;
  } else {
    // Like
    const { error } = await db
      .from("post_likes")
      .insert({ post_id: postId, user_id: admin.sub });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    liked = true;

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
        type: "like_post",
        post_id: postId,
      });
    }
  }

  // Get updated like count
  const { count } = await db
    .from("post_likes")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);

  return NextResponse.json({ liked, likeCount: count || 0 });
}

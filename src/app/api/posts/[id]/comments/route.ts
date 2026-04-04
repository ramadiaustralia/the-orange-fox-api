import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
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

  // Build a map for reply-to lookup
  const commentMap = new Map<string, Record<string, unknown>>();
  for (const c of comments || []) {
    commentMap.set(c.id as string, c);
  }

  const enriched = (comments || []).map((comment: Record<string, unknown>) => {
    const likes = (comment.likes as Array<{ id: string; user_id: string }>) || [];
    const replyToId = comment.reply_to_id as string | null;
    let replyTo = null;
    if (replyToId && commentMap.has(replyToId)) {
      const parent = commentMap.get(replyToId)!;
      replyTo = {
        id: parent.id,
        content: (parent.content as string)?.slice(0, 100),
        author: parent.author,
      };
    }
    return {
      id: comment.id,
      post_id: comment.post_id,
      author_id: comment.author_id,
      content: comment.content,
      created_at: comment.created_at,
      author: comment.author,
      like_count: likes.length,
      liked_by_me: likes.some((l) => l.user_id === admin.sub),
      reply_to_id: replyToId,
      reply_to: replyTo,
      mentions: comment.mentions || [],
    };
  });

  return NextResponse.json({ comments: enriched });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await params;

  try {
    const { content, reply_to_id, mentions } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    const insertData: Record<string, unknown> = {
      post_id: postId,
      author_id: admin.sub,
      content: content.trim(),
    };
    if (reply_to_id) insertData.reply_to_id = reply_to_id;
    if (mentions && mentions.length > 0) insertData.mentions = mentions;

    const { data: comment, error } = await db
      .from("post_comments")
      .insert(insertData)
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

    // Notify mentioned users
    if (mentions && mentions.length > 0) {
      const notifs = mentions
        .filter((uid: string) => uid !== admin.sub)
        .map((uid: string) => ({
          user_id: uid,
          actor_id: admin.sub,
          type: "mention_comment",
          post_id: postId,
          comment_id: comment.id,
        }));
      if (notifs.length > 0) await db.from("notifications").insert(notifs);
    }

    // Notify reply target author
    if (reply_to_id) {
      const { data: parentComment } = await db
        .from("post_comments")
        .select("author_id")
        .eq("id", reply_to_id)
        .single();
      if (parentComment && parentComment.author_id !== admin.sub) {
        await db.from("notifications").insert({
          user_id: parentComment.author_id,
          actor_id: admin.sub,
          type: "reply_comment",
          post_id: postId,
          comment_id: comment.id,
        });
      }
    }

    return NextResponse.json({ comment: { ...comment, like_count: 0, liked_by_me: false, reply_to: null, mentions: mentions || [] } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";

// GET: Get all reactions for a post and/or its comments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await params;
  const { searchParams } = new URL(req.url);
  const targetType = searchParams.get("target_type") || "post";
  const targetIdsParam = searchParams.get("target_ids");

  const db = getSupabaseAdmin();

  const targetIds = targetIdsParam
    ? targetIdsParam.split(",").filter(Boolean)
    : [postId];

  const { data, error } = await db
    .from("post_reactions")
    .select("id, target_type, target_id, user_id, reaction_type, user:admin_users!user_id(id, display_name, profile_pic_url)")
    .eq("target_type", targetType)
    .in("target_id", targetIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by target_id then by reaction_type
  const reactions: Record<string, { reaction_type: string; count: number; users: { id: string; display_name: string; profile_pic_url: string | null }[]; reacted: boolean }[]> = {};

  for (const tid of targetIds) {
    reactions[tid] = [];
  }

  const targetReactionMap: Record<string, Record<string, { users: { id: string; display_name: string; profile_pic_url: string | null }[]; reacted: boolean }>> = {};

  for (const row of data || []) {
    const tid = row.target_id;
    const rtype = row.reaction_type;
    if (!targetReactionMap[tid]) targetReactionMap[tid] = {};
    if (!targetReactionMap[tid][rtype]) {
      targetReactionMap[tid][rtype] = { users: [], reacted: false };
    }
    const user = row.user as unknown as { id: string; display_name: string; profile_pic_url: string | null };
    targetReactionMap[tid][rtype].users.push(user);
    if (row.user_id === admin.sub) {
      targetReactionMap[tid][rtype].reacted = true;
    }
  }

  for (const tid of Object.keys(targetReactionMap)) {
    reactions[tid] = Object.entries(targetReactionMap[tid]).map(([rtype, info]) => ({
      reaction_type: rtype,
      count: info.users.length,
      users: info.users,
      reacted: info.reacted,
    }));
  }

  return NextResponse.json({ reactions });
}

// POST: Toggle a reaction (one per user per target, FB-style)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await params;
  const { target_type, target_id, reaction_type } = await req.json();

  const tType = target_type || "post";
  const tId = target_id || postId;
  const rType = reaction_type || "like";

  const db = getSupabaseAdmin();

  // Check existing reaction
  const { data: existing } = await db
    .from("post_reactions")
    .select("id, reaction_type")
    .eq("target_type", tType)
    .eq("target_id", tId)
    .eq("user_id", admin.sub)
    .single();

  if (existing) {
    if (existing.reaction_type === rType) {
      // Same reaction → remove
      await db.from("post_reactions").delete().eq("id", existing.id);
      return NextResponse.json({ action: "removed" });
    } else {
      // Different reaction → update
      await db.from("post_reactions").update({ reaction_type: rType }).eq("id", existing.id);
      return NextResponse.json({ action: "changed" });
    }
  } else {
    // New reaction
    const { error } = await db.from("post_reactions").insert({
      target_type: tType,
      target_id: tId,
      user_id: admin.sub,
      reaction_type: rType,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify post/comment author
    if (tType === "post") {
      const { data: post } = await db.from("posts").select("author_id").eq("id", tId).single();
      if (post && post.author_id !== admin.sub) {
        await db.from("notifications").insert({
          user_id: post.author_id,
          actor_id: admin.sub,
          type: "reaction_post",
          post_id: tId,
        });
      }
    }
    return NextResponse.json({ action: "added" });
  }
}

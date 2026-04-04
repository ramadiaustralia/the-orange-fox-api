import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";

// GET user's role in a project
async function getProjectRole(projectId: string, userId: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();
  return data?.role || null;
}

// GET: Get reactions for specified targets
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // Verify project access
    const myRole = await getProjectRole(id, admin.sub);
    if (!myRole && admin.badge !== "owner") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get("target_type");
    const targetIdsParam = searchParams.get("target_ids");

    if (!targetType || !targetIdsParam) {
      return NextResponse.json(
        { error: "target_type and target_ids are required" },
        { status: 400 }
      );
    }

    const targetIds = targetIdsParam.split(",").map((id) => id.trim()).filter(Boolean);

    if (targetIds.length === 0) {
      return NextResponse.json({ reactions: {} });
    }

    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from("message_reactions")
      .select("id, target_id, emoji, user_id, user:admin_users!user_id(id, display_name)")
      .eq("target_type", targetType)
      .in("target_id", targetIds);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Group reactions by target_id, then by emoji
    const reactions: Record<
      string,
      { emoji: string; count: number; users: { id: string; display_name: string }[]; reacted: boolean }[]
    > = {};

    // Initialize all requested target IDs with empty arrays
    for (const tid of targetIds) {
      reactions[tid] = [];
    }

    // Build a map: target_id -> emoji -> { users, reacted }
    const targetEmojiMap: Record<
      string,
      Record<string, { users: { id: string; display_name: string }[]; reacted: boolean }>
    > = {};

    for (const row of data || []) {
      const tid = row.target_id;
      const emoji = row.emoji;

      if (!targetEmojiMap[tid]) targetEmojiMap[tid] = {};
      if (!targetEmojiMap[tid][emoji]) {
        targetEmojiMap[tid][emoji] = { users: [], reacted: false };
      }

      const user = row.user as unknown as { id: string; display_name: string };
      targetEmojiMap[tid][emoji].users.push({
        id: user.id,
        display_name: user.display_name,
      });

      if (row.user_id === admin.sub) {
        targetEmojiMap[tid][emoji].reacted = true;
      }
    }

    // Convert map to array format
    for (const tid of Object.keys(targetEmojiMap)) {
      reactions[tid] = Object.entries(targetEmojiMap[tid]).map(([emoji, info]) => ({
        emoji,
        count: info.users.length,
        users: info.users,
        reacted: info.reacted,
      }));
    }

    return NextResponse.json({ reactions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Toggle a reaction (add if not exists, remove if exists)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // Verify project access
    const myRole = await getProjectRole(id, admin.sub);
    if (!myRole && admin.badge !== "owner") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { target_type, target_id, emoji } = await req.json();

    if (!target_type || !target_id || !emoji) {
      return NextResponse.json(
        { error: "target_type, target_id, and emoji are required" },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();

    // Check if user already has ANY reaction on this target (one reaction per user per target)
    const { data: existing } = await db
      .from("message_reactions")
      .select("id, emoji")
      .eq("target_type", target_type)
      .eq("target_id", target_id)
      .eq("user_id", admin.sub)
      .single();

    if (existing) {
      if (existing.emoji === emoji) {
        // Same emoji clicked again → remove (toggle off)
        const { error } = await db
          .from("message_reactions")
          .delete()
          .eq("id", existing.id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ action: "removed" });
      } else {
        // Different emoji → update to new emoji
        const { error } = await db
          .from("message_reactions")
          .update({ emoji })
          .eq("id", existing.id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ action: "changed" });
      }
    } else {
      // No existing reaction → add new
      const { error } = await db
        .from("message_reactions")
        .insert({
          target_type,
          target_id,
          user_id: admin.sub,
          emoji,
        });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ action: "added" });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

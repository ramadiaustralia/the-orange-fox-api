import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";

// GET: Get reactions for specific message IDs
export async function GET(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const messageIds = searchParams.get("message_ids")?.split(",").filter(Boolean) || [];
  if (messageIds.length === 0) return NextResponse.json({ reactions: {} });

  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("internal_message_reactions")
    .select("id, message_id, user_id, emoji, user:admin_users!user_id(id, display_name, profile_pic_url)")
    .in("message_id", messageIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by message_id then by emoji
  const reactions: Record<string, { emoji: string; count: number; users: { id: string; display_name: string }[]; reacted: boolean }[]> = {};

  for (const mid of messageIds) reactions[mid] = [];

  const msgEmojiMap: Record<string, Record<string, { users: { id: string; display_name: string }[]; reacted: boolean }>> = {};

  for (const row of data || []) {
    const mid = row.message_id;
    const emoji = row.emoji;
    if (!msgEmojiMap[mid]) msgEmojiMap[mid] = {};
    if (!msgEmojiMap[mid][emoji]) msgEmojiMap[mid][emoji] = { users: [], reacted: false };
    const user = row.user as unknown as { id: string; display_name: string };
    msgEmojiMap[mid][emoji].users.push(user);
    if (row.user_id === admin.sub) msgEmojiMap[mid][emoji].reacted = true;
  }

  for (const mid of Object.keys(msgEmojiMap)) {
    reactions[mid] = Object.entries(msgEmojiMap[mid]).map(([emoji, info]) => ({
      emoji,
      count: info.users.length,
      users: info.users,
      reacted: info.reacted,
    }));
  }

  return NextResponse.json({ reactions });
}

// POST: Toggle reaction (one per user per message)
export async function POST(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message_id, emoji } = await req.json();
  if (!message_id || !emoji) return NextResponse.json({ error: "message_id and emoji required" }, { status: 400 });

  const db = getSupabaseAdmin();

  const { data: existing } = await db
    .from("internal_message_reactions")
    .select("id, emoji")
    .eq("message_id", message_id)
    .eq("user_id", admin.sub)
    .single();

  if (existing) {
    if (existing.emoji === emoji) {
      await db.from("internal_message_reactions").delete().eq("id", existing.id);
      return NextResponse.json({ action: "removed" });
    } else {
      await db.from("internal_message_reactions").update({ emoji }).eq("id", existing.id);
      return NextResponse.json({ action: "changed" });
    }
  } else {
    const { error } = await db.from("internal_message_reactions").insert({
      message_id,
      user_id: admin.sub,
      emoji,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ action: "added" });
  }
}

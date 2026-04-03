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
  const myId = admin.sub;

  // Get all messages involving current user
  const { data: messages, error } = await db
    .from("internal_messages")
    .select("*")
    .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by conversation partner
  const conversationMap = new Map<string, { lastMessage: Record<string, unknown>; unreadCount: number }>();

  for (const msg of messages || []) {
    const partnerId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
    if (!conversationMap.has(partnerId)) {
      conversationMap.set(partnerId, { lastMessage: msg, unreadCount: 0 });
    }
    // Count unread messages sent to me
    if (msg.receiver_id === myId && !msg.is_read) {
      const conv = conversationMap.get(partnerId)!;
      conv.unreadCount++;
    }
  }

  // Fetch user info for all partners
  const partnerIds = Array.from(conversationMap.keys());
  if (partnerIds.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const { data: users } = await db
    .from("admin_users")
    .select("id, display_name, position, profile_pic_url, email")
    .in("id", partnerIds);

  const userMap = new Map<string, Record<string, unknown>>();
  for (const u of users || []) {
    userMap.set(u.id, u);
  }

  const conversations = partnerIds.map((partnerId) => {
    const conv = conversationMap.get(partnerId)!;
    return {
      user: userMap.get(partnerId) || { id: partnerId },
      lastMessage: conv.lastMessage,
      unreadCount: conv.unreadCount,
    };
  });

  // Sort by last message time (most recent first)
  conversations.sort((a, b) => {
    const aTime = new Date(a.lastMessage.created_at as string).getTime();
    const bTime = new Date(b.lastMessage.created_at as string).getTime();
    return bTime - aTime;
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { receiverId, content } = await req.json();
    if (!receiverId || !content || !content.trim()) {
      return NextResponse.json({ error: "receiverId and content are required" }, { status: 400 });
    }

    const { data: message, error } = await getSupabaseAdmin()
      .from("internal_messages")
      .insert({
        sender_id: admin.sub,
        receiver_id: receiverId,
        content: content.trim(),
        is_read: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

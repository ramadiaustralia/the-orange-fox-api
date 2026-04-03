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

  const rawConversations = partnerIds.map((partnerId) => {
    const conv = conversationMap.get(partnerId)!;
    return {
      user: userMap.get(partnerId) || { id: partnerId },
      last_message: (conv.lastMessage as Record<string, unknown>).content as string || "",
      unread_count: conv.unreadCount,
      _created_at: (conv.lastMessage as Record<string, unknown>).created_at as string,
    };
  });

  // Sort by last message time (most recent first)
  rawConversations.sort((a, b) => {
    const aTime = new Date(a._created_at).getTime();
    const bTime = new Date(b._created_at).getTime();
    return bTime - aTime;
  });

  // Remove internal sort key before returning
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const conversations = rawConversations.map(({ _created_at, ...rest }) => rest);

  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { receiverId, content, attachmentUrl, attachmentName, attachmentType, attachmentSize } = await req.json();
    if (!receiverId || (!content?.trim() && !attachmentUrl)) {
      return NextResponse.json({ error: "receiverId and content or attachment are required" }, { status: 400 });
    }

    const { data: message, error } = await getSupabaseAdmin()
      .from("internal_messages")
      .insert({
        sender_id: admin.sub,
        receiver_id: receiverId,
        content: content?.trim() || "",
        is_read: false,
        ...(attachmentUrl && {
          attachment_url: attachmentUrl,
          attachment_name: attachmentName || "file",
          attachment_type: attachmentType || "",
          attachment_size: attachmentSize || 0,
        }),
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

export async function DELETE(req: NextRequest) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Message ID required" }, { status: 400 });

  // Verify the message belongs to the user (only sender can delete)
  const { data: msg } = await getSupabaseAdmin()
    .from("internal_messages")
    .select("sender_id")
    .eq("id", id)
    .single();

  if (!msg || msg.sender_id !== admin.sub) {
    return NextResponse.json({ error: "Cannot delete this message" }, { status: 403 });
  }

  const { error } = await getSupabaseAdmin()
    .from("internal_messages")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, action } = await req.json();
  if (!id) return NextResponse.json({ error: "Message ID required" }, { status: 400 });

  if (action === "unsend") {
    // Verify the message belongs to the user (only sender can unsend)
    const { data: msg } = await getSupabaseAdmin()
      .from("internal_messages")
      .select("sender_id")
      .eq("id", id)
      .single();

    if (!msg || msg.sender_id !== admin.sub) {
      return NextResponse.json({ error: "Cannot unsend this message" }, { status: 403 });
    }

    const { error } = await getSupabaseAdmin()
      .from("internal_messages")
      .update({
        content: "__UNSENT__",
        is_unsent: true,
        attachment_url: null,
        attachment_name: null,
        attachment_type: null,
        attachment_size: null,
      })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

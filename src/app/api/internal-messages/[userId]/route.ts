import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  const myId = admin.sub;
  const db = getSupabaseAdmin();

  // Get all messages between current user and specified user
  const { data: messages, error } = await db
    .from("internal_messages")
    .select("*")
    .or(
      `and(sender_id.eq.${myId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${myId})`
    )
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark all received messages from this user as read
  await db
    .from("internal_messages")
    .update({ is_read: true })
    .eq("sender_id", userId)
    .eq("receiver_id", myId)
    .eq("is_read", false);

  return NextResponse.json({ messages: messages || [] });
}

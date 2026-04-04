import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";


// POST: Set typing status
export async function POST(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { receiverId } = await req.json();
  if (!receiverId) return NextResponse.json({ error: "receiverId required" }, { status: 400 });

  const db = getSupabaseAdmin();
  await db.from("typing_status").upsert(
    {
      sender_id: admin.sub,
      receiver_id: receiverId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "sender_id,receiver_id" }
  );

  return NextResponse.json({ ok: true });
}

// GET: Check if partner is typing to me
export async function GET(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const partnerId = req.nextUrl.searchParams.get("partnerId");
  if (!partnerId) return NextResponse.json({ error: "partnerId required" }, { status: 400 });

  const db = getSupabaseAdmin();
  const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();

  const { data } = await db
    .from("typing_status")
    .select("updated_at")
    .eq("sender_id", partnerId)
    .eq("receiver_id", admin.sub)
    .gte("updated_at", fiveSecondsAgo)
    .maybeSingle();

  return NextResponse.json({ typing: !!data });
}

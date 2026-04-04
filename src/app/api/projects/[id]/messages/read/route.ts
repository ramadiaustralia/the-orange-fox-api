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

// POST: Mark messages as read
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

    const { message_ids } = await req.json();

    if (!Array.isArray(message_ids) || message_ids.length === 0) {
      return NextResponse.json(
        { error: "message_ids must be a non-empty array" },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();

    // Upsert read receipts — on conflict just ignore (do nothing)
    const receipts = message_ids.map((messageId: string) => ({
      message_id: messageId,
      user_id: admin.sub,
      read_at: new Date().toISOString(),
    }));

    const { error } = await db
      .from("message_read_receipts")
      .upsert(receipts, { onConflict: "message_id,user_id", ignoreDuplicates: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: Get read receipts for specified messages
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
    const messageIdsParam = searchParams.get("message_ids");

    if (!messageIdsParam) {
      return NextResponse.json(
        { error: "message_ids query param is required" },
        { status: 400 }
      );
    }

    const messageIds = messageIdsParam.split(",").map((id) => id.trim()).filter(Boolean);

    if (messageIds.length === 0) {
      return NextResponse.json({ receipts: {} });
    }

    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from("message_read_receipts")
      .select("message_id, user_id, read_at, user:admin_users!user_id(id, display_name, profile_pic_url)")
      .in("message_id", messageIds);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Group by message_id
    const receipts: Record<
      string,
      { user_id: string; display_name: string; profile_pic_url: string | null; read_at: string }[]
    > = {};

    // Initialize all requested message IDs
    for (const mid of messageIds) {
      receipts[mid] = [];
    }

    for (const row of data || []) {
      const user = row.user as unknown as { id: string; display_name: string; profile_pic_url: string | null };
      if (!receipts[row.message_id]) receipts[row.message_id] = [];
      receipts[row.message_id].push({
        user_id: user.id,
        display_name: user.display_name,
        profile_pic_url: user.profile_pic_url,
        read_at: row.read_at,
      });
    }

    return NextResponse.json({ receipts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

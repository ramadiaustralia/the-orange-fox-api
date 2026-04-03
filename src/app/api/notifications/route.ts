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

  const { data: notifications, error } = await getSupabaseAdmin()
    .from("notifications")
    .select(`
      *,
      actor:admin_users!actor_id(id, display_name, profile_pic_url)
    `)
    .eq("user_id", admin.sub)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notifications: notifications || [] });
}

export async function PATCH(req: NextRequest) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { ids } = await req.json();
    const db = getSupabaseAdmin();

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Mark specific notifications as read
      const { error } = await db
        .from("notifications")
        .update({ is_read: true })
        .in("id", ids)
        .eq("user_id", admin.sub);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      // Mark all notifications as read
      const { error } = await db
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", admin.sub)
        .eq("is_read", false);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

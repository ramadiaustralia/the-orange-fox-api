import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get("fox_admin_token")?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const supabase = getSupabaseAdmin();

    // Check if user can edit their profile
    const { data: user } = await supabase
      .from("admin_users")
      .select("role, permissions")
      .eq("id", payload.sub)
      .single();

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isOwner = user.role === "owner";
    const canEdit = isOwner || user.permissions?.profile_editable === true;

    if (!canEdit) {
      return NextResponse.json({ error: "You don't have permission to edit your profile" }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, string> = {};
    if (body.display_name) updates.display_name = body.display_name;
    if (body.position !== undefined) updates.position = body.position;
    if (body.profile_pic_url !== undefined) updates.profile_pic_url = body.profile_pic_url;

    const { data, error } = await supabase
      .from("admin_users")
      .update(updates)
      .eq("id", payload.sub)
      .select("id, email, display_name, position, role, permissions, profile_pic_url")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, user: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

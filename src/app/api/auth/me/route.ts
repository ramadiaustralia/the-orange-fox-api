import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const admin = await verifyToken(token);
  if (!admin) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const { data } = await getSupabaseAdmin()
    .from("admin_users")
    .select("id, email, display_name, position, role, permissions, profile_pic_url, is_frozen")
    .eq("id", admin.sub)
    .single();

  if (!data) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  if (data.is_frozen) {
    const response = NextResponse.json({ authenticated: false, frozen: true }, { status: 403 });
    response.cookies.set("fox_admin_token", "", { maxAge: 0, path: "/" });
    return response;
  }

  // Update last_active_at for online status
  getSupabaseAdmin()
    .from("admin_users")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", admin.sub)
    .then(() => {});

  return NextResponse.json({
    authenticated: true,
    admin: {
      id: data.id,
      email: data.email,
      display_name: data.display_name,
      position: data.position || "",
      role: data.role || "worker",
      permissions: data.permissions || {},
      profile_pic_url: data.profile_pic_url,
    },
  });
}

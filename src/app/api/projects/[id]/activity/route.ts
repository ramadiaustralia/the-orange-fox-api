import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";


// Get user's role in a project: 'commissioner' | 'leader' | 'member' | null
async function getProjectRole(projectId: string, userId: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();
  return data?.role || null;
}

// GET: List activity logs for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // Verify project access (member or owner)
    const myRole = await getProjectRole(id, admin.sub);
    if (!myRole && admin.badge !== "owner") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Parse limit from query params
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    let limit = 50;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 200);
      }
    }

    const { data, error } = await getSupabaseAdmin()
      .from("activity_logs")
      .select("*, user:admin_users!user_id(id, display_name, position, profile_pic_url)")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ activities: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Delete an activity log (Commissioner or Owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const activityId = searchParams.get("activityId");

  if (!activityId) {
    return NextResponse.json({ error: "activityId query param is required" }, { status: 400 });
  }

  try {
    // Only commissioner or owner can delete activity logs
    const myRole = await getProjectRole(id, admin.sub);
    if (myRole !== "commissioner" && admin.badge !== "owner") {
      return NextResponse.json({ error: "Only the commissioner can delete activity logs" }, { status: 403 });
    }

    const { error } = await getSupabaseAdmin()
      .from("activity_logs")
      .delete()
      .eq("id", activityId)
      .eq("project_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

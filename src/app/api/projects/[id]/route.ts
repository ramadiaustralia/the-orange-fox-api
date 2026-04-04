import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activity";


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

// Check if user has access to project (is a member of any role, or is global owner)
async function hasProjectAccess(projectId: string, userId: string, badge: string): Promise<boolean> {
  if (badge === "owner") return true;
  const role = await getProjectRole(projectId, userId);
  return role !== null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getSupabaseAdmin();

  try {
    const access = await hasProjectAccess(id, admin.sub, admin.badge || "staff");
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch project
    const { data: project, error: projectError } = await db
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch members with user details
    const { data: members, error: membersError } = await db
      .from("project_members")
      .select("*, user:admin_users(id, display_name, position, profile_pic_url)")
      .eq("project_id", id);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Fetch last 50 messages with sender details
    const { data: messages, error: messagesError } = await db
      .from("project_messages")
      .select("*, sender:admin_users!sender_id(id, display_name, position, profile_pic_url)")
      .eq("project_id", id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    // Get current user's role in this project
    const myRole = await getProjectRole(id, admin.sub);

    return NextResponse.json({
      project,
      members: members || [],
      messages: messages || [],
      myRole: myRole || (admin.badge === "owner" ? "commissioner" : "member"),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Only commissioner (owner) can update projects
  const role = await getProjectRole(id, admin.sub);
  if (role !== "commissioner" && admin.badge !== "owner") {
    return NextResponse.json({ error: "Only the commissioner can update projects" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    const changedFields: string[] = [];

    if (body.name !== undefined) {
      updates.name = body.name.trim();
      changedFields.push("name");
    }
    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null;
      changedFields.push("description");
    }
    if (body.status !== undefined) {
      const validStatuses = ["in_progress", "completed", "on_hold"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = body.status;
      changedFields.push("status");
    }
    if (body.target_date !== undefined) {
      if (body.target_date === null || body.target_date === "") {
        updates.target_date = null;
      } else {
        if (isNaN(Date.parse(body.target_date))) {
          return NextResponse.json({ error: "Invalid target_date format" }, { status: 400 });
        }
        updates.target_date = body.target_date;
      }
      changedFields.push("target_date");
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("projects")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log activity
    await logActivity({
      projectId: id,
      userId: admin.sub,
      action: "project_updated",
      details: { fields: changedFields, changes: updates },
    });

    return NextResponse.json({ project: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only owner can delete projects (commissioner = owner)
  if (admin.badge !== "owner") {
    return NextResponse.json({ error: "Only the owner can delete projects" }, { status: 403 });
  }

  const { id } = await params;
  const db = getSupabaseAdmin();

  try {
    await db.from("project_messages").delete().eq("project_id", id);
    await db.from("project_members").delete().eq("project_id", id);
    const { error } = await db.from("projects").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

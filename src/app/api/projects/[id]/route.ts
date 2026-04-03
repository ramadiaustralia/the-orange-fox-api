import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

async function authenticate(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

async function isProjectMemberOrOwner(projectId: string, userId: string, role: string): Promise<boolean> {
  if (role === "owner") return true;
  const { data } = await getSupabaseAdmin()
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

async function isProjectAdminOrOwner(projectId: string, userId: string, role: string): Promise<boolean> {
  if (role === "owner") return true;
  const { data } = await getSupabaseAdmin()
    .from("project_members")
    .select("id, role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();
  return data?.role === "admin";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getSupabaseAdmin();

  try {
    // Check access
    const hasAccess = await isProjectMemberOrOwner(id, admin.sub, admin.role);
    if (!hasAccess) {
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

    return NextResponse.json({
      project,
      members: members || [],
      messages: messages || [],
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
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // Check if user is owner or project admin
    const hasAccess = await isProjectAdminOrOwner(id, admin.sub, admin.role);
    if (!hasAccess) {
      return NextResponse.json({ error: "Only owner or project admin can update" }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, string> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.status !== undefined) {
      const validStatuses = ["in_progress", "completed", "on_hold"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = body.status;
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
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (admin.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can delete projects" }, { status: 403 });
  }

  const { id } = await params;
  const db = getSupabaseAdmin();

  try {
    // Delete messages first (foreign key constraint)
    await db.from("project_messages").delete().eq("project_id", id);
    // Delete members
    await db.from("project_members").delete().eq("project_id", id);
    // Delete project
    const { error } = await db.from("projects").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
